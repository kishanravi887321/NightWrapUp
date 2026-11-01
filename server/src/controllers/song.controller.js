import mongoose from 'mongoose';
import Library from '../models/library.model.js';
import Song from '../models/song.model.js';
import { downloadMp3 } from '../services/my.mp3download.reder.js';
import { deleteMp3, extractCloudinaryPublicId } from '../services/cloudinary.service.js';

export const saveSong = async (request, response, next) => {
  try {
    const song = await queueSongSave({
      libraryId: request.params.libraryId,
      userId: request.user.id,
      youtubeUrl: request.body?.youtubeUrl,
      songInput: request.body,
      source: 'extension-save',
    });
    response.status(200).json({
      success: true,
      message: song.audio?.status === 'ready'
        ? 'Song is ready.'
        : 'Song accepted and will be available when MP3 processing finishes.',
      data: song,
    });
  } catch (error) {
    next(error);
  }
};

export const queueSongSave = async ({
  libraryId,
  userId,
  youtubeUrl,
  songInput = {},
  source = 'song-save',
}) => {
  if (typeof libraryId !== 'string' || !libraryId.trim()) {
    const error = new Error('Library ID is required.');
    error.statusCode = 400;
    throw error;
  }
  if (typeof youtubeUrl !== 'string' || !youtubeUrl.trim()) {
    const error = new Error('A YouTube URL is required.');
    error.statusCode = 400;
    throw error;
  }

  const library = await Library.findOne({ _id: libraryId, user: userId });
  if (!library) {
    const error = new Error('Library not found.');
    error.statusCode = 404;
    throw error;
  }
  console.info(`[${source}] Library verified`, { libraryId, userId });

  const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
  if (!youtubeVideoId) {
    const error = new Error('A supported YouTube URL is required.');
    error.statusCode = 400;
    throw error;
  }
  console.info(`[${source}] YouTube URL validated`, { youtubeVideoId });

  const existingSong = await Song.findOne({ user: userId, library: library._id, youtubeVideoId });
  if (existingSong?.audio?.status === 'ready' && existingSong.audio.url) {
    console.info(`[${source}] Existing ready song reused`, {
      songId: existingSong._id.toString(),
      libraryId,
      youtubeVideoId,
    });
    return existingSong;
  }
  if (existingSong?.audio?.status === 'pending') {
    console.info(`[${source}] Existing pending song reused`, {
      songId: existingSong._id.toString(),
      libraryId,
      youtubeVideoId,
    });
    return existingSong;
  }

  const song = await Song.findOneAndUpdate(
    { user: userId, library: library._id, youtubeVideoId },
    {
      title: songInput.title || existingSong?.title || `YouTube video ${youtubeVideoId}`,
      youtubeUrl,
      youtubeVideoId,
      thumbnail: songInput.thumbnail || existingSong?.thumbnail,
      channelName: songInput.channelName || existingSong?.channelName,
      audio: { status: 'pending', provider: 'cloudinary' },
      user: userId,
      library: library._id,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.info(`[${source}] Song queued`, {
    songId: song._id.toString(),
    libraryId,
    youtubeVideoId,
    audioStatus: song.audio?.status,
  });

  setImmediate(() => {
    void processSongAudio({
      songId: song._id,
      libraryId,
      userId,
      youtubeUrl,
      source,
    });
  });

  return song;
};

async function processSongAudio({ songId, libraryId, userId, youtubeUrl, source }) {
  try {
    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
    const metadata = await fetchYouTubeMetadata(youtubeUrl, youtubeVideoId);
    const generatedAudio = await downloadMp3(youtubeUrl);
    const song = await Song.findOneAndUpdate(
      { _id: songId, library: libraryId, user: userId },
      {
        title: metadata.title || generatedAudio.title || `YouTube video ${youtubeVideoId}`,
        thumbnail: metadata.thumbnail,
        channelName: metadata.channelName,
        audio: {
          url: generatedAudio.url,
          publicId: generatedAudio.cloudinaryPublicId,
          status: 'ready',
          quality: generatedAudio.quality,
          size: generatedAudio.size,
          duration: generatedAudio.duration,
          provider: 'cloudinary',
        },
      },
      { new: true, runValidators: true },
    );
    console.info(`[${source}] Background song processing completed`, {
      songId: song?._id?.toString(),
      libraryId,
      youtubeVideoId,
      audioStatus: song?.audio?.status,
      cloudinaryPublicId: generatedAudio.cloudinaryPublicId,
    });
  } catch (error) {
    await Song.findOneAndUpdate(
      { _id: songId, library: libraryId, user: userId },
      { audio: { status: 'failed', provider: 'cloudinary' } },
    ).catch((updateError) => {
      console.error(`[${source}] Failed to mark background song processing failed`, {
        songId: songId.toString(),
        message: updateError.message,
      });
    });
    console.error(`[${source}] Background song processing failed`, {
      songId: songId.toString(),
      libraryId,
      message: error.message,
      statusCode: error.statusCode || 500,
    });
  }
}

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

export const deleteSong = async (request, response, next) => {
  try {
    const songId = request.params.songId || request.body?.songId || request.query?.songId;
    const libraryId = request.params.libraryId || request.body?.libraryId || request.query?.libraryId;

    if (!songId) {
      const error = new Error('Song ID is required.');
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(songId)) {
      const error = new Error('Invalid song ID format.');
      error.statusCode = 400;
      throw error;
    }

    const query = {
      _id: songId,
      user: request.user.id,
    };

    if (libraryId) {
      if (!mongoose.Types.ObjectId.isValid(libraryId)) {
        const error = new Error('Invalid library ID format.');
        error.statusCode = 400;
        throw error;
      }
      query.library = libraryId;
    }

    const song = await Song.findOneAndDelete(query);
    if (!song) {
      const error = new Error('Song not found or unauthorized.');
      error.statusCode = 404;
      throw error;
    }

    const publicId = song.audio?.publicId || extractCloudinaryPublicId(song.audio?.url);
    let cloudinaryDeleted = false;

    if (publicId) {
      try {
        await deleteMp3(publicId);
        cloudinaryDeleted = true;
        console.info('[song-delete] Cloudinary asset deleted', {
          songId: song._id.toString(),
          publicId,
        });
      } catch (cloudinaryError) {
        console.error('[song-delete] Failed to delete Cloudinary asset', {
          songId: song._id.toString(),
          publicId,
          error: cloudinaryError.message,
        });
      }
    }

    response.status(200).json({
      success: true,
      message: 'Song deleted successfully.',
      data: {
        songId: song._id,
        libraryId: song.library,
        title: song.title,
        cloudinaryDeleted,
      },
    });
  } catch (error) {
    next(error);
  }
};
