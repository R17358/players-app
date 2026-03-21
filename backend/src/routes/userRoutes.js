const express = require('express');
const router = express.Router();
const {
  getUserProfile, toggleFollow, getFollowers, getFollowing,
  searchUsers, getNotifications, markNotificationsRead,
  getWallet, getUserTournaments, getLeaderboard, getSuggestions,
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public
router.get('/search', searchUsers);
router.get('/leaderboard', getLeaderboard);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);
router.get('/:id/tournaments', getUserTournaments);

// Private
router.get('/me/notifications', protect, getNotifications);
router.put('/me/notifications/read', protect, markNotificationsRead);
router.get('/me/wallet', protect, getWallet);
router.get('/me/suggestions', protect, getSuggestions);
router.post('/:id/follow', protect, toggleFollow);

// Must be last to avoid conflicts
router.get('/:username', optionalAuth, getUserProfile);

module.exports = router;
