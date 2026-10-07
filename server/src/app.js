import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import libraryRoutes from './routes/library.routes.js';
import extensionRoutes from './routes/extension.routes.js';
import errorHandler from './middlewares/error-handler.js';
import notFound from './middlewares/not-found.js';
import env from './config/env.js';

const app = express();

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

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api/extension', extensionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
