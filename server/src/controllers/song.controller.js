import Library from '../models/library.model.js';
import Song from '../models/song.model.js';
import { downloadMp3 } from '../services/mp3.service.js';

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
    console.info('[extension-save] Library verified', { libraryId, userId: request.user.id });

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    if (!youtubeVideoId) {
      const error = new Error('A supported YouTube URL is required.');
      error.statusCode = 400;
      throw error;
    }
    console.info('[extension-save] YouTube URL validated', { youtubeVideoId });

    const metadata = await fetchYouTubeMetadata(youtubeUrl, youtubeVideoId);
    console.info('[extension-save] Metadata ready', {
      youtubeVideoId,
      title: metadata.title,
      channelName: metadata.channelName,
    });
    const existingSong = await Song.findOne({
      user: request.user.id,
      library: library._id,
      youtubeVideoId,
    });
    let audio = existingSong?.audio?.url ? existingSong.audio : undefined;

    if (!audio) {
      try {
        const generatedAudio = await downloadMp3(youtubeUrl);
        audio = {
          url: generatedAudio.url,
          publicId: generatedAudio.cloudinaryPublicId,
          status: 'ready',
          quality: generatedAudio.quality,
          size: generatedAudio.size,
          duration: generatedAudio.duration,
          provider: 'cloudinary',
        };
        console.info('[extension-save] MP3 generated and uploaded', {
          youtubeVideoId,
          cloudinaryPublicId: audio.publicId,
          size: audio.size,
        });
      } catch (error) {
        console.error('Unable to generate and upload MP3 for extension save.', error);
        const mediaError = new Error('The song was not saved because its MP3 could not be prepared.');
        mediaError.statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 502;
        throw mediaError;
      }
    } else {
      console.info('[extension-save] Existing Cloudinary MP3 reused', {
        youtubeVideoId,
        cloudinaryPublicId: audio.publicId,
      });
    }

    const song = await Song.findOneAndUpdate(
      { user: request.user.id, library: library._id, youtubeVideoId },
      {
        ...request.body,
        title: request.body.title || metadata.title || `YouTube video ${youtubeVideoId}`,
        youtubeUrl,
        youtubeVideoId,
        thumbnail: request.body.thumbnail || metadata.thumbnail,
        channelName: request.body.channelName || metadata.channelName,
        audio,
        user: request.user.id,
        library: library._id,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    console.info('[extension-save] Song saved', {
      songId: song._id.toString(),
      libraryId,
      youtubeVideoId,
      audioStatus: song.audio?.status,
    });
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
