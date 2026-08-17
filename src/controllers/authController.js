import { authenticateUser, registerUser, updatePassword } from '../services/authService.js';
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
  const result = await authenticateUser(req.body);
  res.status(200).json({
    message: 'Đăng nhập thành công',
    ...result
  });
};

export const getMe = (req, res) => {
  res.status(200).json({
    message: 'Lấy thông tin thành công',
    user: toPublicUser(req.user)
  });
};

export const changePassword = async (req, res) => {
  await updatePassword(req.user._id, req.body);
  res.status(200).json({
    message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại',
    statusCode: 200
  });
};

export const logout = (req, res) => {
  res.status(200).json({
    message: 'Đăng xuất thành công. Hãy xóa token ở phía client',
    statusCode: 200
  });
};
