const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    maxlength: [2200, 'Post content cannot exceed 2200 characters'],
  },
  media: [{
    url: String,
    publicId: String,
    type: { type: String, enum: ['image', 'video'] },
  }],
  postType: {
    type: String,
    enum: ['regular', 'tournament_announcement', 'achievement', 'result'],
    default: 'regular',
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  },
  tags: [String],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
  }],
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
}, {
  timestamps: true,
});

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tournament: 1 });

module.exports = mongoose.model('Post', postSchema);
