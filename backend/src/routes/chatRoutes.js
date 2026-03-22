const express = require('express');
const router  = express.Router();
const {
  getOrCreateConversation, getConversations,
  getMessages, sendMessage, deleteMessage, getTotalUnread,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect); // all chat routes require auth

router.get('/unread',                          getTotalUnread);
router.get('/conversations',                   getConversations);
router.post('/conversations',                  getOrCreateConversation);
router.get('/conversations/:id/messages',      getMessages);
router.post('/conversations/:id/messages',     sendMessage);
router.delete('/messages/:id',                 deleteMessage);

module.exports = router;
