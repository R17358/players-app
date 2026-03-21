const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to SportVibe! 🏆',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
          <h1 style="color: #e94560; font-size: 32px; margin: 0;">SportVibe</h1>
          <p style="color: #aaa; margin: 5px 0;">Your Sports Community</p>
        </div>
        <div style="padding: 40px; background: #f9f9f9;">
          <h2>Welcome, ${name}! 🎉</h2>
          <p>You're now part of the SportVibe family. Start exploring tournaments, connect with players, and showcase your skills!</p>
          <a href="${process.env.CLIENT_URL}" style="background: #e94560; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; display: inline-block; margin-top: 20px;">Explore Tournaments</a>
        </div>
      </div>
    `,
  }),

  registrationConfirmed: (name, tournamentTitle, registrationNumber) => ({
    subject: `Registration Confirmed - ${tournamentTitle} 🏅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center;">
          <h1 style="color: #e94560;">SportVibe</h1>
        </div>
        <div style="padding: 40px; background: #f9f9f9;">
          <h2>You're In! ✅</h2>
          <p>Hi ${name}, your registration for <strong>${tournamentTitle}</strong> has been confirmed.</p>
          <div style="background: #e94560; color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px;">Registration Number</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">${registrationNumber}</p>
          </div>
          <p>Keep this number safe. You'll need it at the venue.</p>
        </div>
      </div>
    `,
  }),

  tournamentReminder: (name, tournamentTitle, date, venue) => ({
    subject: `Reminder: ${tournamentTitle} starts tomorrow! ⚡`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
        <h2>Ready to compete, ${name}? 🔥</h2>
        <p><strong>${tournamentTitle}</strong> starts tomorrow!</p>
        <p>📅 <strong>Date:</strong> ${date}</p>
        <p>📍 <strong>Venue:</strong> ${venue}</p>
        <p>Make sure you arrive 30 minutes early. All the best!</p>
      </div>
    `,
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset Request - SportVibe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
        <h2>Reset Your Password</h2>
        <p>Hi ${name}, you requested a password reset.</p>
        <a href="${resetUrl}" style="background: #e94560; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; display: inline-block;">Reset Password</a>
        <p style="margin-top: 20px; color: #666; font-size: 12px;">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  refundProcessed: (name, amount, tournamentTitle) => ({
    subject: `Refund Processed - ₹${amount} - SportVibe`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
        <h2>Refund Processed ✅</h2>
        <p>Hi ${name}, ₹${amount} has been credited to your SportVibe wallet for the cancellation of <strong>${tournamentTitle}</strong>.</p>
        <p>You can use this amount for future tournament registrations.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
