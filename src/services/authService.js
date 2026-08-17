import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { isPasswordTooLong, MAX_PASSWORD_BYTES } from '../utils/password.js';
import { createAccessToken, ACCESS_TOKEN_EXPIRES_IN } from '../utils/token.js';
import { toPublicUser } from '../utils/userSerializer.js';

const requireFields = (input, fields) => {
  const body = input && typeof input === 'object' ? input : {};
  const missing = fields.filter(
    (field) => typeof body[field] !== 'string' || !body[field].trim()
  );

  if (missing.length) {
    throw new AppError(`Thiếu trường bắt buộc: ${missing.join(', ')}`, 400, 'Bad Request');
  }
};

const requireValidPasswordLength = (...passwords) => {
  if (passwords.some(isPasswordTooLong)) {
    throw new AppError(
      `Mật khẩu không được vượt quá ${MAX_PASSWORD_BYTES} byte`,
      400,
      'Bad Request'
    );
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();

export const registerUser = async (input) => {
  requireFields(input, ['name', 'email', 'password']);
  requireValidPasswordLength(input.password);

  const user = await User.create({
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    password: input.password,
    role: 'user'
  });

  return toPublicUser(user);
};

export const authenticateUser = async (input) => {
  requireFields(input, ['email', 'password']);
  requireValidPasswordLength(input.password);

  const user = await User.findOne({ email: normalizeEmail(input.email) }).select('+password');
  if (!user || !(await user.comparePassword(input.password))) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401, 'Unauthorized');
  }

  return {
    user: toPublicUser(user),
    token: createAccessToken(user),
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  };
};

export const updatePassword = async (userId, input) => {
  requireFields(input, ['oldPassword', 'newPassword']);
  requireValidPasswordLength(input.oldPassword, input.newPassword);

  if (input.oldPassword === input.newPassword) {
    throw new AppError('Mật khẩu mới phải khác mật khẩu cũ', 400, 'Bad Request');
  }

  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(input.oldPassword))) {
    throw new AppError('Mật khẩu cũ không đúng', 400, 'Bad Request');
  }

  user.password = input.newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
};
