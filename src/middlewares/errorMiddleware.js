import AppError from '../utils/AppError.js';

export const notFound = (req, res, next) => {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} không tồn tại`, 404, 'Not Found'));
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let error = err.error || 'Internal Server Error';
  let message = err.message || 'Lỗi máy chủ';

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    error = 'Bad Request';
    message = 'JSON không hợp lệ';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    error = 'Payload Too Large';
    message = 'Dữ liệu request vượt quá giới hạn cho phép';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'Bad Request';
    message = Object.values(err.errors).map((item) => item.message).join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    error = 'Conflict';
    message = 'Email đã được sử dụng';
  }

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err);
    statusCode = 500;
    error = 'Internal Server Error';
    message = 'Đã xảy ra lỗi máy chủ';
  }

  res.status(statusCode).json({ message, error, statusCode });
};
