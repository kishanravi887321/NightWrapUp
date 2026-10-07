import Library from '../models/library.model.js';
import Song from '../models/song.model.js';

export const saveSong = async (request, response, next) => {
  try {
    const { libraryId } = request.params;
    const library = await Library.findOne({ _id: libraryId, user: request.user.id });
    if (!library) {
      const error = new Error('Library not found.');
      error.statusCode = 404;
      throw error;
    }

    const song = await Song.findOneAndUpdate(
      { user: request.user.id, library: library._id, youtubeVideoId: request.body.youtubeVideoId },
      { ...request.body, user: request.user.id, library: library._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    response.status(200).json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};
