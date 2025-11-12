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
				bank: {},
				entries: {},
				percent: {},
				victories: {},
				list: []
			};

			if (!exists) res.status(404).json({
				error: `${req.query.date} not found`,
				path: filePath
			});
			else {
				const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
				const list = Object.values(content).filter((value) => value.lastName != "Corbineau");

				list.sort((a, b) => b.kcCoins - a.kcCoins);
				for (const user of list) leaderboard.bank[`${user.firstName} ${user.lastName}`] = user.kcCoins;

				list.sort((a, b) => b.entries - a.entries);
				for (const user of list) leaderboard.entries[`${user.firstName} ${user.lastName}`] = user.entries;

				const calculatePercent = (user) => user.entries == 0 ? 0 : (user.victories / user.entries);
				list.sort((a, b) => calculatePercent(b) - calculatePercent(a));
				for (const user of list) leaderboard.percent[`${user.firstName} ${user.lastName}`] = calculatePercent(user);

				list.sort((a, b) => b.victories - a.victories);
				for (const user of list) leaderboard.victories[`${user.firstName} ${user.lastName}`] = user.victories;

				list.sort((a, b) => a.lastName.localeCompare(b.lastName));
				for (const user of list) leaderboard.list.push(`${user.firstName} ${user.lastName}`);

				res.status(200).json(leaderboard);
			}
		}
	}
};

module.exports = info;