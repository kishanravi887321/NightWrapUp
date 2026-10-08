import { createWriteStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { uploadMp3 } from './cloudinary.service.js';

const serviceDirectory = fileURLToPath(new URL('../../public/mp3/', import.meta.url));
const infoEndpoint = 'https://embedded.flashdl.one/api/info.php';
const progressEndpoint = 'https://api.ytnow.online/wp-json/rapid-api/v1/progress';
const allowedDownloadHosts = new Set(['ex.speedlycdn.online']);
const pollIntervalMs = 2000;
const maxPollAttempts = 45;

export const downloadMp3 = async (youtubeUrl) => {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    const error = new Error('A supported YouTube URL or video ID is required.');
    error.statusCode = 400;
    throw error;
  }
  console.info('[mp3] Starting media preparation', { videoId });

  const info = await requestInfo(videoId);
  const audio = info.audios?.[0];
  if (!audio?.id) {
    const error = new Error('No MP3 audio format is available for this video.');
    error.statusCode = 422;
    throw error;
  }
  console.info('[mp3] Audio format found', {
    videoId,
    audioId: audio.id,
    quality: audio.quality,
    size: audio.size,
  });

  const completed = await waitForAudio(audio.id);
  console.info('[mp3] Media processing complete', {
    videoId,
    audioId: audio.id,
    quality: completed.quality,
    size: completed.size,
  });
  const downloadUrl = validateDownloadUrl(completed.url);
  await mkdir(serviceDirectory, { recursive: true });

  const filename = `${sanitizeFilename(completed.title || info.title || videoId)}-${videoId}.mp3`;
  const targetPath = join(serviceDirectory, filename);
  const temporaryPath = `${targetPath}.part`;

  try {
    await downloadFile(downloadUrl, temporaryPath);
    await rename(temporaryPath, targetPath);
    console.info('[mp3] MP3 downloaded locally', { videoId, filename });
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }

  const cloudinaryAsset = await uploadMp3(
    targetPath,
    `nightwrapup/mp3/${filename.replace(/\.mp3$/i, '')}`,
  );
  console.info('[mp3] MP3 uploaded to Cloudinary', {
    videoId,
    publicId: cloudinaryAsset.public_id,
    secureUrl: cloudinaryAsset.secure_url,
  });
  await unlink(targetPath).catch((error) => {
    console.warn('Cloudinary upload succeeded, but local MP3 cleanup failed.', error.message);
  });

  return {
    filename,
    title: completed.title || info.title || videoId,
    quality: completed.quality || 'mp3',
    size: completed.size,
    duration: info.duration,
    url: cloudinaryAsset.secure_url,
    cloudinaryPublicId: cloudinaryAsset.public_id,
  };
};

async function requestInfo(videoId) {
  const body = new URLSearchParams({ url: videoId, refresh: '0' });
  const response = await fetch(infoEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const data = await readJson(response, 'Unable to read media information.');
  if (!data.ok) throw serviceError('The media service could not process this video.', 502);
  console.info('[mp3] Media information received', {
    videoId,
    title: data.title,
    audioCount: data.audios?.length || 0,
  });
  return data;
}

async function waitForAudio(audioId) {
  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const response = await fetch(progressEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: audioId }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await readJson(response, 'Unable to read MP3 processing status.');
    if (data.success && data.status === 'done' && data.url) return data;
    if (data.status === 'error' || data.success === false) {
      throw serviceError('The media service failed to create the MP3.', 502);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw serviceError('MP3 processing timed out.', 504);
}

function validateDownloadUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !allowedDownloadHosts.has(url.hostname)) {
      throw new Error();
    }
    return url.href;
  } catch {
    throw serviceError('The media service returned an invalid download URL.', 502);
  }
}

async function downloadFile(url, targetPath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok || !response.body) {
    throw serviceError('Unable to download the generated MP3 file.', 502);
  }
  await pipeline(response.body, createWriteStream(targetPath));
}

async function readJson(response, message) {
  if (!response.ok) throw serviceError(message, 502);
  try {
    return await response.json();
  } catch {
    throw serviceError(message, 502);
  }
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
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'audio';
}

function serviceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
