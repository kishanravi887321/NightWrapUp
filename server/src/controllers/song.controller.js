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

    const metadata = await fetchYouTubeMetadata(youtubeUrl, youtubeVideoId);
    const song = await Song.findOneAndUpdate(
      { user: request.user.id, library: library._id, youtubeVideoId },
      {
        ...request.body,
        title: request.body.title || metadata.title || `YouTube video ${youtubeVideoId}`,
        youtubeUrl,
        youtubeVideoId,
        thumbnail: request.body.thumbnail || metadata.thumbnail,
        channelName: request.body.channelName || metadata.channelName,
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

async function fetchYouTubeMetadata(youtubeUrl, youtubeVideoId) {
  const fallback = {
    title: null,
    channelName: null,
    thumbnail: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
  };

  try {
    const metadataUrl = new URL('https://www.youtube.com/oembed');
    metadataUrl.searchParams.set('url', youtubeUrl);
    metadataUrl.searchParams.set('format', 'json');

    const response = await fetch(metadataUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return fallback;

    const data = await response.json();
    return {
      title: typeof data.title === 'string' ? data.title.trim() : fallback.title,
      channelName: typeof data.author_name === 'string' ? data.author_name.trim() : fallback.channelName,
      thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : fallback.thumbnail,
    };
  } catch (error) {
    console.warn('Unable to fetch YouTube metadata; using fallback metadata.', error.message);
    return fallback;
  }
}

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
