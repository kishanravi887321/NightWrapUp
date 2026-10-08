import { downloadMp3 } from '../services/mp3.service.js';

export const createMp3 = async (request, response, next) => {
  try {
    const result = await downloadMp3(request.body.youtubeUrl || request.body.url);
    response.status(201).json({
      success: true,
      data: {
        ...result,
      },
    });
  } catch (error) {
    next(error);
  }
};
