import cors from 'cors';
import express from 'express';
import healthRoutes from './routes/health.routes.js';
import errorHandler from './middlewares/error-handler.js';
import notFound from './middlewares/not-found.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
