const crypto = require('crypto');
const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const getRazorpay = require('../config/razorpay');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendEmail, emailTemplates } = require('../utils/emailService');

// @desc    Initiate registration + create Razorpay order
// @route   POST /api/v1/registrations/initiate
// @access  Private (player)
exports.initiateRegistration = asyncHandler(async (req, res, next) => {
  const { tournamentId, emergencyContact, sportInfo, agreedToRules, useWallet } = req.body;

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  // Validations
  if (!tournament.isRegistrationOpen) {
    return next(new ErrorResponse('Registration is closed for this tournament', 400));
  }
  if (!agreedToRules) {
    return next(new ErrorResponse('You must agree to the tournament rules', 400));
  }

  // Check age restrictions
  if (req.user.dateOfBirth) {
    const age = Math.floor((Date.now() - req.user.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < tournament.ageGroup.min || age > tournament.ageGroup.max) {
      return next(new ErrorResponse(`This tournament is for age group ${tournament.ageGroup.label || `${tournament.ageGroup.min}-${tournament.ageGroup.max}`}`, 400));
    }
  }

  // Check if already registered
  const existingReg = await Registration.findOne({
    tournament: tournamentId,
    player: req.user.id,
  });
  if (existingReg && existingReg.status !== 'cancelled') {
    return next(new ErrorResponse('You are already registered for this tournament', 400));
  }

  const fee = tournament.registrationFee;

  // Create registration record
  const registration = await Registration.create({
    tournament: tournamentId,
    player: req.user.id,
    registrationType: tournament.isTeamBased ? 'team' : 'individual',
    playerSnapshot: {
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      city: req.user.city,
      dateOfBirth: req.user.dateOfBirth,
      gender: req.user.gender,
    },
    emergencyContact,
    sportInfo,
    agreedToRules,
    agreedAt: Date.now(),
    payment: {
      amount: fee,
      currency: 'INR',
      status: fee === 0 ? 'free' : 'pending',
    },
    status: fee === 0 ? 'confirmed' : 'payment_pending',
  });

  // Free tournament — confirm immediately
  if (fee === 0) {
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { currentParticipants: 1, registrationsCount: 1 },
    });

    const emailData = emailTemplates.registrationConfirmed(
      req.user.name, tournament.title, registration.registrationNumber
    );
    sendEmail({ to: req.user.email, ...emailData }).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Registration confirmed! (Free tournament)',
      data: { registration, paymentRequired: false },
    });
  }

  // Use wallet balance if opted
  if (useWallet) {
    const walletUser = await User.findById(req.user.id).select('wallet');
    if (walletUser.wallet.balance >= fee) {
      // Deduct wallet balance
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'wallet.balance': -fee },
        $push: {
          'wallet.transactions': {
            type: 'debit',
            amount: fee,
            description: `Registration fee for ${tournament.title}`,
            reference: registration.registrationNumber,
          },
        },
      });

      registration.payment.status = 'completed';
      registration.payment.method = 'wallet';
      registration.payment.paidAt = Date.now();
      registration.status = 'confirmed';
      await registration.save();

      await Tournament.findByIdAndUpdate(tournamentId, {
        $inc: { currentParticipants: 1, registrationsCount: 1 },
      });

      const emailData = emailTemplates.registrationConfirmed(
        req.user.name, tournament.title, registration.registrationNumber
      );
      sendEmail({ to: req.user.email, ...emailData }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Registration confirmed via wallet!',
        data: { registration, paymentRequired: false },
      });
    }
  }

  // Create Razorpay order
  const order = await getRazorpay().orders.create({
    amount: fee * 100, // paise
    currency: 'INR',
    receipt: registration.registrationNumber,
    notes: {
      tournamentId: tournamentId,
      registrationId: registration._id.toString(),
      playerId: req.user.id,
    },
  });

  registration.payment.razorpayOrderId = order.id;
  await registration.save();

  res.status(201).json({
    success: true,
    message: 'Registration initiated. Complete payment to confirm.',
    data: {
      registration,
      paymentRequired: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        prefill: {
          name: req.user.name,
          email: req.user.email,
          contact: req.user.phone,
        },
      },
    },
  });
});

// @desc    Verify Razorpay payment & confirm registration
// @route   POST /api/v1/registrations/verify-payment
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, registrationId } = req.body;

  // Verify signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return next(new ErrorResponse('Payment verification failed. Invalid signature.', 400));
  }

  const registration = await Registration.findById(registrationId).populate('tournament player');

  if (!registration) return next(new ErrorResponse('Registration not found', 404));

  // Update registration
  registration.payment.razorpayPaymentId = razorpayPaymentId;
  registration.payment.razorpaySignature = razorpaySignature;
  registration.payment.status = 'completed';
  registration.payment.paidAt = Date.now();
  registration.payment.method = 'razorpay';
  registration.status = 'confirmed';
  await registration.save();

  // Update tournament participant count
  await Tournament.findByIdAndUpdate(registration.tournament._id, {
    $inc: { currentParticipants: 1, registrationsCount: 1 },
  });

  // Check if tournament is now full → close registration
  const tournament = await Tournament.findById(registration.tournament._id);
  if (tournament.currentParticipants >= tournament.maxParticipants) {
    await Tournament.findByIdAndUpdate(tournament._id, { status: 'registration_closed' });
  }

  // Send confirmation email
  const emailData = emailTemplates.registrationConfirmed(
    registration.player.name,
    registration.tournament.title,
    registration.registrationNumber
  );
  sendEmail({ to: registration.player.email, ...emailData }).catch(() => {});

  // Add notification
  const player = await User.findById(registration.player._id);
  await player.addNotification({
    title: 'Registration Confirmed! 🎉',
    message: `Your registration for ${registration.tournament.title} is confirmed.`,
    type: 'tournament',
    link: `/tournaments/${registration.tournament.slug}`,
  });

  res.status(200).json({
    success: true,
    message: 'Payment verified! Registration confirmed.',
    data: registration,
  });
});

// @desc    Cancel registration (by player)
// @route   PUT /api/v1/registrations/:id/cancel
// @access  Private
exports.cancelRegistration = asyncHandler(async (req, res, next) => {
  const registration = await Registration.findById(req.params.id).populate('tournament');

  if (!registration) return next(new ErrorResponse('Registration not found', 404));

  if (registration.player.toString() !== req.user.id) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  if (registration.status === 'cancelled') {
    return next(new ErrorResponse('Registration is already cancelled', 400));
  }

  const tournament = registration.tournament;

  // Check cancellation deadline (can cancel until 24 hours before tournament)
  const hoursBeforeTournament = (tournament.tournamentStartDate - Date.now()) / (1000 * 60 * 60);
  if (hoursBeforeTournament < 24) {
    return next(new ErrorResponse('Cannot cancel registration less than 24 hours before tournament', 400));
  }

  // Refund to wallet if payment was made
  if (registration.payment.status === 'completed') {
    const refundAmount = Math.floor(registration.payment.amount * 0.8); // 80% refund

    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'wallet.balance': refundAmount },
      $push: {
        'wallet.transactions': {
          type: 'credit',
          amount: refundAmount,
          description: `Partial refund (80%) for cancelling ${tournament.title}`,
          reference: registration.registrationNumber,
        },
      },
    });

    registration.payment.status = 'refunded';
    registration.payment.refundedAt = Date.now();
    registration.payment.refundAmount = refundAmount;
    registration.payment.refundReason = 'Cancelled by player';
  }

  registration.status = 'cancelled';
  await registration.save();

  // Decrease participant count
  await Tournament.findByIdAndUpdate(tournament._id, {
    $inc: { currentParticipants: -1 },
  });

  res.status(200).json({
    success: true,
    message: '80% refund credited to your SportVibe wallet',
    data: registration,
  });
});

// @desc    Get my registrations
// @route   GET /api/v1/registrations/my
// @access  Private
exports.getMyRegistrations = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { player: req.user.id };
  if (status) query.status = status;

  const registrations = await Registration.find(query)
    .populate('tournament', 'title sport status tournamentStartDate banner prizes slug location organiser')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Registration.countDocuments(query);

  res.status(200).json({ success: true, count: registrations.length, total, data: registrations });
});

// @desc    Get single registration
// @route   GET /api/v1/registrations/:id
// @access  Private
exports.getRegistration = asyncHandler(async (req, res, next) => {
  const registration = await Registration.findById(req.params.id)
    .populate('tournament', 'title sport status tournamentStartDate location organiser prizes')
    .populate('player', 'name username email avatar');

  if (!registration) return next(new ErrorResponse('Registration not found', 404));

  // Only the player, organiser, or admin can view
  const tournament = await Tournament.findById(registration.tournament._id);
  const isOrganiser = tournament.organiser.toString() === req.user.id;
  const isPlayer = registration.player._id.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isPlayer && !isOrganiser && !isAdmin) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  res.status(200).json({ success: true, data: registration });
});
