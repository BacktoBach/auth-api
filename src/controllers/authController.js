const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const createToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const requireFields = (body, fields) => {
  const input = body && typeof body === 'object' ? body : {};
  const missing = fields.filter(
    (field) => typeof input[field] !== 'string' || !input[field].trim()
  );
  if (missing.length) {
    throw new AppError(`Thiếu trường bắt buộc: ${missing.join(', ')}`, 400, 'Bad Request');
  }
};

exports.register = async (req, res, next) => {
  try {
    requireFields(req.body, ['name', 'email', 'password']);
    const { name, password } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const user = await User.create({ name: name.trim(), email, password, role: 'user' });
    res.status(201).json({
      message: 'Đăng ký thành công',
      user: publicUser(user),
      statusCode: 201
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    requireFields(req.body, ['email', 'password']);
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new AppError('Email hoặc mật khẩu không đúng', 401, 'Unauthorized');
    }

    res.status(200).json({
      message: 'Đăng nhập thành công',
      user: publicUser(user),
      token: createToken(user._id),
      expiresIn: TOKEN_EXPIRES_IN
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = (req, res) => {
  res.status(200).json({ message: 'Lấy thông tin thành công', user: publicUser(req.user) });
};

exports.changePassword = async (req, res, next) => {
  try {
    requireFields(req.body, ['oldPassword', 'newPassword']);
    if (req.body.oldPassword === req.body.newPassword) {
      throw new AppError('Mật khẩu mới phải khác mật khẩu cũ', 400, 'Bad Request');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(req.body.oldPassword))) {
      throw new AppError('Mật khẩu cũ không đúng', 400, 'Bad Request');
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại',
      statusCode: 200
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.status(200).json({
    message: 'Đăng xuất thành công. Hãy xóa token ở phía client',
    statusCode: 200
  });
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Lấy danh sách người dùng thành công',
      users: users.map(publicUser),
      statusCode: 200
    });
  } catch (error) {
    next(error);
  }
};
