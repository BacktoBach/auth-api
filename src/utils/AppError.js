export default class AppError extends Error {
  constructor(message, statusCode, error, errors) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.isOperational = true;
    if (Array.isArray(errors) && errors.length) this.errors = errors;
  }
}
