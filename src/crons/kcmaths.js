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
		const validDays = [2, 3, 5, 6];
		const validDay = validDays.includes(now.getUTCDay());

		const validTime = minutes % (60 * 24) == 0;

		return validDay && validTime;
	},
	run: async (logger, bot, minutes, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		const date = new Date(now);
		date.setUTCDate(date.getUTCDate() - 1);

		if (!fs.existsSync(bot.settings.paths.kcmaths)) fs.mkdirSync(bot.settings.paths.kcmaths, { recursive: true });

		const day = String(date.getUTCDate()).padStart(2, "0");
		const month = String(date.getUTCMonth() + 1).padStart(2, "0");

		fs.writeFileSync(path.join(bot.settings.paths.kcmaths, `${day}${month}${date.getUTCFullYear()}.json`), JSON.stringify(data), "utf-8");
	}
};

module.exports = cron;