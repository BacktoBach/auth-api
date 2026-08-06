import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

export const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục', 401, 'Unauthorized');
    }

    const token = authorization.slice(7).trim();
    if (!token) throw new AppError('Token xác thực không hợp lệ', 401, 'Unauthorized');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('Người dùng của token không còn tồn tại', 401, 'Unauthorized');
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AppError('Mật khẩu đã thay đổi, vui lòng đăng nhập lại', 401, 'Unauthorized');
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token đã hết hạn', 401, 'Unauthorized'));
    }
    return next(new AppError('Token không hợp lệ', 401, 'Unauthorized'));
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Bạn không có quyền truy cập tài nguyên này', 403, 'Forbidden'));
  }
  return next();
};
