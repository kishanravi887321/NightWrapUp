import Library from '../models/library.model.js';
import Song from '../models/song.model.js';
import mongoose from 'mongoose';

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
