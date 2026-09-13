import { assertAllowedOrigin } from '../config/origins.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyRequestOrigin = (req, _res, next) => {
  try {
    if (!SAFE_METHODS.has(req.method)) {
      assertAllowedOrigin(req.get('origin'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
