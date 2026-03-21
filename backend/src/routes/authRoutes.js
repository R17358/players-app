const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe,
  updateProfile, updateAvatar, updatePassword,
  forgotPassword, resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadProfile } = require('../config/cloudinary');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/updateprofile', protect, updateProfile);
router.put('/avatar', protect, uploadProfile.single('avatar'), updateAvatar);
router.put('/updatepassword', protect, updatePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

module.exports = router;
