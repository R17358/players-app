const Post = require('../models/Post');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create post
// @route   POST /api/v1/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  const { content, postType, tournament, tags, mentions } = req.body;

  if (!content && (!req.files || req.files.length === 0)) {
    return next(new ErrorResponse('Post must have content or media', 400));
  }

  const media = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename, type: 'image' }))
    : [];

  const post = await Post.create({
    author: req.user.id,
    content,
    media,
    postType: postType || 'regular',
    tournament,
    tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    mentions,
  });

  await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: 1 } });

  await post.populate('author', 'name username avatar role organiserProfile.isVerified');

  res.status(201).json({ success: true, data: post });
});

// @desc    Get feed (posts from following)
// @route   GET /api/v1/posts/feed
// @access  Private
exports.getFeed = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id).select('following');
  const feedIds = [...currentUser.following, req.user.id];

  const { page = 1, limit = 10 } = req.query;

  const posts = await Post.find({ author: { $in: feedIds }, isArchived: false })
    .populate('author', 'name username avatar role organiserProfile.isVerified')
    .populate('tournament', 'title sport slug')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Get explore feed (all users, trending)
// @route   GET /api/v1/posts/explore
// @access  Public
exports.getExploreFeed = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 12, postType } = req.query;
  const query = { isArchived: false };
  if (postType) query.postType = postType;

  const posts = await Post.find(query)
    .populate('author', 'name username avatar role organiserProfile.isVerified')
    .populate('tournament', 'title sport slug')
    .sort({ likesCount: -1, createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Get user posts
// @route   GET /api/v1/posts/user/:userId
// @access  Public
exports.getUserPosts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 12 } = req.query;

  const posts = await Post.find({ author: req.params.userId, isArchived: false })
    .populate('author', 'name username avatar')
    .sort('-createdAt')
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Like / unlike post
// @route   POST /api/v1/posts/:id/like
// @access  Private
exports.toggleLike = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new ErrorResponse('Post not found', 404));

  const liked = post.likes.some((id) => id.toString() === req.user.id);

  if (liked) {
    await Post.findByIdAndUpdate(req.params.id, {
      $pull: { likes: req.user.id },
      $inc: { likesCount: -1 },
    });
    return res.status(200).json({ success: true, liked: false });
  } else {
    await Post.findByIdAndUpdate(req.params.id, {
      $addToSet: { likes: req.user.id },
      $inc: { likesCount: 1 },
    });
    return res.status(200).json({ success: true, liked: true });
  }
});

// @desc    Add comment
// @route   POST /api/v1/posts/:id/comment
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  if (!text) return next(new ErrorResponse('Comment text required', 400));

  const post = await Post.findByIdAndUpdate(
    req.params.id,
    {
      $push: { comments: { user: req.user.id, text } },
      $inc: { commentsCount: 1 },
    },
    { new: true }
  ).populate('comments.user', 'name username avatar');

  if (!post) return next(new ErrorResponse('Post not found', 404));

  const newComment = post.comments[post.comments.length - 1];
  res.status(201).json({ success: true, data: newComment });
});

// @desc    Delete post
// @route   DELETE /api/v1/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) return next(new ErrorResponse('Post not found', 404));

  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized', 403));
  }

  await post.deleteOne();
  await User.findByIdAndUpdate(req.user.id, { $inc: { postsCount: -1 } });

  res.status(200).json({ success: true, message: 'Post deleted' });
});
