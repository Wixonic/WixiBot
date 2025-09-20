const fs = require("fs");
const path = require("path");

const { getSession, getData } = require("../lib/kcmaths.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "KCMaths history",
	priority: 0,
	condition: (minutes, now) => {
		const localDay = now.getDay();
		const localHour = now.getHours();
		const localMinute = now.getMinutes(); // Local time

		const schedule = {
			[1]: 10, // Monday, 10:00
			[2]: 17, // Tuesday, 17:00
			[4]: 12, // Thursday, 12:00
			[5]: 12  // Friday, 12:00
		};

		const validDay = localDay in schedule;
		const validTime = validDay && localHour == schedule[localDay] && localMinute == 0;

		return validDay && validTime;
	},
	run: async (logger, bot, minutes, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		if (!fs.existsSync(bot.settings.paths.kcmaths)) fs.mkdirSync(bot.settings.paths.kcmaths, { recursive: true });

		const day = String(now.getUTCDate()).padStart(2, "0");
		const month = String(now.getUTCMonth() + 1).padStart(2, "0");
		const year = now.getUTCFullYear();

		fs.writeFileSync(path.join(bot.settings.paths.kcmaths, `${day}${month}${year}.json`), JSON.stringify(data), "utf-8");
	}
};

module.exports = cron;