const fs = require("fs");
const path = require("path");

const { getSession, getData } = require("../lib/kcmaths.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "KCMaths history",
	priority: 0,
	condition: (_, now) => {
		const localDay = now.getDay();
		const localHour = now.getHours();
		const localMinute = now.getMinutes(); // Local time

		const schedule = {
			[0]: 22, // Sunday,     22:00
			[1]: 10, // Monday,     10:00
			[2]: 17, // Tuesday,    17:00
			[3]: 22, // Wednesday,  22:00
			[4]: 12, // Thursday,   12:00
			[5]: 12, // Friday,     12:00
			[6]: 22  // Saturday,   22:00
		};

		const workDays = [
			["2025-09-01", "2025-10-19"],
			["2025-11-03", "2025-12-21"],
			["2025-01-05", "2025-02-22"],
			["2025-03-09", "2025-04-19"],
			["2025-05-03", "2025-07-05"]
		];

		const validDay = localDay in schedule;
		const validTime = validDay && localHour == schedule[localDay] && localMinute == 0;

		const nowString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const inWorkPeriod = workDays.some(([start, end]) => start <= nowString && nowString <= end);

		return validDay && validTime && inWorkPeriod;
	},
	run: async (logger, bot, _, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		if (!fs.existsSync(bot.settings.paths.kcmaths)) fs.mkdirSync(bot.settings.paths.kcmaths, { recursive: true });

		// Local time
		const day = String(now.getDate()).padStart(2, "0");
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const year = now.getFullYear();

		fs.writeFileSync(path.join(bot.settings.paths.kcmaths, `${day}${month}${year}.json`), JSON.stringify(data), "utf-8");
	}
};

module.exports = cron;