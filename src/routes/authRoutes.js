import express from 'express';
import { register, login, getMe, changePassword, logout } from '../controllers/authController.js';
import { getUsers } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { loginLimiter, registerLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.get('/users', protect, authorize('admin'), getUsers);

export default router;
