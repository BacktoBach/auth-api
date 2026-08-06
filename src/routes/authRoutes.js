import express from 'express';
import {
  register,
  login,
  getMe,
  changePassword,
  logout,
  getUsers
} from '../controllers/authController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.get('/users', protect, authorize('admin'), getUsers);

export default router;
