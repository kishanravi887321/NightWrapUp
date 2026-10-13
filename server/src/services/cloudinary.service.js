import { v2 as cloudinary } from 'cloudinary';
import { createReadStream } from 'node:fs';
import env from '../config/env.js';

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

export const uploadMp3 = (filePath, publicId) => {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    const error = new Error('Cloudinary credentials are not configured.');
    error.statusCode = 500;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        public_id: publicId,
        overwrite: true,
        format: 'mp3',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        console.info('[cloudinary] MP3 upload successful', {
          publicId: result.public_id,
          secureUrl: result.secure_url,
          bytes: result.bytes,
          duration: result.duration,
        });
        resolve(result);
      },
    );

    createReadStream(filePath).on('error', reject).pipe(upload);
  });
};

export const extractCloudinaryPublicId = (url) => {
  if (typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parsed = new URL(url);
    const uploadIndex = parsed.pathname.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    let pathAfterUpload = parsed.pathname.slice(uploadIndex + '/upload/'.length);
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    pathAfterUpload = pathAfterUpload.replace(/\.[^/.]+$/, '');
    return decodeURIComponent(pathAfterUpload);
  } catch {
    return null;
  }
};

export const deleteMp3 = async (publicId) => {
  if (!publicId) return null;
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    console.warn('Skipping Cloudinary deletion because credentials are not configured.');
    return null;
  }
  const cleanPublicId = publicId.replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
  const result = await cloudinary.uploader.destroy(cleanPublicId, { resource_type: 'video', invalidate: true });
  console.info('[cloudinary] MP3 deletion response', { publicId: cleanPublicId, result });
  return result;
};
