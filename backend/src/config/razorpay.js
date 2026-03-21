const Razorpay = require('razorpay');

// Lazy singleton — initialized on first use so missing env vars at import time don't crash
let _razorpay = null;

const getRazorpay = () => {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

module.exports = getRazorpay;
