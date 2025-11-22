const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const modifiers = require("./modifiers.json");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/leaderboard/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const date = new Date(req.query.date);
			date.setUTCHours(0, 0, 0);

			if (Number.isNaN(date.getDate())) {
				res.status(400).json({
					error: "Invalid Date"
				});
			} else {
				const filePath = path.join(bot.settings.paths.kcmaths, `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${date.getFullYear()}.json`);
				const exists = fs.existsSync(filePath);

				if (exists) {
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
					res.status(200).json(leaderboard);
				} else res.status(404).json([]);
			}
		}
	}
};

module.exports = info;