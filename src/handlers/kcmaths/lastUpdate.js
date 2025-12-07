const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/lastUpdate/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const dirPath = settings.paths.kcmaths;
			const exists = fs.existsSync(dirPath);

			if (exists) {
				try {
					const files = await fsp.readdir(dirPath);
					const jsonFiles = files.filter((file) => file.endsWith(".json"));

					if (jsonFiles.length == 0) return res.status(500).send("");

					let latestDate = new Date(0);

					for (const file of jsonFiles) {
						const stats = await fsp.stat(path.join(dirPath, file));
						if (stats.mtime > latestDate) latestDate = stats.mtime;
					}

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