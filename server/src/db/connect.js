import mongoose from 'mongoose';
import env from '../config/env.js';

const connectDatabase = async () => {
  await mongoose.connect(env.databaseUrl);
  console.log('Database connected');
};

export default connectDatabase;
