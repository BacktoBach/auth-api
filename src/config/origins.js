import AppError from '../utils/AppError.js';

export const parseClientOrigins = (value = '') => value
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const getAllowedOrigins = (env = process.env) => (
  parseClientOrigins(env.CLIENT_ORIGIN)
);

export const assertAllowedOrigin = (origin, env = process.env) => {
  if (!origin) return;

  if (!getAllowedOrigins(env).includes(origin)) {
    throw new AppError('Origin không được phép truy cập API', 403, 'Forbidden');
  }
};
