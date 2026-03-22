const { Conversation, Message } = require('../models/Chat');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get or create conversation with a user
// @route   POST /api/v1/chat/conversations
exports.getOrCreateConversation = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return next(new ErrorResponse('userId is required', 400));
  if (userId === req.user.id) return next(new ErrorResponse('Cannot message yourself', 400));

  const other = await User.findById(userId);
  if (!other) return next(new ErrorResponse('User not found', 404));

  // Find existing conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user.id, userId], $size: 2 },
  }).populate('participants', 'name username avatar role organiserProfile.isVerified');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user.id, userId],
      unreadCount: { [req.user.id]: 0, [userId]: 0 },
    });
    await conversation.populate('participants', 'name username avatar role organiserProfile.isVerified');
  }

  res.status(200).json({ success: true, data: conversation });
});

// @desc    Get all my conversations
// @route   GET /api/v1/chat/conversations
exports.getConversations = asyncHandler(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user.id,
  })
    .populate('participants', 'name username avatar role isActive')
    .populate('lastMessage.sender', 'name username')
    .sort({ updatedAt: -1 })
    .limit(50);

  // Add unread count for current user
  const withUnread = conversations.map(c => {
    const unread = c.unreadCount?.get?.(req.user.id) || 0;
    return { ...c.toObject(), myUnread: unread };
  });

  res.status(200).json({ success: true, data: withUnread });
});

// @desc    Get messages in a conversation
// @route   GET /api/v1/chat/conversations/:id/messages
exports.getMessages = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return next(new ErrorResponse('Conversation not found', 404));

  // Must be a participant
  if (!conversation.participants.includes(req.user.id)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const page  = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 40;
  const skip  = (page - 1) * limit;

  const messages = await Message.find({
    conversation: req.params.id,
    isDeleted: false,
  })
    .populate('sender', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Mark messages as read
  await Message.updateMany(
    { conversation: req.params.id, sender: { $ne: req.user.id }, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  // Reset unread count for this user
  await Conversation.findByIdAndUpdate(req.params.id, {
    [`unreadCount.${req.user.id}`]: 0,
  });

  res.status(200).json({
    success: true,
    data: messages.reverse(), // oldest first
    page,
  });
});

// @desc    Send a message
// @route   POST /api/v1/chat/conversations/:id/messages
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  if (!text?.trim()) return next(new ErrorResponse('Message text is required', 400));

  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return next(new ErrorResponse('Conversation not found', 404));

  if (!conversation.participants.map(String).includes(req.user.id)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const message = await Message.create({
    conversation: req.params.id,
    sender: req.user.id,
    text: text.trim(),
  });

  await message.populate('sender', 'name username avatar');

  // Update conversation last message + increment unread for other participant
  const otherId = conversation.participants.find(p => p.toString() !== req.user.id);

  await Conversation.findByIdAndUpdate(req.params.id, {
    lastMessage: {
      text:      text.trim().slice(0, 60),
      sender:    req.user.id,
      createdAt: new Date(),
      isRead:    false,
    },
    $inc: { [`unreadCount.${otherId}`]: 1 },
    updatedAt: new Date(),
  });

  // Emit via Socket.IO if available
  const io = req.app.get('io');
  if (io) {
    io.to(`chat_${req.params.id}`).emit('new_message', message);
    io.to(`user_${otherId}`).emit('conversation_updated', {
      conversationId: req.params.id,
      lastMessage: { text: text.trim(), sender: req.user.id },
    });
  }

  res.status(201).json({ success: true, data: message });
});

// @desc    Delete a message (soft delete)
// @route   DELETE /api/v1/chat/messages/:id
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(new ErrorResponse('Message not found', 404));
  if (message.sender.toString() !== req.user.id) return next(new ErrorResponse('Not authorized', 403));

  message.isDeleted = true;
  message.text = 'This message was deleted';
  await message.save();

  res.status(200).json({ success: true, message: 'Message deleted' });
});

// @desc    Get total unread count across all conversations
// @route   GET /api/v1/chat/unread
exports.getTotalUnread = asyncHandler(async (req, res, next) => {
  const conversations = await Conversation.find({ participants: req.user.id });
  const total = conversations.reduce((sum, c) => sum + (c.unreadCount?.get?.(req.user.id) || 0), 0);
  res.status(200).json({ success: true, data: { total } });
});
