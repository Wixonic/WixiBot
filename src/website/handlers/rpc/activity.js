const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc) => {
			const filePath = path.join(settings.paths.cache, "/activity.json");
			if (fs.existsSync(filePath)) res.status(200).sendFile(filePath);
			else res.status(404).end();
		}
	}
};

module.exports = info;