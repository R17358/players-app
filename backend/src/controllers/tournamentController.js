const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// @desc    Create tournament
// @route   POST /api/v1/tournaments
// @access  Private (organiser/admin)
exports.createTournament = asyncHandler(async (req, res, next) => {
  req.body.organiser = req.user.id;

  // Auto-detect isFree
  if (req.body.registrationFee === 0 || !req.body.registrationFee) {
    req.body.isFree = true;
  }

  // Set totalPrizePool
  if (req.body.prizes) {
    const { first, second, third } = req.body.prizes;
    req.body.prizes.totalPrizePool =
      (first?.amount || 0) + (second?.amount || 0) + (third?.amount || 0);
  }

  const tournament = await Tournament.create(req.body);

  // Increment organiser's tournament count
  await User.findByIdAndUpdate(req.user.id, {
    $inc: { 'organiserProfile.tournamentsOrganised': 1 },
  });

  res.status(201).json({
    success: true,
    message: 'Tournament created. Submit for admin approval to publish.',
    data: tournament,
  });
});

// @desc    Get all tournaments (with filters)
// @route   GET /api/v1/tournaments
// @access  Public
exports.getTournaments = asyncHandler(async (req, res, next) => {
  const {
    sport, city, state, status, isFree, gender,
    minFee, maxFee, search, featured,
    page = 1, limit = 12, sort = '-createdAt',
  } = req.query;

  const query = { isPublished: true };

  if (sport) query.sport = sport;
  if (city) query['location.city'] = { $regex: city, $options: 'i' };
  if (state) query['location.state'] = { $regex: state, $options: 'i' };
  if (status) query.status = status;
  if (gender) query.gender = gender;
  if (featured === 'true') query.isFeatured = true;
  if (isFree === 'true') query.isFree = true;
  if (minFee) query.registrationFee = { $gte: Number(minFee) };
  if (maxFee) query.registrationFee = { ...query.registrationFee, $lte: Number(maxFee) };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Tournament.countDocuments(query);

  const tournaments = await Tournament.find(query)
    .populate('organiser', 'name username avatar organiserProfile.organizationName organiserProfile.isVerified organiserProfile.rating')
    .select('-matches -rules')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    count: tournaments.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: tournaments,
  });
});

// @desc    Get single tournament
// @route   GET /api/v1/tournaments/:slugOrId
// @access  Public
exports.getTournament = asyncHandler(async (req, res, next) => {
  const { slugOrId } = req.params;

  let tournament = await Tournament.findOne({
    $or: [{ slug: slugOrId }, { _id: slugOrId.match(/^[0-9a-fA-F]{24}$/) ? slugOrId : null }],
  }).populate('organiser', 'name username avatar organiserProfile city')
    .populate('results.winner', 'name username avatar')
    .populate('results.runnerUp', 'name username avatar');

  if (!tournament) {
    return next(new ErrorResponse('Tournament not found', 404));
  }

  // Increment views
  await Tournament.findByIdAndUpdate(tournament._id, { $inc: { views: 1 } });

  // Check if current user is registered
  let userRegistration = null;
  let isBookmarked = false;
  if (req.user) {
    userRegistration = await Registration.findOne({
      tournament: tournament._id,
      player: req.user.id,
    }).select('status payment registrationNumber performance certificate');

    isBookmarked = tournament.bookmarks.some((id) => id.toString() === req.user.id);
  }

  res.status(200).json({
    success: true,
    data: {
      ...tournament.toObject(),
      userRegistration,
      isBookmarked,
    },
  });
});

// @desc    Update tournament
// @route   PUT /api/v1/tournaments/:id
// @access  Private (organiser who owns it / admin)
exports.updateTournament = asyncHandler(async (req, res, next) => {
  let tournament = await Tournament.findById(req.params.id);

  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  // Check ownership
  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to update this tournament', 403));
  }

  // Prevent editing ongoing/completed tournaments (except admin)
  if (['ongoing', 'completed'].includes(tournament.status) && req.user.role !== 'admin') {
    return next(new ErrorResponse('Cannot edit an ongoing or completed tournament', 400));
  }

  // Remove admin-only fields if not admin
  if (req.user.role !== 'admin') {
    delete req.body.adminApproved;
    delete req.body.isFeatured;
  }

  tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: 'Tournament updated', data: tournament });
});

// @desc    Delete tournament
// @route   DELETE /api/v1/tournaments/:id
// @access  Private (organiser who owns it / admin)
exports.deleteTournament = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this tournament', 403));
  }

  if (['ongoing', 'completed'].includes(tournament.status)) {
    return next(new ErrorResponse('Cannot delete an ongoing or completed tournament', 400));
  }

  await tournament.deleteOne();

  res.status(200).json({ success: true, message: 'Tournament deleted' });
});

// @desc    Publish tournament (submit for admin approval)
// @route   PUT /api/v1/tournaments/:id/publish
// @access  Private (organiser)
exports.publishTournament = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  if (tournament.status !== 'draft') {
    return next(new ErrorResponse('Only draft tournaments can be submitted', 400));
  }

  // Validation checks
  if (!tournament.banner?.url) {
    return next(new ErrorResponse('Please upload a tournament banner before publishing', 400));
  }

  tournament.status = 'published';
  await tournament.save();

  res.status(200).json({
    success: true,
    message: 'Tournament submitted for admin approval',
    data: tournament,
  });
});

// @desc    Cancel tournament (organiser)
// @route   PUT /api/v1/tournaments/:id/cancel
// @access  Private (organiser/admin)
exports.cancelTournament = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  if (tournament.status === 'completed') {
    return next(new ErrorResponse('Cannot cancel a completed tournament', 400));
  }

  tournament.status = 'cancelled';
  tournament.cancelledAt = Date.now();
  tournament.cancellationReason = req.body.reason || 'Cancelled by organiser';
  await tournament.save();

  // Process refunds for all confirmed registrations
  const registrations = await Registration.find({
    tournament: tournament._id,
    status: 'confirmed',
    'payment.status': 'completed',
  }).populate('player', 'name email wallet');

  for (const reg of registrations) {
    const refundAmount = reg.payment.amount;

    // Credit to wallet
    await User.findByIdAndUpdate(reg.player._id, {
      $inc: { 'wallet.balance': refundAmount },
      $push: {
        'wallet.transactions': {
          type: 'credit',
          amount: refundAmount,
          description: `Refund for cancelled tournament: ${tournament.title}`,
          reference: reg.registrationNumber,
        },
      },
    });

    // Update registration
    reg.status = 'cancelled';
    reg.payment.status = 'refunded';
    reg.payment.refundedAt = Date.now();
    reg.payment.refundAmount = refundAmount;
    reg.payment.refundReason = 'Tournament cancelled';
    await reg.save();

    // Send refund email
    const template = emailTemplates.refundProcessed(reg.player.name, refundAmount, tournament.title);
    sendEmail({ to: reg.player.email, ...template }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: `Tournament cancelled. ${registrations.length} registrations refunded.`,
    data: tournament,
  });
});

// @desc    Upload tournament banner
// @route   PUT /api/v1/tournaments/:id/banner
// @access  Private (organiser)
exports.uploadBanner = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('Please upload an image', 400));

  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  await Tournament.findByIdAndUpdate(req.params.id, {
    banner: { url: req.file.path, publicId: req.file.filename },
  });

  res.status(200).json({
    success: true,
    message: 'Banner uploaded',
    data: { url: req.file.path },
  });
});

// @desc    Bookmark / unbookmark tournament
// @route   POST /api/v1/tournaments/:id/bookmark
// @access  Private
exports.toggleBookmark = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  const isBookmarked = tournament.bookmarks.some((id) => id.toString() === req.user.id);

  if (isBookmarked) {
    await Tournament.findByIdAndUpdate(req.params.id, {
      $pull: { bookmarks: req.user.id },
      $inc: { bookmarksCount: -1 },
    });
    return res.status(200).json({ success: true, message: 'Bookmark removed', isBookmarked: false });
  } else {
    await Tournament.findByIdAndUpdate(req.params.id, {
      $addToSet: { bookmarks: req.user.id },
      $inc: { bookmarksCount: 1 },
    });
    return res.status(200).json({ success: true, message: 'Tournament bookmarked', isBookmarked: true });
  }
});

// @desc    Get tournament registrations (organiser view)
// @route   GET /api/v1/tournaments/:id/registrations
// @access  Private (organiser/admin)
exports.getTournamentRegistrations = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const { status, page = 1, limit = 50 } = req.query;
  const query = { tournament: req.params.id };
  if (status) query.status = status;

  const registrations = await Registration.find(query)
    .populate('player', 'name username email avatar phone city gender dateOfBirth')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Registration.countDocuments(query);

  res.status(200).json({
    success: true,
    count: registrations.length,
    total,
    data: registrations,
  });
});

// @desc    Generate bracket/schedule
// @route   POST /api/v1/tournaments/:id/generate-bracket
// @access  Private (organiser/admin)
exports.generateBracket = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const registrations = await Registration.find({
    tournament: req.params.id,
    status: 'confirmed',
  }).select('player team');

  if (registrations.length < 2) {
    return next(new ErrorResponse('Need at least 2 participants to generate bracket', 400));
  }

  // Shuffle participants for random seeding
  const participants = registrations.sort(() => Math.random() - 0.5);

  let matches = [];
  const format = tournament.tournamentFormat;

  if (format === 'knockout') {
    // Round 1 matches
    for (let i = 0; i < participants.length - 1; i += 2) {
      matches.push({
        round: 1,
        matchNumber: Math.floor(i / 2) + 1,
        team1: {
          players: [participants[i].player],
          team: participants[i].team,
        },
        team2: {
          players: [participants[i + 1].player],
          team: participants[i + 1].team,
        },
        status: 'scheduled',
        scheduledAt: tournament.tournamentStartDate,
        venue: tournament.location?.venue,
      });
    }

    // Handle bye if odd number
    if (participants.length % 2 !== 0) {
      const byePlayer = participants[participants.length - 1];
      matches.push({
        round: 1,
        matchNumber: Math.ceil(participants.length / 2),
        team1: { players: [byePlayer.player], team: byePlayer.team },
        team2: { players: [], team: null },
        status: 'completed',
        notes: 'BYE - Auto advance',
      });
    }

    tournament.totalRounds = Math.ceil(Math.log2(participants.length));

  } else if (format === 'round-robin') {
    // Every participant plays every other participant
    let matchNumber = 1;
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matches.push({
          round: 1,
          matchNumber: matchNumber++,
          team1: { players: [participants[i].player], team: participants[i].team },
          team2: { players: [participants[j].player], team: participants[j].team },
          status: 'scheduled',
          scheduledAt: tournament.tournamentStartDate,
        });
      }
    }
    tournament.totalRounds = 1;
  }

  tournament.matches = matches;
  tournament.status = 'ongoing';
  tournament.currentRound = 1;
  await tournament.save();

  res.status(200).json({
    success: true,
    message: `Bracket generated: ${matches.length} matches created`,
    data: { matches, format, totalRounds: tournament.totalRounds },
  });
});

// @desc    Update match result
// @route   PUT /api/v1/tournaments/:id/matches/:matchIndex
// @access  Private (organiser/admin)
exports.updateMatchResult = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const { matchIndex } = req.params;
  const { team1Score, team2Score, winner, status, liveScore } = req.body;

  if (!tournament.matches[matchIndex]) {
    return next(new ErrorResponse('Match not found', 404));
  }

  tournament.matches[matchIndex].team1.score = team1Score;
  tournament.matches[matchIndex].team2.score = team2Score;
  tournament.matches[matchIndex].status = status || 'completed';
  tournament.matches[matchIndex].liveScore = liveScore;

  if (winner) {
    tournament.matches[matchIndex].winner = winner;
    tournament.matches[matchIndex].completedAt = Date.now();
  }

  // Update player stats
  if (status === 'completed' && winner) {
    const match = tournament.matches[matchIndex];
    const isTeam1Winner = match.team1.team?.toString() === winner || 
                          match.team1.players[0]?.toString() === winner;

    // Update wins/losses
    const winnersPlayers = isTeam1Winner ? match.team1.players : match.team2.players;
    const loserPlayers = isTeam1Winner ? match.team2.players : match.team1.players;

    await Registration.updateMany(
      { tournament: req.params.id, player: { $in: winnersPlayers } },
      { $inc: { 'performance.wins': 1, 'performance.matchesPlayed': 1, 'performance.points': 3 } }
    );
    await Registration.updateMany(
      { tournament: req.params.id, player: { $in: loserPlayers } },
      { $inc: { 'performance.losses': 1, 'performance.matchesPlayed': 1 } }
    );
  }

  await tournament.save();

  res.status(200).json({
    success: true,
    message: 'Match result updated',
    data: tournament.matches[matchIndex],
  });
});

// @desc    Declare tournament results
// @route   PUT /api/v1/tournaments/:id/results
// @access  Private (organiser/admin)
exports.declareTournamentResults = asyncHandler(async (req, res, next) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.organiser.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const { winner, runnerUp, summary, highlightVideoUrl } = req.body;

  tournament.results = { winner, runnerUp, summary, highlightVideoUrl };
  tournament.status = 'completed';
  await tournament.save();

  // Issue certificates
  const positions = [
    { playerId: winner, type: 'winner' },
    { playerId: runnerUp, type: 'runner-up' },
  ];

  for (const pos of positions) {
    if (!pos.playerId) continue;
    await Registration.findOneAndUpdate(
      { tournament: tournament._id, player: pos.playerId },
      {
        'certificate.issued': true,
        'certificate.issuedAt': Date.now(),
        'certificate.type': pos.type,
      }
    );

    // Notify players
    const player = await User.findById(pos.playerId);
    if (player) {
      await player.addNotification({
        title: `🏆 Tournament Results - ${tournament.title}`,
        message: `Congratulations! You finished as ${pos.type}. Your certificate is ready!`,
        type: 'tournament',
        link: `/tournaments/${tournament.slug}`,
      });
    }
  }

  // Update all participant stats
  await Registration.updateMany(
    { tournament: tournament._id, status: 'confirmed' },
    { $inc: { 'performance.matchesPlayed': 0 } } // trigger for stat update
  );

  res.status(200).json({
    success: true,
    message: 'Tournament results declared. Certificates issued.',
    data: tournament,
  });
});

// @desc    Get organiser's tournaments
// @route   GET /api/v1/tournaments/my-tournaments
// @access  Private (organiser)
exports.getMyTournaments = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { organiser: req.user.id };
  if (status) query.status = status;

  const tournaments = await Tournament.find(query)
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Tournament.countDocuments(query);

  res.status(200).json({ success: true, count: tournaments.length, total, data: tournaments });
});

// @desc    Get upcoming tournaments (for home feed)
// @route   GET /api/v1/tournaments/upcoming
// @access  Public
exports.getUpcomingTournaments = asyncHandler(async (req, res, next) => {
  const { sport, city } = req.query;
  const query = {
    status: { $in: ['registration_open', 'registration_closed'] },
    tournamentStartDate: { $gte: new Date() },
    isPublished: true,
  };

  if (sport) query.sport = sport;
  if (city) query['location.city'] = { $regex: city, $options: 'i' };

  const tournaments = await Tournament.find(query)
    .populate('organiser', 'name username avatar organiserProfile.organizationName')
    .sort('tournamentStartDate')
    .limit(12);

  res.status(200).json({ success: true, count: tournaments.length, data: tournaments });
});
