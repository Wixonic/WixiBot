const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/day/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const filePath = path.join(settings.paths.kcmaths, `${req.query.date}.json`);
			const exists = fs.existsSync(filePath);

			if (!exists) res.status(404).json({
				error: `${req.query.date} not found`,
				path: filePath
			});
			else {
				try {
					const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
					res.status(200).json(content);
				} catch (e) {
					logger.warn(`Failed to parse ${req.query.date}:`, e);
					res.status(500).json({
						error: `Failed to parse ${req.query.date}`
					});
				}
			}
		}
	}
};

module.exports = info;