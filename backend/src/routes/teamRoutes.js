const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { protect } = require('../middleware/auth');

// @desc    Create team for a tournament
// @route   POST /api/v1/teams
router.post('/', protect, asyncHandler(async (req, res, next) => {
  const { name, sport, tournamentId, description, city, state } = req.body;

  const team = await Team.create({
    name,
    sport,
    tournament: tournamentId,
    captain: req.user.id,
    description,
    city,
    state,
    members: [{ user: req.user.id, role: 'captain', status: 'active' }],
  });

  res.status(201).json({ success: true, data: team });
}));

// @desc    Get team details
// @route   GET /api/v1/teams/:id
router.get('/:id', asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id)
    .populate('captain', 'name username avatar')
    .populate('members.user', 'name username avatar city');

  if (!team) return next(new ErrorResponse('Team not found', 404));
  res.status(200).json({ success: true, data: team });
}));

// @desc    Invite player to team
// @route   POST /api/v1/teams/:id/invite
router.post('/:id/invite', protect, asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);
  if (!team) return next(new ErrorResponse('Team not found', 404));

  if (team.captain.toString() !== req.user.id) {
    return next(new ErrorResponse('Only captain can invite players', 403));
  }

  const { userId, jerseyNumber } = req.body;
  const alreadyMember = team.members.some((m) => m.user.toString() === userId);
  if (alreadyMember) return next(new ErrorResponse('Player already in team', 400));

  team.members.push({ user: userId, role: 'player', jerseyNumber, status: 'invited' });
  await team.save();

  res.status(200).json({ success: true, message: 'Player invited to team', data: team });
}));

// @desc    Accept team invite
// @route   PUT /api/v1/teams/:id/accept
router.put('/:id/accept', protect, asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);
  if (!team) return next(new ErrorResponse('Team not found', 404));

  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === req.user.id && m.status === 'invited'
  );

  if (memberIndex === -1) return next(new ErrorResponse('No pending invite found', 404));

  team.members[memberIndex].status = 'active';
  await team.save();

  res.status(200).json({ success: true, message: 'Joined team!', data: team });
}));

// @desc    Leave team
// @route   DELETE /api/v1/teams/:id/leave
router.delete('/:id/leave', protect, asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);
  if (!team) return next(new ErrorResponse('Team not found', 404));

  if (team.captain.toString() === req.user.id) {
    return next(new ErrorResponse('Captain cannot leave. Transfer captaincy first.', 400));
  }

  team.members = team.members.filter((m) => m.user.toString() !== req.user.id);
  await team.save();

  res.status(200).json({ success: true, message: 'Left team' });
}));

// @desc    Get my teams
// @route   GET /api/v1/teams/my
router.get('/me/my', protect, asyncHandler(async (req, res, next) => {
  const teams = await Team.find({
    'members.user': req.user.id,
    'members.status': 'active',
  })
    .populate('captain', 'name username avatar')
    .populate('tournament', 'title sport status');

  res.status(200).json({ success: true, count: teams.length, data: teams });
}));

module.exports = router;
