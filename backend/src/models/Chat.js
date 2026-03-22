const mongoose = require('mongoose');

// A conversation between 2 users
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: {
    text:      String,
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date,
    isRead:    { type: Boolean, default: false },
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// A single message inside a conversation
const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:         { type: String, maxlength: 2000 },
  media:        { url: String, type: { type: String, enum: ['image', 'file'] } },
  isRead:       { type: Boolean, default: false },
  readAt:       Date,
  isDeleted:    { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
const Message      = mongoose.model('Message', messageSchema);

module.exports = { Conversation, Message };
