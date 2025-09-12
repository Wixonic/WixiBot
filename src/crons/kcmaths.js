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
		const validDay = now.getDay() >= 0 && now.getDay() <= 5;
		return validDay && (minutes + 1) % (60 * 24) == 0;
	},
	run: async (logger, bot, minutes, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		const date = new Date(now);
		if (!fs.existsSync(bot.settings.paths.kcmaths)) fs.mkdirSync(bot.settings.paths.kcmaths, { recursive: true });
		fs.writeFileSync(path.join(bot.settings.paths.kcmaths, `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}.json`), JSON.stringify(data), "utf-8");
	}
};

module.exports = cron;