const cron = require('node-cron');
const User = require('./models/User');

// Schedule tasks to be run on the server.
// This runs at 00:00 (midnight) every Sunday.
cron.schedule('0 0 * * 0', async () => {
  console.log('Running weekly leaderboard reset task...');
  try {
    const users = await User.find({}).sort({ points: -1 });

    const updates = users.map((user, index) => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            previousRank: index + 1,
            weeklyPoints: 0,
          },
        },
      },
    }));

    if (updates.length > 0) {
      await User.bulkWrite(updates);
    }

    console.log('Weekly leaderboard reset task completed successfully.');
  } catch (error) {
    console.error('Error during weekly reset task:', error);
  }
});

console.log('Scheduler initialized.');