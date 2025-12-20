const fs = require("fs");
const path = require("path");

const { getSession, getData, getFiles, syncFiles } = require("../lib/kcmaths.js");

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
			[1]: 12, // Monday,     12:00
			[2]: 17, // Tuesday,    17:00
			[4]: 12, // Thursday,   12:00
			[5]: 12  // Friday      12:00
		};

		const workDays = [
			["2025-09-01", "2025-10-19"],
			["2025-11-03", "2025-12-21"],
			["2025-01-05", "2025-02-22"],
			["2025-03-09", "2025-04-19"],
			["2025-05-03", "2025-07-05"]
		];

		const validDay = localDay in schedule;
		const validTime = validDay && localHour === schedule[localDay] && localMinute === 0;

		const nowString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const inWorkPeriod = workDays.some(([start, end]) => start <= nowString && nowString <= end);

		return (validDay && validTime && inWorkPeriod) || localHour === 22 && localMinute === 0;
	},
	run: async (logger, bot, minutes, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		const leaderboardPath = path.join(bot.settings.paths.kcmaths, "leaderboard");
		if (!fs.existsSync(leaderboardPath)) fs.mkdirSync(leaderboardPath, { recursive: true });

		fs.writeFileSync(path.join(leaderboardPath, `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}.json`), JSON.stringify(data), "utf-8");

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const filesList = await getFiles(logger, sessionId, bot.settings.secrets);

		if (filesList) await syncFiles(logger, sessionId, bot.settings.secrets, filesList, bot.settings.paths);
	}
};

module.exports = cron;