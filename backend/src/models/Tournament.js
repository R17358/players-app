const mongoose = require('mongoose');
const slugify = require('slugify');

const matchSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  matchNumber: Number,
  team1: {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for individual sport
    score: { type: Number, default: 0 },
  },
  team2: {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    score: { type: Number, default: 0 },
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  winnerPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  scheduledAt: Date,
  completedAt: Date,
  venue: String,
  notes: String,
  liveScore: String, // e.g. "45-32 (3rd Quarter)"
});

const tournamentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tournament title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  slug: { type: String, unique: true },
  organiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Sport details
  sport: {
    type: String,
    required: [true, 'Sport name is required'],
    enum: [
      'cricket', 'football', 'basketball', 'badminton', 'tennis',
      'volleyball', 'kabaddi', 'kho-kho', 'table-tennis', 'chess',
      'swimming', 'athletics', 'boxing', 'wrestling', 'archery', 'other'
    ],
  },
  sportCategory: {
    type: String,
    enum: ['individual', 'team'],
    required: true,
  },

  // Format
  tournamentFormat: {
    type: String,
    enum: ['knockout', 'round-robin', 'league', 'double-elimination', 'swiss'],
    default: 'knockout',
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'mixed', 'open'],
    default: 'open',
  },
  ageGroup: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    label: String, // e.g. "Under 18", "Open"
  },

  // Participants
  isTeamBased: { type: Boolean, default: false },
  maxParticipants: { type: Number, required: [true, 'Max participants required'] },
  minParticipants: { type: Number, default: 2 },
  currentParticipants: { type: Number, default: 0 },
  playersPerTeam: Number, // for team sports
  maxTeams: Number,

  // Schedule
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required'],
  },
  tournamentStartDate: {
    type: Date,
    required: [true, 'Tournament start date is required'],
  },
  tournamentEndDate: Date,

  // Location
  locationType: {
    type: String,
    enum: ['physical', 'online'],
    default: 'physical',
  },
  location: {
    venue: String,
    address: String,
    city: { type: String, required: true },
    state: String,
    pincode: String,
    googleMapsLink: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },

  // Financial
  registrationFee: { type: Number, default: 0, min: 0 }, // 0 = free
  isFree: { type: Boolean, default: false },
  prizes: {
    first: { amount: Number, description: String },
    second: { amount: Number, description: String },
    third: { amount: Number, description: String },
    special: [{ title: String, amount: Number, description: String }],
    totalPrizePool: Number,
    currency: { type: String, default: 'INR' },
  },
  sponsorLogos: [{ name: String, logoUrl: String, website: String }],

  // Media
  banner: {
    url: { type: String, default: '' },
    publicId: String,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  rules: [String],
  highlights: [String], // Key feature bullets

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'],
    default: 'draft',
  },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,

  // Admin
  adminApproved: { type: Boolean, default: false },
  adminApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminApprovedAt: Date,
  adminNotes: String,
  isFeatured: { type: Boolean, default: false },

  // Matches (bracket)
  matches: [matchSchema],
  currentRound: { type: Number, default: 1 },
  totalRounds: Number,

  // Registrations reference
  registrationsCount: { type: Number, default: 0 },

  // Engagement
  views: { type: Number, default: 0 },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarksCount: { type: Number, default: 0 },

  // Results
  results: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    runnerUp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    runnerUpTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    summary: String,
    highlightVideoUrl: String,
    photos: [String],
  },

  tags: [String],

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes (slug indexed via unique:true above)
tournamentSchema.index({ sport: 1, status: 1 });
tournamentSchema.index({ organiser: 1 });
tournamentSchema.index({ 'location.city': 1 });
tournamentSchema.index({ tournamentStartDate: 1 });
tournamentSchema.index({ isFeatured: 1, status: 1 });

// Generate slug before saving
tournamentSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();
  this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  next();
});

// Virtual: is registration open
tournamentSchema.virtual('isRegistrationOpen').get(function () {
  return (
    this.status === 'registration_open' &&
    new Date() < this.registrationDeadline &&
    this.currentParticipants < this.maxParticipants
  );
});

// Virtual: spots left
tournamentSchema.virtual('spotsLeft').get(function () {
  return this.maxParticipants - this.currentParticipants;
});

module.exports = mongoose.model('Tournament', tournamentSchema);
