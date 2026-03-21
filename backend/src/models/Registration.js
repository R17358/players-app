const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  },

  // Registration details
  registrationNumber: {
    type: String,
    unique: true,
  },
  registrationType: {
    type: String,
    enum: ['individual', 'team'],
    default: 'individual',
  },

  // Player info at time of registration (snapshot)
  playerSnapshot: {
    name: String,
    username: String,
    email: String,
    phone: String,
    city: String,
    dateOfBirth: Date,
    gender: String,
  },

  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relation: String,
  },

  // Sport-specific info
  sportInfo: {
    position: String,
    jerseyNumber: Number,
    experience: String,
    specialization: String,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'payment_pending', 'confirmed', 'waitlisted', 'cancelled', 'disqualified'],
    default: 'pending',
  },

  // Payment
  payment: {
    amount: Number,
    currency: { type: String, default: 'INR' },
    method: String,
    status: {
      type: String,
      enum: ['free', 'pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number,
    refundReason: String,
    receipt: String,
  },

  // Tournament performance
  performance: {
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    rank: Number,
    isEliminated: { type: Boolean, default: false },
    eliminatedInRound: Number,
  },

  // Certificate
  certificate: {
    issued: { type: Boolean, default: false },
    url: String,
    issuedAt: Date,
    type: String, // 'winner', 'runner-up', 'participant'
  },

  // Misc
  notes: String,
  agreedToRules: { type: Boolean, default: false },
  agreedAt: Date,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes (registrationNumber indexed via unique:true above)
registrationSchema.index({ tournament: 1, player: 1 }, { unique: true });
registrationSchema.index({ player: 1, status: 1 });
registrationSchema.index({ tournament: 1, status: 1 });

// Auto-generate registration number
registrationSchema.pre('save', async function (next) {
  if (this.registrationNumber) return next();
  const count = await mongoose.model('Registration').countDocuments();
  this.registrationNumber = `SV${Date.now()}${(count + 1).toString().padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Registration', registrationSchema);
