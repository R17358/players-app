const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  organiser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    maxlength: [100, 'Review title cannot exceed 100 characters'],
  },
  comment: {
    type: String,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  categories: {
    organization: { type: Number, min: 1, max: 5 },
    fairplay: { type: Number, min: 1, max: 5 },
    infrastructure: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
  },
  isVerifiedParticipant: { type: Boolean, default: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isHidden: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// One review per user per tournament
reviewSchema.index({ tournament: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ organiser: 1, rating: 1 });

// Update organiser's average rating after review
reviewSchema.post('save', async function () {
  const Review = mongoose.model('Review');
  const User = mongoose.model('User');

  const stats = await Review.aggregate([
    { $match: { organiser: this.organiser, isHidden: false } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(this.organiser, {
      'organiserProfile.rating': Math.round(stats[0].avgRating * 10) / 10,
      'organiserProfile.totalReviews': stats[0].count,
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
