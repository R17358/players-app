const cron = require('node-cron');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('./emailService');
const logger = require('./logger');

const initCronJobs = () => {
  // Every hour: close registration for tournaments past deadline
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await Tournament.updateMany(
        {
          status: 'registration_open',
          registrationDeadline: { $lt: new Date() },
        },
        { status: 'registration_closed' }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Cron: Closed registration for ${result.modifiedCount} tournament(s)`);
      }
    } catch (err) {
      logger.error(`Cron error (close registrations): ${err.message}`);
    }
  });

  // Daily at 9 AM: send reminders for tomorrow's tournaments
  cron.schedule('0 9 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const tomorrowTournaments = await Tournament.find({
        tournamentStartDate: { $gte: tomorrow, $lt: dayAfter },
        status: { $in: ['registration_closed', 'ongoing'] },
      });

      for (const tournament of tomorrowTournaments) {
        const registrations = await Registration.find({
          tournament: tournament._id,
          status: 'confirmed',
        }).populate('player', 'name email');

        for (const reg of registrations) {
          const template = emailTemplates.tournamentReminder(
            reg.player.name,
            tournament.title,
            tournament.tournamentStartDate.toLocaleDateString('en-IN'),
            tournament.location?.venue || 'To be announced'
          );
          sendEmail({ to: reg.player.email, ...template }).catch(() => {});

          // In-app notification
          await User.findByIdAndUpdate(reg.player._id, {
            $push: {
              notifications: {
                title: `⚡ Tomorrow: ${tournament.title}`,
                message: `Your tournament starts tomorrow at ${tournament.location?.venue || 'the venue'}. Be ready!`,
                type: 'tournament',
                link: `/tournaments/${tournament.slug}`,
                isRead: false,
              },
            },
            $inc: { unreadNotificationsCount: 1 },
          });
        }

        logger.info(`Cron: Sent reminders for "${tournament.title}" to ${registrations.length} participants`);
      }
    } catch (err) {
      logger.error(`Cron error (reminders): ${err.message}`);
    }
  });

  // Daily at midnight: clean up expired pending registrations (>24 hrs)
  cron.schedule('0 0 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Registration.updateMany(
        {
          status: 'payment_pending',
          createdAt: { $lt: cutoff },
        },
        { status: 'cancelled' }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Cron: Cancelled ${result.modifiedCount} expired pending registrations`);
      }
    } catch (err) {
      logger.error(`Cron error (cleanup): ${err.message}`);
    }
  });

  logger.info('✅ Cron jobs initialized');
};

module.exports = initCronJobs;
