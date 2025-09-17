const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/leaderboard/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const filePath = path.join(settings.paths.kcmaths, `${req.query.date}.json`);
			const exists = fs.existsSync(filePath);

			const leaderboard = {
				bank: [],
				entries: [],
				percent: [],
				victories: [],
				list: []
			};

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

			const list = Object.values(totals.at(-1).value);

			list.sort((a, b) => b.kcCoins - a.kcCoins);
			for (const user of list) leaderboard.bank.push(`${user.firstName} ${user.lastName}`);

			list.sort((a, b) => b.entries - a.entries);
			for (const user of list) leaderboard.entries.push(`${user.firstName} ${user.lastName}`);

			list.sort((a, b) => {
				if (a.entries == 0 && b.entries == 0) return 0;
				else if (a.entries == 0) return 1;
				else if (b.entries == 0) return -1;
				else return (b.victories / b.entries) - (a.victories / a.entries);
			});
			for (const user of list) leaderboard.percent.push(`${user.firstName} ${user.lastName}`);

			list.sort((a, b) => b.victories - a.victories);
			for (const user of list) leaderboard.victories.push(`${user.firstName} ${user.lastName}`);

			list.sort((a, b) => a.lastName.localeCompare(b.lastName));
			for (const user of list) leaderboard.list.push(`${user.firstName} ${user.lastName}`);

			if (!exists) res.status(404).json({
				error: `${req.query.date} not found`,
				path: filePath
			});
			else res.status(200).json(leaderboard);
		}
	}
};

module.exports = info;