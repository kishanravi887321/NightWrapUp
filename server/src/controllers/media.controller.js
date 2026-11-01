import { queueSongSave } from './song.controller.js';

export const createMp3 = async (request, response, next) => {
  const youtubeUrl = request.body?.youtubeUrl || request.body?.url || request.query?.url;
  const libraryId = request.body?.libraryId || request.query?.libraryId;
  console.info('[media-mp3] Download and upload requested', {
    method: request.method,
    path: request.originalUrl,
    hasYoutubeUrl: Boolean(youtubeUrl),
    libraryId,
    userId: request.user?.id,
  });

  try {
    const song = await queueSongSave({
      libraryId,
      userId: request.user.id,
      youtubeUrl,
      songInput: request.body,
      source: 'mobile-save',
    });
    console.info('[media-mp3] Request accepted for background processing', {
      userId: request.user.id,
      libraryId,
      songId: song._id.toString(),
      audioStatus: song.audio?.status,
    });

    response.status(200).json({
      success: true,
      message: song.audio?.status === 'ready'
        ? 'Song is ready.'
        : 'Song accepted and will be available when MP3 processing finishes.',
      data: {
        song,
        status: song.audio?.status,
      },
    });
  } catch (error) {
    console.error('[media-mp3] Download and upload failed', {
      method: request.method,
      path: request.originalUrl,
      userId: request.user?.id,
      message: error.message,
      statusCode: error.statusCode || 500,
    });
    next(error);
  }
};
