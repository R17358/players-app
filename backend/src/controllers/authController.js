const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// Helper: send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  // Remove sensitive fields
  user.password = undefined;
  user.emailVerificationToken = undefined;
  user.resetPasswordToken = undefined;

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    message,
    token,
    data: user,
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, username, email, password, role, phone, city, state } = req.body;

  // Prevent self-assigning admin role
  const allowedRoles = ['player', 'organiser'];
  if (role && !allowedRoles.includes(role)) {
    return next(new ErrorResponse('Invalid role selected', 400));
  }

  const user = await User.create({
    name,
    username,
    email,
    password,
    role: role || 'player',
    phone,
    city,
    state,
  });

  // Send welcome email (non-blocking)
  const template = emailTemplates.welcome(name);
  sendEmail({ to: email, ...template }).catch(() => {});

  // If organiser: notify all admins
  if (role === 'organiser') {
    const User = require('../models/User');
    User.find({ role: 'admin' }).then(admins => {
      admins.forEach(admin => {
        admin.addNotification({
          title: '📋 New Organiser Registered',
          message: `${name} (@${username}) has registered as an organiser and needs verification.`,
          type: 'info',
          link: '/admin/users',
        }).catch(() => {});
      });
    }).catch(() => {});
  }

  sendTokenResponse(user, 201, res, 'Account created successfully');
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return next(new ErrorResponse('Please provide credentials', 400));
  }

  // Find by email or username
  const user = await User.findOne({
    $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
  }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

// @desc    Logout
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

// @desc    Update profile
// @route   PUT /api/v1/auth/updateprofile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = [
    'name', 'bio', 'phone', 'city', 'state', 'country',
    'dateOfBirth', 'gender', 'sportProfiles', 'organiserProfile',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: 'Profile updated', data: user });
});

// @desc    Update avatar
// @route   PUT /api/v1/auth/avatar
// @access  Private
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload an image', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      avatar: {
        url: req.file.path,
        publicId: req.file.filename,
      },
    },
    { new: true }
  );

  res.status(200).json({ success: true, message: 'Avatar updated', data: { avatar: user.avatar } });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('No user found with that email', 404));
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    const template = emailTemplates.passwordReset(user.name, resetUrl);
    await sendEmail({ to: user.email, ...template });

    res.status(200).json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful');
});
