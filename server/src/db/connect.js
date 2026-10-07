import mongoose from 'mongoose';
import env from '../config/env.js';

let connectionPromise;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.databaseUrl)
      .then(() => {
        console.log('Database connected');
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  await connectionPromise;
};

export default connectDatabase;
