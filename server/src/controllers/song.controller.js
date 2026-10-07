import Library from '../models/library.model.js';
import Song from '../models/song.model.js';

export const saveSong = async (request, response, next) => {
  try {
    const { libraryId } = request.params;
    const { youtubeUrl } = request.body;
    const library = await Library.findOne({ _id: libraryId, user: request.user.id });
    if (!library) {
      const error = new Error('Library not found.');
      error.statusCode = 404;
      throw error;
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      const error = new Error('A supported YouTube URL is required.');
      error.statusCode = 400;
      throw error;
    }

    const song = await Song.findOneAndUpdate(
      { user: request.user.id, library: library._id, youtubeVideoId },
      {
        ...request.body,
        title: request.body.title || `YouTube video ${youtubeVideoId}`,
        youtubeUrl,
        youtubeVideoId,
        user: request.user.id,
        library: library._id,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    response.status(200).json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};

function extractYouTubeVideoId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null;
    }
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      return null;
    }
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'shorts' || pathParts[0] === 'embed') return pathParts[1] || null;
    return null;
  } catch {
    return null;
  }
}
