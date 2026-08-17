import { rateLimit } from 'express-rate-limit';

const createHandler = (message) => (_req, res, _next, options) => {
  res.status(options.statusCode).json({
    message,
    error: 'Too Many Requests',
    statusCode: options.statusCode
  });
};

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createHandler('Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau')
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createHandler('Bạn đã đăng nhập sai quá nhiều lần, vui lòng thử lại sau')
});
