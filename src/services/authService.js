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
    throw new AppError(
      `Thiếu trường bắt buộc: ${missing.join(', ')}`,
      400,
      'Bad Request',
      missing.map((field) => ({ field, message: `${field} là bắt buộc` }))
    );
  }
};

const requireValidPasswordLength = (passwordsByField) => {
  const invalidFields = Object.entries(passwordsByField)
    .filter(([, password]) => isPasswordTooLong(password))
    .map(([field]) => field);

  if (invalidFields.length) {
    throw new AppError(
      `Mật khẩu không được vượt quá ${MAX_PASSWORD_BYTES} byte`,
      400,
      'Bad Request',
      invalidFields.map((field) => ({
        field,
        message: `Mật khẩu không được vượt quá ${MAX_PASSWORD_BYTES} byte`
      }))
    );
  }
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const parseRemember = (value) => {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new AppError(
      'remember phải là boolean',
      400,
      'Bad Request',
      [{ field: 'remember', message: 'remember phải là boolean' }]
    );
  }
  return value;
};

export const registerUser = async (input) => {
  requireFields(input, ['name', 'email', 'password']);
  requireValidPasswordLength({ password: input.password });

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
  requireValidPasswordLength({ password: input.password });
  const remember = parseRemember(input.remember);

  const user = await User.findOne({ email: normalizeEmail(input.email) }).select('+password');
  if (!user || !(await user.comparePassword(input.password))) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401, 'Unauthorized');
  }

  const { token, expiresAt } = createAccessToken(user);

  return {
    user: toPublicUser(user),
    token,
    expiresAt,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    remember
  };
};

export const updatePassword = async (userId, input) => {
  requireFields(input, ['oldPassword', 'newPassword']);
  requireValidPasswordLength({
    oldPassword: input.oldPassword,
    newPassword: input.newPassword
  });

  if (input.oldPassword === input.newPassword) {
    throw new AppError(
      'Mật khẩu mới phải khác mật khẩu cũ',
      400,
      'Bad Request',
      [{ field: 'newPassword', message: 'Mật khẩu mới phải khác mật khẩu cũ' }]
    );
  }

  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(input.oldPassword))) {
    throw new AppError(
      'Mật khẩu cũ không đúng',
      400,
      'Bad Request',
      [{ field: 'oldPassword', message: 'Mật khẩu cũ không đúng' }]
    );
  }

  user.password = input.newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
};
