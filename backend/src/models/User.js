const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const sportProfileSchema = new mongoose.Schema({
  sport: { type: String, required: true },
  position: String,         // Football: striker, Cricket: batsman, etc.
  battingStyle: String,     // Cricket specific
  bowlingStyle: String,     // Cricket specific
  preferredFoot: String,    // Football specific
  yearsOfExperience: Number,
  achievements: [String],
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._]{3,30}$/, 'Username can only contain letters, numbers, dots and underscores'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['player', 'organiser', 'admin'],
    default: 'player',
  },

  // Profile
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  bio: { type: String, maxlength: [300, 'Bio cannot exceed 300 characters'] },
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  phone: String,
  city: String,
  state: String,
  country: { type: String, default: 'India' },

  // Sport profiles (players can have multiple sports)
  sportProfiles: [sportProfileSchema],

  // Social - Instagram style
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },

  // Organiser specific
  organiserProfile: {
    organizationName: String,
    organizationLogo: String,
    website: String,
    description: String,
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    tournamentsOrganised: { type: Number, default: 0 },
  },

  // Wallet for refunds
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['credit', 'debit'] },
      amount: Number,
      description: String,
      reference: String,
      createdAt: { type: Date, default: Date.now },
    }],
  },

  // Notifications
  notifications: [{
    title: String,
    message: String,
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'payment', 'tournament', 'follow'],
    },
    isRead: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now },
  }],
  unreadNotificationsCount: { type: Number, default: 0 },

  // Account status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance (username & email indexed via unique:true above)
userSchema.index({ role: 1 });
userSchema.index({ city: 1, state: 1 });

// Virtual: profile URL
userSchema.virtual('profileUrl').get(function () {
  return `/u/${this.username}`;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  return token;
};

// Add notification
userSchema.methods.addNotification = async function (notification) {
  this.notifications.unshift(notification);
  if (this.notifications.length > 100) this.notifications = this.notifications.slice(0, 100);
  this.unreadNotificationsCount += 1;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
