import mongoose from 'mongoose';

const librarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Library name is required'],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 240,
    },
  },
  { timestamps: true },
);

librarySchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model('Library', librarySchema);
