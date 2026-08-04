const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} không tồn tại`, 404, 'Not Found'));
};

const errorHandler = (err, req, res, next) => {

  let statusCode = err.statusCode || 500;
  let error = err.error || 'Internal Server Error';
  let message = err.message || 'Lỗi máy chủ';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'Bad Request';
    message = Object.values(err.errors).map((item) => item.message).join(', ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    error = 'Conflict';
    message = 'Email đã được sử dụng';
  }

  if (statusCode === 500) message = 'Đã xảy ra lỗi máy chủ';

  res.status(statusCode).json({ message, error, statusCode });
};

module.exports = { notFound, errorHandler };
