import { verifyExtensionToken } from '../utils/jwt.js';

const requireExtensionAuth = (request, response, next) => {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    const error = new Error('Extension token is required.');
    error.statusCode = 401;
    next(error);
    return;
  }

  try {
    const payload = verifyExtensionToken(token);
    if (payload.type !== 'extension' || !payload.sub) {
      const error = new Error('Invalid extension token.');
      error.statusCode = 401;
      throw error;
    }
    request.user = { id: payload.sub };
    next();
  } catch (error) {
    error.statusCode = 401;
    error.message = 'Extension token is invalid or expired.';
    next(error);
  }
};

export default requireExtensionAuth;
