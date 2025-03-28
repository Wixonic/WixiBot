/**
 * @type {import("../types").CronInfo}
 */
const cron = {
	name: "Recurrent Roles",
	priority: 0,
	condition: (minutes, now) => minutes % (60 * 24) == 0 && now.getUTCDate() == 1, // 1st of the month, at 00:00 UTC
	run: async (logger, bot, minutes, now) => {
		// TODO: Update recurrent roles
	}
};

module.exports = cron;