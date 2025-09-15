const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const filePath = path.join(settings.paths.kcmaths, `${req.query.date}.json`);
			const exists = fs.existsSync(filePath);

			if (!exists) res.status(404).json({
				error: `${query} not found`,
				path: filePath
			});
			else res.sendFile(filePath);
		}
	}
};

module.exports = info;