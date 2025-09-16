const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/user/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const id = decodeURIComponent(req.query.id);
			const dir = path.join(settings.paths.kcmaths);
			const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));

			const totals = files.map((file) => {
				const date = file.slice(0, -5);

				const filePath = path.join(dir, file);

				const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

				return {
					date,
					value: content
				};
			});

			totals.sort((a, b) => `${a.date.slice(4, 8)}${a.date.slice(2, 4)}${a.date.slice(0, 2)}`.localeCompare(`${b.date.slice(4, 8)}${b.date.slice(2, 4)}${b.date.slice(0, 2)}`));

			const leaderboard = {
				bank: [],
				entries: [],
				percent: [],
				victories: []
			};

			const latest = Object.values(totals.at(-1).value);

			latest.sort((a, b) => b.kcCoins - a.kcCoins);
			for (const user of latest) leaderboard.bank.push(`${user.firstName} ${user.lastName}`);

			latest.sort((a, b) => b.entries - a.entries);
			for (const user of latest) leaderboard.entries.push(`${user.firstName} ${user.lastName}`);

			latest.sort((a, b) => b.percent - a.percent);
			for (const user of latest) leaderboard.percent.push(`${user.firstName} ${user.lastName}`);

			latest.sort((a, b) => b.victories - a.victories);
			for (const user of latest) leaderboard.victories.push(`${user.firstName} ${user.lastName}`);

			res.json({
				entries: totals.map((entry) => ({ date: entry.date, value: entry.value[id] })),
				leaderboard
			});
		}
	}
};

module.exports = info;