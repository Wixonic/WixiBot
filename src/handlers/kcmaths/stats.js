const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const modifiers = require("./modifiers.json");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/stats/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const dirPath = path.join(settings.paths.kcmaths, "leaderboard");
			const exists = fs.existsSync(dirPath);

			if (exists) {
				const files = await fsp.readdir(dirPath);
				const entries = files.filter((file) => file.endsWith(".json"));

				const stats = {
					dates: [],
					kcc: [],
					victories: [],
					defeats: [],
					ratio: []
				};

				entries.sort((a, b) => {
					const dateA = new Date(`${a.substring(4, 8)}-${a.substring(2, 4)}-${a.substring(0, 2)}`);
					const dateB = new Date(`${b.substring(4, 8)}-${b.substring(2, 4)}-${b.substring(0, 2)}`);
					return dateA - dateB;
				});

				for (const file of entries) {
					const dateStr = `${file.substring(4, 8)}-${file.substring(2, 4)}-${file.substring(0, 2)}`;
					const date = new Date(dateStr);
					date.setUTCHours(0, 0, 0);

					const filePath = path.join(dirPath, file);
					const leaderboard = JSON.parse(await fsp.readFile(filePath, "utf-8"));

					for (const id in modifiers) {
						for (const field in modifiers[id]) {
							for (const modifier of modifiers[id][field]) {
								const modifierDate = new Date(modifier[0]);
								modifierDate.setUTCHours(0, 0, 0);
								if (date.getTime() >= modifierDate.getTime()) leaderboard[id][field] += modifier[1];
							}
						}
					}

					let totalKcc = 0;
					let totalVictories = 0;
					let totalEntries = 0;

					for (const id in leaderboard) {
						totalKcc += leaderboard[id].kcCoins;
						totalVictories += leaderboard[id].victories;
						totalEntries += leaderboard[id].entries;
					}

					stats.dates.push(dateStr);
					stats.kcc.push(totalKcc);
					stats.victories.push(totalVictories);

					const defeats = totalEntries - totalVictories;
					stats.defeats.push(defeats);

					const ratio = totalEntries > 0 ? (totalVictories / totalEntries) : 0;
					stats.ratio.push(ratio);
				}

				res.status(200).json(stats);
			} else {
				res.status(204).json({});
			}
		}
	}
};

module.exports = info;
