require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const connectDB = require('../config/database');

const seedAdmin = async () => {
  await connectDB();

  // Create admin
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    await User.create({
      name: 'Ritesh Pandit',
      username: 'ritesh_admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      city: 'Mumbai',
      state: 'Maharashtra',
      isEmailVerified: true,
      isActive: true,
    });
    console.log('✅ Admin user created');
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Create sample organiser
  const existingOrganiser = await User.findOne({ username: 'sample_organiser' });
  if (!existingOrganiser) {
    await User.create({
      name: 'Mumbai Sports Club',
      username: 'mumbai_sports',
      email: 'organiser@sportvibe.com',
      password: 'Organiser@123',
      role: 'organiser',
      city: 'Mumbai',
      state: 'Maharashtra',
      isEmailVerified: true,
      isActive: true,
      organiserProfile: {
        organizationName: 'Mumbai Sports Club',
        description: 'Premier sports club in Mumbai organizing top-level tournaments since 2010.',
        isVerified: true,
        rating: 4.5,
        tournamentsOrganised: 12,
      },
    });
    console.log('✅ Sample organiser created');
  }

  console.log('🌱 Seeding complete!');
  console.log(`\nAdmin Login:\n  Email: ${process.env.ADMIN_EMAIL}\n  Password: ${process.env.ADMIN_PASSWORD}`);
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
