const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const date = new Date();
			let query = req.query.date;
			if (!query) query = String(date.getDate()).padStart(2, "0") + String(date.getMonth() + 1).padStart(2, "0");
			const filePath = path.join(settings.paths.kcmaths, `${query}.json`);
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