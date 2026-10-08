const databaseUrl = process.env.MONGO_DB_URL || process.env.MONOG_DB_URL;

if (!databaseUrl) {
  throw new Error('MONGO_DB_URL is required in the environment.');
}

const port = Number(process.env.PORT) || 5000;
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const jwtExtensionSecret = process.env.JWT_EXTENSION_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

if (!jwtAccessSecret || !jwtRefreshSecret || !jwtExtensionSecret || !googleClientId) {
  throw new Error('JWT secrets and GOOGLE_CLIENT_ID are required in the environment.');
}

export default {
  databaseUrl,
  port,
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtExtensionSecret,
  googleClientId,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15d',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  extensionTokenExpiresIn: process.env.JWT_EXTENSION_EXPIRES_IN || '365d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS ||
    'http://localhost:5173,https://nightwrapup.ziax.online')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
