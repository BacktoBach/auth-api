import { getUsersPage } from '../services/userService.js';

export const getUsers = async (req, res) => {
  const result = await getUsersPage(req.query);
  res.status(200).json({
    message: 'Lấy danh sách người dùng thành công',
    ...result,
    statusCode: 200
  });
};
