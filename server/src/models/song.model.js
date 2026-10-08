import mongoose from 'mongoose';

const songSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Song owner is required'],
      index: true,
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: [true, 'Song library is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
    },
    youtubeUrl: {
      type: String,
      required: [true, 'YouTube URL is required'],
      trim: true,
    },
    youtubeVideoId: {
      type: String,
      required: [true, 'YouTube video ID is required'],
      trim: true,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    channelName: {
      type: String,
      trim: true,
    },
    playCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

songSchema.index({ user: 1, library: 1, youtubeVideoId: 1 }, { unique: true });

const Song = mongoose.model('Song', songSchema);

export default Song;
