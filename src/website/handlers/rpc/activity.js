const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types").HandlerInfo}
 */
const info = {
	path: "/activity/",
	handlers: {
		get: (logger, settings, req, res) => {
			const filePath = path.join(settings.paths.cache, "activity.json");
			if (fs.existsSync(filePath)) {
				logger.debug("[Activity]", "Fetched successfully");
				res.status(200).sendFile(filePath);
			} else {
				logger.debug("[Activity]", "Not found");
				res.status(404).send("Activity not found");
			}
		},
		post: (logger, settings, req, res) => {
			const authHeader = req.headers.authorization;

			if (!authHeader || authHeader !== `WixKey ${settings.secrets.wixkey}`) {
				logger.debug("[War Thunder]", "Unauthorized access attempt");
				return res.status(401).send("Unauthorized: Invalid API key");
			}

			if (!fs.existsSync(settings.paths.cache)) fs.mkdirSync(settings.paths.cache, { recursive: true });
			fs.writeFileSync(path.join(settings.paths.cache, "activity.json"), Buffer.from(req.body, "utf-8"));
			logger.debug("[Activity]", "Uploaded successfully");
			res.status(204).end();
		}
	}
};

module.exports = info;