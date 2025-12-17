const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/files/entries/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const historyPath = path.join(settings.paths.kcmaths, "files", "history");

			if (fs.existsSync(historyPath)) {
				const files = await fsp.readdir(historyPath);
				const entries = files
					.filter((file) => file.endsWith(".json"))
					.map((file) => {
						const name = file.substring(0, file.length - 5);
						return `${name.substring(4)}-${name.substring(2, 4)}-${name.substring(0, 2)}`;
					});

				res.status(200).json(entries);
			} else res.status(204).json([]);
		}
	}
};

module.exports = info;
