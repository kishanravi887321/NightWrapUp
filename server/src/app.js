import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import libraryRoutes from './routes/library.routes.js';
import extensionRoutes from './routes/extension.routes.js';
import mediaRoutes from './routes/media.routes.js';
import errorHandler from './middlewares/error-handler.js';
import notFound from './middlewares/not-found.js';
import env from './config/env.js';
import connectDatabase from './db/connect.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const app = express();
const serverDirectory = dirname(fileURLToPath(import.meta.url));

app.use(async (_request, _response, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      const isExtensionOrigin =
        origin?.startsWith('chrome-extension://') ||
        origin?.startsWith('moz-extension://');

      if (!origin || env.corsOrigins.includes(origin) || isExtensionOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/mp3', express.static(join(serverDirectory, '../public/mp3')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/media', mediaRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
