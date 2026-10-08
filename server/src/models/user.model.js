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
    // Stored directly so the website can display the existing mobile key.
    mobileSecretKey: {
      type: String,
      match: [/^\d{8}$/, 'Mobile key must contain exactly 8 digits'],
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
    mobileSecretKey: this.mobileSecretKey,
  };
};

const User = mongoose.model('User', userSchema);

export default User;
