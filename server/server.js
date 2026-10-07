import 'dotenv/config';
import app from './src/app.js';
import connectDatabase from './src/db/connect.js';
import env from './src/config/env.js';

export default app;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}
