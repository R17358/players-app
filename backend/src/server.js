require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const initCronJobs = require('./utils/cronJobs');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const postRoutes = require('./routes/postRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const teamRoutes   = require('./routes/teamRoutes');
const chatRoutes   = require('./routes/chatRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// ─── Middleware ───────────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting
const isDev = process.env.NODE_ENV !== 'production';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 300,           // much higher in dev
  skip: (req) => {
    // Skip rate limiting for localhost in development
    const ip = req.ip || req.connection.remoteAddress;
    return isDev && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1');
  },
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 15,             // relaxed in dev
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    return isDev && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1');
  },
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// MongoDB injection sanitization
app.use(mongoSanitize());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ──────────────────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/tournaments`, tournamentRoutes);
app.use(`${API}/registrations`, registrationRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/posts`, postRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/teams`,   teamRoutes);
app.use(`${API}/chat`,    chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SportVibe API is running 🏆',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler (must be last)
app.use(errorHandler);

// ─── Socket.IO (Real-time live scores) ───────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join tournament room for live updates
  socket.on('join_tournament', (tournamentId) => {
    socket.join(`tournament_${tournamentId}`);
  });
  socket.on('leave_tournament', (tournamentId) => {
    socket.leave(`tournament_${tournamentId}`);
  });

  // Join personal user room (for chat notifications)
  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
  });

  // Join a chat conversation room
  socket.on('join_chat', (conversationId) => {
    socket.join(`chat_${conversationId}`);
  });
  socket.on('leave_chat', (conversationId) => {
    socket.leave(`chat_${conversationId}`);
  });

  // Typing indicator
  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(`chat_${conversationId}`).emit('user_typing', { userId });
  });
  socket.on('stop_typing', ({ conversationId, userId }) => {
    socket.to(`chat_${conversationId}`).emit('user_stop_typing', { userId });
  });

  // Organiser updates live score → broadcast to all in room
  socket.on('live_score_update', (data) => {
    const { tournamentId, matchIndex, liveScore, team1Score, team2Score } = data;
    io.to(`tournament_${tournamentId}`).emit('score_updated', {
      matchIndex, liveScore, team1Score, team2Score,
    });
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Expose io for use in controllers
app.set('io', io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 SportVibe server running on port ${PORT} [${process.env.NODE_ENV}]`);

  // Init cron jobs
  if (process.env.NODE_ENV !== 'test') {
    initCronJobs();
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
