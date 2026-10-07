import mongoose from 'mongoose';

export const getHealth = (_request, response) => {
  response.json({
    success: true,
    data: {
      service: 'night-wrap-up-api',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  });
};
