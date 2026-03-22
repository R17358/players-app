const express = require('express');
const router = express.Router();
const {
  createTournament, getTournaments, getTournament, updateTournament,
  deleteTournament, publishTournament, cancelTournament, uploadBanner,
  toggleBookmark, getTournamentRegistrations, generateBracket,
  updateMatchResult, declareTournamentResults, getMyTournaments,
  getUpcomingTournaments,
} = require('../controllers/tournamentController');
const { protect, optionalAuth, verifiedOrganiser } = require('../middleware/auth');
const { uploadTournament } = require('../config/cloudinary');

// ─── IMPORTANT: Static routes MUST come before /:slugOrId ───────────────────
// Otherwise Express matches "upcoming", "my" etc as a slug value

// Public static
router.get('/',         getTournaments);
router.get('/upcoming', getUpcomingTournaments);

// Organiser static (BEFORE /:slugOrId)
router.get('/my',         protect, verifiedOrganiser, getMyTournaments);
router.post('/',          protect, verifiedOrganiser, createTournament);

// Dynamic param - comes AFTER all static routes
router.get('/:slugOrId',  optionalAuth, getTournament);

// Private
router.post('/:id/bookmark',           protect,             toggleBookmark);
router.put( '/:id',                    protect, verifiedOrganiser, updateTournament);
router.delete('/:id',                  protect, verifiedOrganiser, deleteTournament);
router.put( '/:id/publish',            protect, verifiedOrganiser, publishTournament);
router.put( '/:id/cancel',             protect, verifiedOrganiser, cancelTournament);
router.put( '/:id/banner',             protect, verifiedOrganiser, uploadTournament.single('banner'), uploadBanner);
router.get( '/:id/registrations',      protect, verifiedOrganiser, getTournamentRegistrations);
router.post('/:id/generate-bracket',   protect, verifiedOrganiser, generateBracket);
router.put( '/:id/matches/:matchIndex',protect, verifiedOrganiser, updateMatchResult);
router.put( '/:id/results',            protect, verifiedOrganiser, declareTournamentResults);

module.exports = router;
