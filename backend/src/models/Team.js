const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters'],
  },
  logo: {
    url: { type: String, default: '' },
    publicId: String,
  },
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['captain', 'vice-captain', 'player', 'substitute'], default: 'player' },
    jerseyNumber: Number,
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'invited', 'left'], default: 'invited' },
  }],
  sport: { type: String, required: true },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  },
  city: String,
  state: String,
  description: String,
  isActive: { type: Boolean, default: true },

  stats: {
    tournamentsPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
  },

}, { timestamps: true });

teamSchema.index({ captain: 1 });
teamSchema.index({ tournament: 1 });

module.exports = mongoose.model('Team', teamSchema);
