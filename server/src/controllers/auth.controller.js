import User from '../models/user.model.js';
import { OAuth2Client } from 'google-auth-library';
import env from '../config/env.js';
import {
  createAccessToken,
  createExtensionToken,
  createRefreshToken,
  hashJwt,
  verifyRefreshToken,
} from '../utils/jwt.js';

const googleClient = new OAuth2Client(env.googleClientId);

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const cookieDomain = isProduction ? '.ziax.online' : undefined;

const cookieOptions = (maxAge, path) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: cookieDomain,
  maxAge,
  path,
});

const issueTokens = async (user) => {
  const accessToken = createAccessToken(user._id.toString());
  const refreshToken = createRefreshToken(user._id.toString());

  user.refreshTokenHash = hashJwt(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const sendAuthResponse = (response, user, tokens) => {
  response.cookie('accessToken', tokens.accessToken, cookieOptions(15 * 60 * 1000, '/'));
  response.cookie('refreshToken', tokens.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000, '/api/auth'));
  response.status(200).json({
  success: true,
    data: { user: user.toSafeJSON(), extensionToken: createExtensionToken(user._id.toString()) },
  });
};

export const googleAuth = async (request, response, next) => {
  try {
    const { credential } = request.body;
    if (!credential) {
      const error = new Error('Google credential is required.');
      error.statusCode = 400;
      throw error;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      const error = new Error('Google account could not be verified.');
      error.statusCode = 401;
      throw error;
    }

    const normalizedEmail = payload.email.toLowerCase();
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
    });

    if (user && user.googleId && user.googleId !== payload.sub) {
      const error = new Error('This email is linked to another Google account.');
      error.statusCode = 409;
      throw error;
    }

    if (!user) {
      user = new User({
        email: normalizedEmail,
        googleId: payload.sub,
      });
    } else {
      user.googleId = payload.sub;
    }

    if (payload.name) user.name = payload.name;
    if (payload.picture) user.avatarUrl = payload.picture;
    await user.save();

    const tokens = await issueTokens(user);
    sendAuthResponse(response, user, tokens);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (request, response, next) => {
  try {
    const { refreshToken } = request.cookies;
    if (!refreshToken) {
      const error = new Error('Refresh token is required.');
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || user.refreshTokenHash !== hashJwt(refreshToken)) {
      const error = new Error('Refresh token is invalid or expired.');
      error.statusCode = 401;
      throw error;
    }

    const tokens = await issueTokens(user);
    sendAuthResponse(response, user, tokens);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error.statusCode = 401;
      error.message = 'Refresh token is invalid or expired.';
    }
    next(error);
  }
};

export const createExtensionCredential = (request, response) => {
  response.json({
    success: true,
    data: { extensionToken: createExtensionToken(request.user.id) },
  });
};

export const logout = async (request, response, next) => {
  try {
    await User.findByIdAndUpdate(request.user.id, { $unset: { refreshTokenHash: 1 } });
    response.clearCookie('accessToken', { domain: cookieDomain, path: '/' });
    response.clearCookie('refreshToken', { domain: cookieDomain, path: '/api/auth' });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};
