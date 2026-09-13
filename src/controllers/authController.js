import { authenticateUser, registerUser, updatePassword } from '../services/authService.js';
import {
  getAuthCookieName,
  getAuthCookieOptions,
  getClearAuthCookieOptions
} from '../config/authCookie.js';
import { getTokenExpiresAt } from '../utils/token.js';
import { toPublicUser } from '../utils/userSerializer.js';

export const register = async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({
    message: 'Đăng ký thành công',
    user,
    statusCode: 201
  });
};

export const login = async (req, res) => {
  const { user, token, expiresAt, expiresIn, remember } = await authenticateUser(req.body);

  res.cookie(
    getAuthCookieName(),
    token,
    getAuthCookieOptions({ remember })
  );

  res.status(200).json({
    message: 'Đăng nhập thành công',
    user,
    session: { expiresAt },
    expiresIn,
    statusCode: 200
  });
};

export const getMe = (req, res) => {
  res.status(200).json({
    message: 'Lấy thông tin thành công',
    user: toPublicUser(req.user),
    session: { expiresAt: getTokenExpiresAt(req.auth) },
    statusCode: 200
  });
};

export const changePassword = async (req, res) => {
  await updatePassword(req.user._id, req.body);
  res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
  res.status(200).json({
    message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại',
    statusCode: 200
  });
};

export const logout = (req, res) => {
  res.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
  res.status(200).json({
    message: 'Đăng xuất thành công',
    statusCode: 200
  });
};
