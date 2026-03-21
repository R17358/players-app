const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendEmail } = require('../utils/emailService');

// @desc    Get dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private (admin)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const [
    totalUsers,
    totalPlayers,
    totalOrganisers,
    totalTournaments,
    activeTournaments,
    pendingApprovals,
    totalRegistrations,
    completedTournaments,
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'player', isActive: true }),
    User.countDocuments({ role: 'organiser', isActive: true }),
    Tournament.countDocuments(),
    Tournament.countDocuments({ status: { $in: ['registration_open', 'ongoing'] } }),
    Tournament.countDocuments({ status: 'published', adminApproved: false }),
    Registration.countDocuments({ status: 'confirmed' }),
    Tournament.countDocuments({ status: 'completed' }),
  ]);

  // Revenue stats (total registration fees collected)
  const revenueStats = await Registration.aggregate([
    { $match: { 'payment.status': 'completed' } },
    { $group: { _id: null, total: { $sum: '$payment.amount' } } },
  ]);

  // New users this month
  const startOfMonth = new Date(new Date().setDate(1));
  const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

  // Sport distribution
  const sportDistribution = await Tournament.aggregate([
    { $group: { _id: '$sport', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Recent tournaments
  const recentTournaments = await Tournament.find()
    .populate('organiser', 'name username')
    .sort('-createdAt')
    .limit(5)
    .select('title sport status createdAt registrationsCount');

  res.status(200).json({
    success: true,
    data: {
      users: { total: totalUsers, players: totalPlayers, organisers: totalOrganisers, newThisMonth: newUsersThisMonth },
      tournaments: { total: totalTournaments, active: activeTournaments, completed: completedTournaments, pendingApprovals },
      registrations: { total: totalRegistrations },
      revenue: { total: revenueStats[0]?.total || 0 },
      sportDistribution,
      recentTournaments,
    },
  });
});

// @desc    Get pending tournament approvals
// @route   GET /api/v1/admin/tournaments/pending
// @access  Private (admin)
exports.getPendingTournaments = asyncHandler(async (req, res, next) => {
  const tournaments = await Tournament.find({ status: 'published', adminApproved: false })
    .populate('organiser', 'name username email organiserProfile avatar')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
});

// @desc    Approve tournament
// @route   PUT /api/v1/admin/tournaments/:id/approve
// @access  Private (admin)
exports.approveTournament = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id).populate('organiser');

  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  tournament.adminApproved = true;
  tournament.adminApprovedBy = req.user.id;
  tournament.adminApprovedAt = Date.now();
  tournament.adminNotes = req.body.notes;
  tournament.status = 'registration_open';
  tournament.isPublished = true;
  tournament.publishedAt = Date.now();
  await tournament.save();

  // Notify organiser
  await User.findByIdAndUpdate(tournament.organiser._id, {
    $push: {
      notifications: {
        title: '✅ Tournament Approved!',
        message: `"${tournament.title}" has been approved and is now live for registrations.`,
        type: 'success',
        link: `/tournaments/${tournament.slug}`,
      },
      $inc: { unreadNotificationsCount: 1 },
    },
  });

  // Email organiser
  sendEmail({
    to: tournament.organiser.email,
    subject: `Tournament Approved: ${tournament.title}`,
    html: `<p>Your tournament <strong>${tournament.title}</strong> has been approved and is now live!</p>`,
  }).catch(() => {});

  res.status(200).json({ success: true, message: 'Tournament approved and published', data: tournament });
});

// @desc    Reject tournament
// @route   PUT /api/v1/admin/tournaments/:id/reject
// @access  Private (admin)
exports.rejectTournament = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  if (!reason) return next(new ErrorResponse('Rejection reason is required', 400));

  const tournament = await Tournament.findById(req.params.id).populate('organiser');
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  tournament.status = 'draft';
  tournament.adminNotes = reason;
  await tournament.save();

  // Notify organiser
  await User.findByIdAndUpdate(tournament.organiser._id, {
    $push: {
      notifications: {
        title: '❌ Tournament Needs Changes',
        message: `"${tournament.title}" was not approved. Reason: ${reason}`,
        type: 'warning',
        link: `/organiser/tournaments/${tournament._id}/edit`,
      },
    },
    $inc: { unreadNotificationsCount: 1 },
  });

  res.status(200).json({ success: true, message: 'Tournament rejected with reason', data: tournament });
});

// @desc    Feature / unfeature tournament
// @route   PUT /api/v1/admin/tournaments/:id/feature
// @access  Private (admin)
exports.toggleFeatureTournament = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  tournament.isFeatured = !tournament.isFeatured;
  await tournament.save();

  res.status(200).json({
    success: true,
    message: tournament.isFeatured ? 'Tournament featured' : 'Tournament unfeatured',
    data: tournament,
  });
});

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (admin)
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const { role, isActive, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password -notifications -wallet.transactions')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({ success: true, count: users.length, total, data: users });
});

// @desc    Update user (ban/unban, change role)
// @route   PUT /api/v1/admin/users/:id
// @access  Private (admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const allowedUpdates = ['isActive', 'role', 'organiserProfile'];
  const updates = {};
  allowedUpdates.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!user) return next(new ErrorResponse('User not found', 404));

  // If deactivated, notify user
  if (updates.isActive === false) {
    sendEmail({
      to: user.email,
      subject: 'Account Suspended - SportVibe',
      html: `<p>Your account has been suspended. Contact support for more information.</p>`,
    }).catch(() => {});
  }

  res.status(200).json({ success: true, message: 'User updated', data: user });
});

// @desc    Verify organiser
// @route   PUT /api/v1/admin/users/:id/verify-organiser
// @access  Private (admin)
exports.verifyOrganiser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse('User not found', 404));
  if (user.role !== 'organiser') return next(new ErrorResponse('User is not an organiser', 400));

  user.organiserProfile.isVerified = true;
  await user.save();

  await user.addNotification({
    title: '✅ Organiser Verified!',
    message: 'Your organiser account has been verified. You can now create and publish tournaments.',
    type: 'success',
  });

  sendEmail({
    to: user.email,
    subject: 'Organiser Account Verified - SportVibe',
    html: `<p>Congratulations ${user.name}! Your organiser account is now verified on SportVibe.</p>`,
  }).catch(() => {});

  res.status(200).json({ success: true, message: 'Organiser verified', data: user });
});

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse('User not found', 404));
  if (user.role === 'admin') return next(new ErrorResponse('Cannot delete admin accounts', 400));

  await user.deleteOne();
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

// @desc    Get all registrations (admin)
// @route   GET /api/v1/admin/registrations
// @access  Private (admin)
exports.getAllRegistrations = asyncHandler(async (req, res, next) => {
  const { status, tournamentId, page = 1, limit = 50 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (tournamentId) query.tournament = tournamentId;

  const registrations = await Registration.find(query)
    .populate('player', 'name username email')
    .populate('tournament', 'title sport')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Registration.countDocuments(query);

  res.status(200).json({ success: true, count: registrations.length, total, data: registrations });
});

// @desc    Send platform-wide announcement
// @route   POST /api/v1/admin/announce
// @access  Private (admin)
exports.sendAnnouncement = asyncHandler(async (req, res, next) => {
  const { title, message, targetRole, sendEmail: shouldSendEmail } = req.body;

  const query = { isActive: true };
  if (targetRole) query.role = targetRole;

  const users = await User.find(query).select('_id email name');

  // Add in-app notification to all
  await User.updateMany(query, {
    $push: {
      notifications: {
        $each: [{ title, message, type: 'info', isRead: false, createdAt: new Date() }],
        $position: 0,
      },
    },
    $inc: { unreadNotificationsCount: 1 },
  });

  // Send email if requested (async, batch)
  if (shouldSendEmail) {
    const emails = users.map((u) => u.email);
    sendEmail({
      to: emails.join(','),
      subject: `[SportVibe] ${title}`,
      html: `<p>${message}</p>`,
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `Announcement sent to ${users.length} users`,
  });
});
