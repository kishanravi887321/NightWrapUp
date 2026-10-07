import crypto from 'node:crypto';
import { promisify } from 'node:util';
import mongoose from 'mongoose';

const scrypt = promisify(crypto.scrypt);

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
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    extensionTokenHash: {
      type: String,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(this.password, salt, 64);
  this.password = `${salt}:${derivedKey.toString('hex')}`;
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  const [salt, storedKey] = this.password.split(':');
  const derivedKey = await scrypt(candidate, salt, 64);
  return crypto.timingSafeEqual(
    Buffer.from(storedKey, 'hex'),
    derivedKey,
  );
};

const User = mongoose.model('User', userSchema);

export default User;
