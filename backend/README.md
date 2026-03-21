# 🏆 SportVibe Backend

A full-featured sports tournament management platform API built with **Node.js, Express, MongoDB (MERN)**.

---

## 🚀 Features

### Core
- **JWT Authentication** with refresh via cookies
- **3 Roles**: Player, Organiser, Admin
- **Social Layer**: Follow/Unfollow, Posts, Feed (Instagram-style profiles)
- **Tournament Management**: Full lifecycle (draft → published → registration → ongoing → completed)
- **Payment Gateway**: Razorpay integration with wallet refund system
- **Real-time**: Socket.IO for live match score updates
- **Notifications**: In-app + Email notifications
- **File Uploads**: Cloudinary (avatars, banners, certificates)

### Enhanced Features
- Bracket/Schedule generation (Knockout & Round-Robin)
- Team-based tournaments support
- Age group & gender filtering
- Organiser verification + rating system
- Admin announcement system
- Automated cron jobs (reminder emails, deadline enforcement, cleanup)
- Player stats & leaderboards
- Tournament bookmarks
- 80% refund on player cancellation (24hr before)
- Full refund on organiser cancellation
- Sport-specific player profiles

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Payment | Razorpay |
| Storage | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| Real-time | Socket.IO |
| Scheduling | node-cron |
| Logging | Winston |
| Security | Helmet, express-rate-limit, mongo-sanitize |

---

## 📁 Project Structure

```
sportvibe-backend/
├── src/
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   ├── cloudinary.js      # Cloudinary + multer setup
│   │   └── razorpay.js        # Razorpay instance
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── tournamentController.js
│   │   ├── registrationController.js
│   │   ├── adminController.js
│   │   └── postController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT protect, role authorize
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js            # Player/Organiser/Admin
│   │   ├── Tournament.js      # Full tournament schema
│   │   ├── Registration.js    # Registration + payment
│   │   ├── Team.js            # Team-based sports
│   │   ├── Review.js          # Organiser reviews
│   │   └── Post.js            # Social feed posts
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── tournamentRoutes.js
│   │   ├── registrationRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── postRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── teamRoutes.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── errorResponse.js
│   │   ├── emailService.js    # Templates + sender
│   │   ├── cronJobs.js        # Scheduled tasks
│   │   ├── logger.js          # Winston logger
│   │   └── seeder.js          # DB seeder
│   └── server.js              # Entry point
├── logs/                      # Auto-created
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Seed admin user
```bash
npm run seed
```

### 4. Start server
```bash
npm run dev        # Development (nodemon)
npm start          # Production
```

---

## 🔐 Authentication

All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api/v1`

---

### 🔑 Auth Routes `/auth`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login (email or username) |
| POST | `/auth/logout` | Private | Logout |
| GET | `/auth/me` | Private | Get current user |
| PUT | `/auth/updateprofile` | Private | Update profile info |
| PUT | `/auth/avatar` | Private | Upload avatar |
| PUT | `/auth/updatepassword` | Private | Change password |
| POST | `/auth/forgotpassword` | Public | Send reset email |
| PUT | `/auth/resetpassword/:token` | Public | Reset password |

**Register Body:**
```json
{
  "name": "Rahul Sharma",
  "username": "rahul_sports",
  "email": "rahul@example.com",
  "password": "Rahul@1234",
  "role": "player",
  "phone": "9876543210",
  "city": "Pune",
  "state": "Maharashtra"
}
```

**Login Body:**
```json
{
  "emailOrUsername": "rahul@example.com",
  "password": "Rahul@1234"
}
```

---

### 👥 User Routes `/users`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users/search?q=rahul` | Public | Search users |
| GET | `/users/leaderboard?sport=cricket` | Public | Get leaderboard |
| GET | `/users/me/suggestions` | Private | Suggested users to follow |
| GET | `/users/me/notifications` | Private | Get notifications |
| PUT | `/users/me/notifications/read` | Private | Mark all as read |
| GET | `/users/me/wallet` | Private | Wallet balance + history |
| POST | `/users/:id/follow` | Private | Follow/Unfollow toggle |
| GET | `/users/:id/followers` | Public | Get followers |
| GET | `/users/:id/following` | Public | Get following |
| GET | `/users/:id/tournaments` | Public | User's tournament history |
| GET | `/users/:username` | Public | User profile |

---

### 🏟️ Tournament Routes `/tournaments`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/tournaments` | Public | Get all (with filters) |
| GET | `/tournaments/upcoming` | Public | Upcoming tournaments |
| GET | `/tournaments/:slugOrId` | Public | Single tournament |
| POST | `/tournaments` | Organiser | Create tournament |
| PUT | `/tournaments/:id` | Organiser | Update tournament |
| DELETE | `/tournaments/:id` | Organiser | Delete tournament |
| PUT | `/tournaments/:id/publish` | Organiser | Submit for approval |
| PUT | `/tournaments/:id/cancel` | Organiser | Cancel (auto-refund) |
| PUT | `/tournaments/:id/banner` | Organiser | Upload banner |
| GET | `/tournaments/:id/registrations` | Organiser | View registrations |
| POST | `/tournaments/:id/generate-bracket` | Organiser | Generate schedule |
| PUT | `/tournaments/:id/matches/:index` | Organiser | Update match result |
| PUT | `/tournaments/:id/results` | Organiser | Declare final results |
| POST | `/tournaments/:id/bookmark` | Private | Bookmark toggle |
| GET | `/tournaments/organiser/my-tournaments` | Organiser | My tournaments |

**Tournament Filters:**
```
GET /tournaments?sport=cricket&city=Mumbai&status=registration_open&isFree=false&page=1&limit=12
```

**Create Tournament Body:**
```json
{
  "title": "Mumbai Premier Cricket League 2025",
  "sport": "cricket",
  "sportCategory": "team",
  "tournamentFormat": "knockout",
  "gender": "male",
  "isTeamBased": true,
  "playersPerTeam": 11,
  "maxTeams": 16,
  "maxParticipants": 176,
  "registrationDeadline": "2025-10-01T23:59:00Z",
  "tournamentStartDate": "2025-10-10T09:00:00Z",
  "tournamentEndDate": "2025-10-20T18:00:00Z",
  "locationType": "physical",
  "location": {
    "venue": "Wankhede Stadium",
    "address": "D Rd, Churchgate",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400020"
  },
  "registrationFee": 500,
  "prizes": {
    "first": { "amount": 50000, "description": "Trophy + Certificate" },
    "second": { "amount": 25000, "description": "Trophy + Certificate" },
    "third": { "amount": 10000, "description": "Certificate" }
  },
  "description": "The biggest cricket league in Mumbai...",
  "rules": ["No sledging", "Umpire decision is final"],
  "ageGroup": { "min": 18, "max": 35, "label": "Open (18-35)" },
  "tags": ["cricket", "mumbai", "t20"]
}
```

---

### 💳 Registration Routes `/registrations`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/registrations/initiate` | Private | Register + create payment order |
| POST | `/registrations/verify-payment` | Private | Verify Razorpay payment |
| GET | `/registrations/my` | Private | My registrations |
| GET | `/registrations/:id` | Private | Single registration |
| PUT | `/registrations/:id/cancel` | Private | Cancel (80% refund to wallet) |

**Initiate Registration Body:**
```json
{
  "tournamentId": "6507f1f77bcf86cd799439011",
  "emergencyContact": {
    "name": "Mom",
    "phone": "9876543210",
    "relation": "Mother"
  },
  "sportInfo": {
    "position": "Batsman",
    "jerseyNumber": 18,
    "experience": "5 years"
  },
  "agreedToRules": true,
  "useWallet": false
}
```

**Payment Flow:**
1. `POST /registrations/initiate` → Returns Razorpay order
2. Frontend handles Razorpay checkout
3. `POST /registrations/verify-payment` → Confirms registration

**Verify Payment Body:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "sig_xxx",
  "registrationId": "mongo_id"
}
```

---

### 🛡️ Admin Routes `/admin`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/admin/stats` | Admin | Dashboard stats |
| GET | `/admin/tournaments/pending` | Admin | Pending approvals |
| PUT | `/admin/tournaments/:id/approve` | Admin | Approve tournament |
| PUT | `/admin/tournaments/:id/reject` | Admin | Reject with reason |
| PUT | `/admin/tournaments/:id/feature` | Admin | Feature/unfeature |
| GET | `/admin/users` | Admin | All users |
| PUT | `/admin/users/:id` | Admin | Update user (ban/role) |
| PUT | `/admin/users/:id/verify-organiser` | Admin | Verify organiser |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/admin/registrations` | Admin | All registrations |
| POST | `/admin/announce` | Admin | Send announcement |

---

### 📝 Post Routes `/posts`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/posts/explore` | Public | Trending posts |
| GET | `/posts/feed` | Private | Following feed |
| GET | `/posts/user/:userId` | Public | User's posts |
| POST | `/posts` | Private | Create post |
| POST | `/posts/:id/like` | Private | Like/Unlike |
| POST | `/posts/:id/comment` | Private | Add comment |
| DELETE | `/posts/:id` | Private | Delete post |

---

### ⭐ Review Routes `/reviews`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/reviews` | Private (participant) | Review organiser after tournament |
| GET | `/reviews/organiser/:id` | Public | Organiser's reviews |
| GET | `/reviews/tournament/:id` | Public | Tournament's reviews |

---

### 👥 Team Routes `/teams`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/teams` | Private | Create team |
| GET | `/teams/me/my` | Private | My teams |
| GET | `/teams/:id` | Public | Team details |
| POST | `/teams/:id/invite` | Private (captain) | Invite player |
| PUT | `/teams/:id/accept` | Private | Accept invite |
| DELETE | `/teams/:id/leave` | Private | Leave team |

---

## 🔌 Socket.IO Events

Connect to: `ws://localhost:5000`

```javascript
// Join a tournament room for live score updates
socket.emit('join_tournament', tournamentId);

// Organiser broadcasts live score
socket.emit('live_score_update', {
  tournamentId: 'xxx',
  matchIndex: 0,
  liveScore: '45/3 (12.4 overs)',
  team1Score: 45,
  team2Score: 0
});

// All clients in room receive
socket.on('score_updated', (data) => {
  console.log(data); // { matchIndex, liveScore, team1Score, team2Score }
});
```

---

## ⏰ Cron Jobs

| Schedule | Task |
|----------|------|
| Every hour | Close registration for passed deadlines |
| Daily 9 AM | Send match-day reminder emails |
| Daily midnight | Cleanup expired pending registrations |

---

## 🌐 Sports Supported

`cricket`, `football`, `basketball`, `badminton`, `tennis`, `volleyball`, `kabaddi`, `kho-kho`, `table-tennis`, `chess`, `swimming`, `athletics`, `boxing`, `wrestling`, `archery`, `other`

---

## 🔒 Security

- JWT with httpOnly cookies
- bcrypt password hashing (12 rounds)
- Rate limiting (200 req/15min, 10 auth req/15min)
- MongoDB injection sanitization
- Helmet security headers
- Role-based access control

---

## 📧 Email Templates

- Welcome email on register
- Registration confirmation with registration number
- Tournament reminder (day before)
- Password reset
- Refund processed notification
- Organiser approval/rejection
- Account suspension notice

---

## 🧪 Sample Test Flow

1. Register as organiser → `POST /auth/register` (role: organiser)
2. Admin verifies organiser → `PUT /admin/users/:id/verify-organiser`
3. Create tournament → `POST /tournaments`
4. Upload banner → `PUT /tournaments/:id/banner`
5. Submit for approval → `PUT /tournaments/:id/publish`
6. Admin approves → `PUT /admin/tournaments/:id/approve`
7. Player registers → `POST /registrations/initiate`
8. Player pays → Frontend Razorpay → `POST /registrations/verify-payment`
9. Organiser generates bracket → `POST /tournaments/:id/generate-bracket`
10. Organiser updates scores → `PUT /tournaments/:id/matches/0`
11. Declare results → `PUT /tournaments/:id/results`
12. Player reviews → `POST /reviews`
