import Library from '../models/library.model.js';

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
    const libraries = await Library.find({ user: request.user.id }).sort({ createdAt: -1 });
    response.json({ success: true, data: libraries });
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
