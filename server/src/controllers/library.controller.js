import Library from '../models/library.model.js';
import Song from '../models/song.model.js';
import mongoose from 'mongoose';
import { deleteMp3 } from '../services/cloudinary.service.js';

export const createLibrary = async (request, response, next) => {
  try {
    const library = await Library.create({ ...request.body, user: request.user.id });
    response.status(201).json({ success: true, data: library });
  } catch (error) {
    next(error);
  }
};

export const listLibraries = async (request, response, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(request.user.id);
    const libraries = await Library.aggregate([
      { $match: { user: userId } },
      { $lookup: { from: 'songs', localField: '_id', foreignField: 'library', as: 'songs' } },
      { $addFields: { songCount: { $size: '$songs' } } },
      { $project: { songs: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    response.json({ success: true, data: libraries });
  } catch (error) {
    next(error);
  }
};

export const listLibrarySongs = async (request, response, next) => {
  try {
    const library = await Library.findOne({ _id: request.params.libraryId, user: request.user.id });
    if (!library) {
      const error = new Error('Library not found.');
      error.statusCode = 404;
      throw error;
    }

    const songs = await Song.find({ library: library._id, user: request.user.id })
      .sort({ updatedAt: -1 })
      .lean();
    response.json({ success: true, data: songs });
  } catch (error) {
    next(error);
  }
};

export const listExtensionLibraries = async (request, response, next) => {
  try {
    const libraries = await Library.find({ user: request.user.id })
      .select('_id name description createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    response.json({ success: true, data: libraries });
  } catch (error) {
    next(error);
  }
};

export const createExtensionLibrary = async (request, response, next) => {
  try {
    const library = await Library.create({
      name: request.body.name,
      description: request.body.description,
      user: request.user.id,
    });
    response.status(201).json({ success: true, data: library });
  } catch (error) {
    next(error);
  }
};

export const deleteLibrarySong = async (request, response, next) => {
  try {
    const library = await Library.findOne({ _id: request.params.libraryId, user: request.user.id });
    if (!library) {
      const error = new Error('Library not found.');
      error.statusCode = 404;
      throw error;
    }
    const song = await Song.findOneAndDelete({
      _id: request.params.songId,
      library: library._id,
      user: request.user.id,
    });
    if (!song) {
      const error = new Error('Song not found.');
      error.statusCode = 404;
      throw error;
    }
    try {
      await deleteMp3(song.audio?.publicId);
    } catch (error) {
      console.error('Song deleted, but its Cloudinary asset could not be deleted.', error);
    }
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const deleteLibrary = async (request, response, next) => {
  try {
    const library = await Library.findOneAndDelete({
      _id: request.params.libraryId,
      user: request.user.id,
    });
    if (!library) {
      const error = new Error('Library not found.');
      error.statusCode = 404;
      throw error;
    }
    const songs = await Song.find({ library: library._id, user: request.user.id }).select('audio.publicId').lean();
    await Song.deleteMany({ library: library._id, user: request.user.id });
    await Promise.all(songs.map(async (song) => {
      try {
        await deleteMp3(song.audio?.publicId);
      } catch (error) {
        console.error('Library deleted, but a Cloudinary asset could not be deleted.', error);
      }
    }));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const recordSongPlay = async (request, response, next) => {
  try {
    const song = await Song.findOneAndUpdate(
      {
        _id: request.params.songId,
        library: request.params.libraryId,
        user: request.user.id,
      },
      { $inc: { playCount: 1 } },
      { new: true },
    ).lean();
    if (!song) {
      const error = new Error('Song not found.');
      error.statusCode = 404;
      throw error;
    }
    response.json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
};
