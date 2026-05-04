# 🏆 SportVibe – Tournament Organizing Platform

Live Demo: https://sportvibe-tournament.vercel.app

SportVibe is a full-stack MERN application that allows users to create, manage, and participate in tournaments for both online and offline games. It provides a seamless experience for organizers and players, including team creation, registrations, payments, and communication.

--------------------------------------------------

🚀 FEATURES

👤 User Roles

Players:
- Register & login
- Browse tournaments
- Join tournaments
- Create or join teams
- Chat with teammates

Organizers:
- Create tournaments
- Set entry fees & prize pool
- Manage participants & teams
- Monitor registrations

Admin:
- Approves/rejects organizers
- Platform-level control

--------------------------------------------------

🏟️ Tournament Management

- Create tournaments for:
  - Online games
  - Offline events
- Set:
  - Entry fee
  - Prize pool
  - Tournament rules
- Track participants

--------------------------------------------------

💳 Payment Integration

- Secure payments using Razorpay
- Entry fee collection
- Payment confirmation system

--------------------------------------------------

👥 Team System

- Create teams
- Join teams
- Manage team members
- Participate as a team

--------------------------------------------------

💬 Chat System

- Real-time communication between players
- Team coordination
- Organizer-player interaction

--------------------------------------------------

🛠️ TECH STACK

Frontend:
- React.js
- Redux
- React Router DOM
- Axios

Backend:
- Node.js
- Express.js

Database:
- MongoDB

Other:
- Razorpay (Payments)
- Cloudinary (Image Storage)

--------------------------------------------------

📂 PROJECT STRUCTURE

client/
  components/
  pages/
  redux/
  api/

server/
  controllers/
  models/
  routes/
  middleware/

--------------------------------------------------

⚙️ INSTALLATION & SETUP

1. Clone the repository

git clone https://github.com/your-username/sportvibe.git
cd sportvibe

2. Setup Backend

cd server
npm install
npm run dev

3. Setup Frontend

cd client
npm install
npm start

--------------------------------------------------

🔑 ENVIRONMENT VARIABLES

Create a .env file in server folder:

PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
RAZORPAY_KEY_ID=your_key
RAZORPAY_SECRET=your_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

--------------------------------------------------

🌐 DEPLOYMENT

Frontend: Vercel  
Backend: Render (or any Node hosting)

--------------------------------------------------

🔮 FUTURE IMPROVEMENTS

- Match scheduling system
- Leaderboards & rankings
- Notifications system
- Mobile app

--------------------------------------------------

🤝 CONTRIBUTING

Contributions are welcome! Fork the repo and submit a pull request.

--------------------------------------------------

📄 LICENSE

MIT License

--------------------------------------------------

👨‍💻 AUTHOR

Ritesh Pandit
