const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getPendingTournaments, approveTournament,
  rejectTournament, toggleFeatureTournament, getAllUsers,
  updateUser, verifyOrganiser, deleteUser,
  getAllRegistrations, sendAnnouncement,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes protected
router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/tournaments/pending', getPendingTournaments);
router.put('/tournaments/:id/approve', approveTournament);
router.put('/tournaments/:id/reject', rejectTournament);
router.put('/tournaments/:id/feature', toggleFeatureTournament);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/verify-organiser', verifyOrganiser);
router.delete('/users/:id', deleteUser);
router.get('/registrations', getAllRegistrations);
router.post('/announce', sendAnnouncement);

module.exports = router;
