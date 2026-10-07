import crypto from 'node:crypto';

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const createToken = () => crypto.randomBytes(32).toString('hex');
