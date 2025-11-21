const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/leaderboard/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const date = new Date(req.query.date);

			if (Number.isNaN(date.getDate())) {
				res.status(400).json({
					error: "Invalid Date"
				});
			} else {
				const filePath = path.join(bot.settings.paths.kcmaths, `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${date.getFullYear()}.json`);
				const exists = fs.existsSync(filePath);

				if (exists) {
					const leaderboard = await fsp.readFile(filePath, "utf-8");
					res.status(200).json(JSON.parse(leaderboard));
				} else res.status(404).json([]);
			}
		}
	}
};

module.exports = info;