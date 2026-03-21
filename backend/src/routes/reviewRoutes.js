const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { protect } = require('../middleware/auth');

// @desc    Create review for organiser after tournament
// @route   POST /api/v1/reviews
router.post('/', protect, asyncHandler(async (req, res, next) => {
  const { tournamentId, rating, title, comment, categories } = req.body;

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return next(new ErrorResponse('Tournament not found', 404));

  if (tournament.status !== 'completed') {
    return next(new ErrorResponse('You can only review completed tournaments', 400));
  }

  // Must have participated
  const registration = await Registration.findOne({
    tournament: tournamentId,
    player: req.user.id,
    status: 'confirmed',
  });

  if (!registration) {
    return next(new ErrorResponse('You must have participated to leave a review', 403));
  }

  const review = await Review.create({
    tournament: tournamentId,
    organiser: tournament.organiser,
    reviewer: req.user.id,
    rating,
    title,
    comment,
    categories,
    isVerifiedParticipant: true,
  });

  await review.populate('reviewer', 'name username avatar');

  res.status(201).json({ success: true, data: review });
}));

// @desc    Get reviews for an organiser
// @route   GET /api/v1/reviews/organiser/:organiserId
router.get('/organiser/:organiserId', asyncHandler(async (req, res, next) => {
  const reviews = await Review.find({ organiser: req.params.organiserId, isHidden: false })
    .populate('reviewer', 'name username avatar')
    .populate('tournament', 'title sport')
    .sort('-createdAt')
    .limit(20);

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
}));

// @desc    Get reviews for a tournament
// @route   GET /api/v1/reviews/tournament/:tournamentId
router.get('/tournament/:tournamentId', asyncHandler(async (req, res, next) => {
  const reviews = await Review.find({ tournament: req.params.tournamentId, isHidden: false })
    .populate('reviewer', 'name username avatar')
    .sort('-createdAt');

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
}));

module.exports = router;
