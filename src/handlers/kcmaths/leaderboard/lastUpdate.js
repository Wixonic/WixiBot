const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/lastUpdate/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const dirPath = path.join(settings.paths.kcmaths, "leaderboard");
			const exists = fs.existsSync(dirPath);

			if (exists) {
				try {
					const files = await fsp.readdir(dirPath);
					const jsonFiles = files.filter((file) => file.endsWith(".json"));

					if (jsonFiles.length == 0) return res.status(500).send("");

					const statsPromises = jsonFiles.map((file) => fsp.stat(path.join(dirPath, file)).then(stats => stats.mtime));
					const allDates = await Promise.all(statsPromises);

					const maxTime = Math.max(...allDates.map((date) => date.getTime()));
					const latestDate = new Date(maxTime);

					res.status(200).send(latestDate.toISOString());

				} catch (e) {
					logger.error("Failed to retrieve date:", e);
					res.status(500).end();
				}
			} else res.status(500).send("");
		}
	}
};

module.exports = info;