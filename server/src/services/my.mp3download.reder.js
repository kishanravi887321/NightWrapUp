import { createWriteStream } from 'node:fs';
import { mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { uploadMp3 } from './cloudinary.service.js';

const cutterKoEndpoint = 'https://cutter-ko-a071.onrender.com/mp3';

export const downloadMp3 = async (youtubeUrl) => {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    const error = new Error('A supported YouTube URL or video ID is required.');
    error.statusCode = 400;
    throw error;
  }

  console.info('[mp3-cutter-ko] Starting media preparation', { videoId });
  const downloadUrl = new URL(cutterKoEndpoint);
  downloadUrl.searchParams.set('url', youtubeUrl.trim());
  console.info('[mp3-cutter-ko] Request URL', { url: downloadUrl.href });
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'nightwrapup-mp3-'));
  let cloudinaryUploadCompleted = false;

  try {
    const { filename, size, targetPath } = await downloadFile(
      downloadUrl.href,
      temporaryDirectory,
      videoId,
    );
    console.info('[mp3-cutter-ko] MP3 saved temporarily', {
      videoId,
      filename,
      targetPath,
      size,
    });

    const cloudinaryAsset = await uploadMp3(
      targetPath,
      `nightwrapup/mp3/${filename.replace(/\.mp3$/i, '')}`,
    );
    console.info('[mp3-cutter-ko] MP3 uploaded to Cloudinary', {
      videoId,
      filename,
      publicId: cloudinaryAsset.public_id,
      secureUrl: cloudinaryAsset.secure_url,
    });
    cloudinaryUploadCompleted = true;

    return {
      filename,
      title: filename.replace(/\.mp3$/i, ''),
      quality: 'mp3',
      size,
      duration: undefined,
      url: cloudinaryAsset.secure_url,
      cloudinaryPublicId: cloudinaryAsset.public_id,
    };
  } finally {
    try {
      await rm(temporaryDirectory, { recursive: true, force: true });
      console.info('[mp3-cutter-ko] Temporary MP3 removed', {
        videoId,
        cloudinaryUploadCompleted,
      });
    } catch (error) {
      console.warn('[mp3-cutter-ko] Temporary MP3 cleanup failed', {
        videoId,
        cloudinaryUploadCompleted,
        message: error.message,
      });
    }
  }
};

async function downloadFile(url, targetDirectory, videoId) {
  const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
  console.info('[mp3-cutter-ko] Response received', {
    status: response.status,
    contentType: response.headers.get('content-type'),
    contentDisposition: response.headers.get('content-disposition'),
  });
  if (!response.ok || !response.body) {
    let message = 'Unable to download the generated MP3 file.';
    try {
      const errorBody = await response.json();
      if (typeof errorBody.error === 'string' && errorBody.error.trim()) {
        message = errorBody.error.trim();
      }
    } catch {
      // CutterKo may return a non-JSON error body.
    }
    throw serviceError(message, response.status >= 400 && response.status < 500 ? 422 : 502);
  }

  const filename = getResponseFilename(response.headers.get('content-disposition'), videoId);
  const targetPath = join(targetDirectory, filename);
  const temporaryPath = `${targetPath}.part`;
  console.info('[mp3-cutter-ko] Saving MP3', { filename, targetPath });
  await pipeline(
    response.body,
    createWriteStream(temporaryPath),
  );
  await rename(temporaryPath, targetPath);
  return {
    filename,
    size: Number(response.headers.get('content-length')) || undefined,
    targetPath,
  };
}

function getResponseFilename(contentDisposition, videoId) {
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  let filename = encodedMatch?.[1] || plainMatch?.[1];

  if (filename) {
    try {
      filename = decodeURIComponent(filename);
    } catch {
      filename = null;
    }
  }

  return `${sanitizeFilename(filename?.replace(/\.mp3$/i, '') || videoId)}.mp3`;
}

function extractYouTubeVideoId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      return null;
    }
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    return ['shorts', 'embed'].includes(parts[0]) ? parts[1] || null : null;
  } catch {
    return null;
  }
}

function sanitizeFilename(value) {
  return basename(value)
    .replace(/[<>:"/\\|?*#%&\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'audio';
}

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
