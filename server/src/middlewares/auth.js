import { verifyAccessToken } from '../utils/jwt.js';

const requireAuth = (request, response, next) => {
  const authorization = request.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const token = bearerToken || request.cookies.accessToken;

  if (!token) {
    const error = new Error('Authentication required.');
    error.statusCode = 401;
    next(error);
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub };
    next();
  } catch (error) {
    error.statusCode = 401;
    error.message = 'Access token is invalid or expired.';
    next(error);
  }
};

export default requireAuth;
