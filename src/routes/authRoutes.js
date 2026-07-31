const express = require('express');
const {
  register,
  login,
  getMe,
  changePassword,
  logout,
  getUsers
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.get('/users', protect, authorize('admin'), getUsers);

module.exports = router;
