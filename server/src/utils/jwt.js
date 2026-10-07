import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { hashToken } from './token.js';

export const createAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });

export const createRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });

export const createExtensionToken = (userId) =>
  jwt.sign({ sub: userId, type: 'extension' }, env.jwtExtensionSecret, {
    expiresIn: env.extensionTokenExpiresIn,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwtAccessSecret, { algorithms: ['HS256'] });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.jwtRefreshSecret, { algorithms: ['HS256'] });

export const verifyExtensionToken = (token) =>
  jwt.verify(token, env.jwtExtensionSecret, { algorithms: ['HS256'] });

export const hashJwt = hashToken;
