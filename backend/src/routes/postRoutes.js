const express = require('express');
const router = express.Router();
const {
  createPost, getFeed, getExploreFeed,
  getUserPosts, toggleLike, addComment, deletePost,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/explore', optionalAuth, getExploreFeed);
router.get('/feed', protect, getFeed);
router.get('/user/:userId', getUserPosts);
router.post('/', protect, createPost);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;
