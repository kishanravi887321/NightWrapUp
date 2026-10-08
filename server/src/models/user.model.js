import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    googleId: {
      type: String,
      required: [true, 'Google account ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    mobileRefreshTokenHash: {
      type: String,
      select: false,
    },
    mobileSecretKeyHash: {
      type: String,
      select: false,
    },
    mobileSecretKeyCreatedAt: {
      type: Date,
    },
    mobileSecretKeyLastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    mobileSecretKeyCreatedAt: this.mobileSecretKeyCreatedAt,
    mobileSecretKeyLastUsedAt: this.mobileSecretKeyLastUsedAt,
    mobileAccessEnabled: Boolean(this.mobileSecretKeyCreatedAt),
  };
};

const User = mongoose.model('User', userSchema);

export default User;
