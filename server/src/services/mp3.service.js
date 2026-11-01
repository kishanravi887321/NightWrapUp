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
  console.info('[mp3] Starting media preparation', { videoId });

  const downloadUrl = new URL(cutterKoEndpoint);
  downloadUrl.searchParams.set('url', youtubeUrl.trim());
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'nightwrapup-'));

  try {
    const { filename, size } = await downloadFile(
      downloadUrl.href,
      temporaryDirectory,
      videoId,
    );
    const targetPath = join(temporaryDirectory, filename);
    const temporaryPath = `${targetPath}.part`;
    await rename(temporaryPath, targetPath);
    console.info('[mp3] MP3 downloaded locally', { videoId, filename });

    const cloudinaryAsset = await uploadMp3(
      targetPath,
      `nightwrapup/mp3/${filename.replace(/\.mp3$/i, '')}`,
    );
    console.info('[mp3] MP3 uploaded to Cloudinary', {
      videoId,
      publicId: cloudinaryAsset.public_id,
      secureUrl: cloudinaryAsset.secure_url,
    });

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
    await rm(temporaryDirectory, { recursive: true, force: true }).catch((error) => {
      console.warn('[mp3] Temporary MP3 cleanup failed', {
        videoId,
        message: error.message,
      });
    });
  }
};

async function downloadFile(url, temporaryDirectory, videoId) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) {
    let message = 'Unable to download the generated MP3 file.';
    try {
      const errorBody = await response.json();
      if (typeof errorBody.error === 'string' && errorBody.error.trim()) {
        message = errorBody.error.trim();
      }
    } catch {
      // The service may return a non-JSON error body.
    }
    throw serviceError(message, response.status >= 400 && response.status < 500 ? 422 : 502);
  }

  const filename = getResponseFilename(response.headers.get('content-disposition'), videoId);
  const temporaryPath = join(temporaryDirectory, `${filename}.part`);
  await pipeline(response.body, createWriteStream(temporaryPath));
  return {
    filename,
    size: Number(response.headers.get('content-length')) || undefined,
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
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) return null;
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
