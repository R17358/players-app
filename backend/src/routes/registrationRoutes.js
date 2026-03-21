const express = require('express');
const router = express.Router();
const {
  initiateRegistration, verifyPayment, cancelRegistration,
  getMyRegistrations, getRegistration,
} = require('../controllers/registrationController');
const { protect } = require('../middleware/auth');

router.post('/initiate', protect, initiateRegistration);
router.post('/verify-payment', protect, verifyPayment);
router.get('/my', protect, getMyRegistrations);
router.get('/:id', protect, getRegistration);
router.put('/:id/cancel', protect, cancelRegistration);

module.exports = router;
