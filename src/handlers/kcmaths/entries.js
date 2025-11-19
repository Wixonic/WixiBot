const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/entries/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const exists = fs.existsSync(settings.paths.kcmaths);

			if (exists) {
				const files = await fsp.readdir(settings.paths.kcmaths);
				const entries = files.filter((file) => file.endsWith(".json"));

				for (let i = 0; i < entries.length; ++i) {
					const name = entries[i].substring(0, entries[i].length - 5);
					entries[i] = `${name.substring(4)}-${name.substring(2, 4)}-${name.substring(0, 2)}`;
				}

				res.status(200).json(entries);
			} else res.status(204).json([]);
		}
	}
};

module.exports = info;