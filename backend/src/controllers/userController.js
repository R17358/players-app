const User = require('../models/User');
const Post = require('../models/Post');
const Registration = require('../models/Registration');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user profile by username
// @route   GET /api/v1/users/:username
// @access  Public
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username })
    .select('-password -emailVerificationToken -resetPasswordToken -wallet.transactions -notifications');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if requester follows this user
  let isFollowing = false;
  if (req.user) {
    isFollowing = user.followers.some((f) => f.toString() === req.user.id);
  }

  res.status(200).json({
    success: true,
    data: {
      ...user.toObject(),
      isFollowing,
    },
  });
});

// @desc    Follow / Unfollow a user
// @route   POST /api/v1/users/:id/follow
// @access  Private
exports.toggleFollow = asyncHandler(async (req, res, next) => {
  if (req.params.id === req.user.id) {
    return next(new ErrorResponse('You cannot follow yourself', 400));
  }

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) {
    return next(new ErrorResponse('User not found', 404));
  }

  const currentUser = await User.findById(req.user.id);
  const alreadyFollowing = currentUser.following.some(
    (id) => id.toString() === req.params.id
  );

  if (alreadyFollowing) {
    // Unfollow
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { following: req.params.id },
      $inc: { followingCount: -1 },
    });
    await User.findByIdAndUpdate(req.params.id, {
      $pull: { followers: req.user.id },
      $inc: { followersCount: -1 },
    });

    return res.status(200).json({
      success: true,
      message: `Unfollowed ${targetUser.name}`,
      isFollowing: false,
    });
  } else {
    // Follow
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: req.params.id },
      $inc: { followingCount: 1 },
    });
    await User.findByIdAndUpdate(req.params.id, {
      $addToSet: { followers: req.user.id },
      $inc: { followersCount: 1 },
    });

    // Send notification to followed user
    await targetUser.addNotification({
      title: 'New Follower',
      message: `${currentUser.name} (@${currentUser.username}) started following you`,
      type: 'follow',
      link: `/u/${currentUser.username}`,
    });

    return res.status(200).json({
      success: true,
      message: `Now following ${targetUser.name}`,
      isFollowing: true,
    });
  }
});

// @desc    Get followers of a user
// @route   GET /api/v1/users/:id/followers
// @access  Public
exports.getFollowers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.params.id)
    .select('followers followersCount name username')
    .populate({
      path: 'followers',
      select: 'name username avatar role city followersCount organiserProfile.isVerified',
      options: { skip, limit },
    });

  if (!user) return next(new ErrorResponse('User not found', 404));

  res.status(200).json({
    success: true,
    count: user.followersCount,
    data: user.followers,
  });
});

// @desc    Get following list of a user
// @route   GET /api/v1/users/:id/following
// @access  Public
exports.getFollowing = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const user = await User.findById(req.params.id)
    .select('following followingCount name username')
    .populate({
      path: 'following',
      select: 'name username avatar role city followersCount organiserProfile.isVerified',
      options: { skip, limit },
    });

  if (!user) return next(new ErrorResponse('User not found', 404));

  res.status(200).json({
    success: true,
    count: user.followingCount,
    data: user.following,
  });
});

// @desc    Search users
// @route   GET /api/v1/users/search
// @access  Public
exports.searchUsers = asyncHandler(async (req, res, next) => {
  const { q, role, sport, city } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new ErrorResponse('Search query must be at least 2 characters', 400));
  }

  const query = {
    isActive: true,
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
    ],
  };

  if (role) query.role = role;
  if (city) query.city = { $regex: city, $options: 'i' };
  if (sport) query['sportProfiles.sport'] = sport;

  const users = await User.find(query)
    .select('name username avatar role city followersCount organiserProfile.isVerified organiserProfile.rating')
    .limit(20);

  res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get user notifications
// @route   GET /api/v1/users/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('notifications unreadNotificationsCount');

  res.status(200).json({
    success: true,
    unreadCount: user.unreadNotificationsCount,
    data: user.notifications,
  });
});

// @desc    Mark notifications as read
// @route   PUT /api/v1/users/notifications/read
// @access  Private
exports.markNotificationsRead = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      'notifications.$[].isRead': true,
      unreadNotificationsCount: 0,
    },
  });

  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// @desc    Get wallet info
// @route   GET /api/v1/users/wallet
// @access  Private
exports.getWallet = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('wallet');

  res.status(200).json({
    success: true,
    data: {
      balance: user.wallet.balance,
      transactions: user.wallet.transactions.slice(0, 50),
    },
  });
});

// @desc    Get user's tournament history
// @route   GET /api/v1/users/:id/tournaments
// @access  Public
exports.getUserTournaments = asyncHandler(async (req, res, next) => {
  const registrations = await Registration.find({
    player: req.params.id,
    status: { $in: ['confirmed', 'cancelled'] },
  })
    .populate('tournament', 'title sport status tournamentStartDate banner prizes slug')
    .sort('-createdAt')
    .limit(20);

  res.status(200).json({
    success: true,
    count: registrations.length,
    data: registrations,
  });
});

// @desc    Get leaderboard by sport
// @route   GET /api/v1/users/leaderboard
// @access  Public
exports.getLeaderboard = asyncHandler(async (req, res, next) => {
  const { sport, city, limit = 20 } = req.query;

  const matchQuery = {
    isActive: true,
    role: 'player',
  };
  if (sport) matchQuery['sportProfiles.sport'] = sport;
  if (city) matchQuery.city = { $regex: city, $options: 'i' };

  const players = await User.find(matchQuery)
    .select('name username avatar city sportProfiles')
    .sort({ 'sportProfiles.stats.totalPoints': -1 })
    .limit(parseInt(limit));

  res.status(200).json({ success: true, data: players });
});

// @desc    Get suggested users to follow (based on sport/city)
// @route   GET /api/v1/users/suggestions
// @access  Private
exports.getSuggestions = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id);

  const suggestions = await User.find({
    _id: { $nin: [...currentUser.following, req.user.id] },
    isActive: true,
    $or: [
      { city: currentUser.city },
      { 'sportProfiles.sport': { $in: currentUser.sportProfiles.map((s) => s.sport) } },
      { role: 'organiser' },
    ],
  })
    .select('name username avatar role city followersCount organiserProfile.isVerified')
    .limit(10);

  res.status(200).json({ success: true, data: suggestions });
});
