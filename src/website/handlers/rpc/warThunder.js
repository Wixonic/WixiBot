const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/map.png",
	handlers: {
		get: (logger, settings, req, res) => {
			const filePath = path.join(settings.paths.cache, "warthundermap.png");
			if (fs.existsSync(filePath)) {
				logger.debug("[War Thunder]", "Map fetched successfully");
				res.status(200).sendFile(filePath);
			} else {
				logger.debug("[War Thunder]", "Map not found");
				res.status(404).send("Map not found");
			}
		},
		post: (logger, settings, req, res) => {
			const authHeader = req.headers.authorization;

			if (!authHeader || authHeader !== `WixKey ${settings.secrets.wixkey}`) {
				logger.debug("[War Thunder]", "Unauthorized access attempt");
				return res.status(401).send("Unauthorized: Invalid API key");
			}

			if (!fs.existsSync(settings.paths.cache)) fs.mkdirSync(settings.paths.cache, { recursive: true });
			fs.writeFileSync(path.join(settings.paths.cache, "warthundermap.png"), Buffer.from(req.body, "base64url"));
			logger.debug("[War Thunder]", "Map uploaded successfully");
			res.status(204).end();
		}
	}
};

module.exports = info;