import 'dotenv/config';
import app from './src/app.js';
import connectDatabase from './src/db/connect.js';
import env from './src/config/env.js';

const startServer = async () => {
  try {
    await connectDatabase();

    const PORT =  3000;

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
