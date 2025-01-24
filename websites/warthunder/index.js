const fs = require("fs");
const path = require("path");

const log = require("../../log.js");

const config = require("../../config.js");

module.exports = {
	overrides: [
		{
			url: "/warthundermap.png",
			method: "GET",
			run: (_, res) => {
				const filePath = path.join(config.cache.server, "warthundermap.png");
				if (fs.existsSync(filePath)) {
					log("[War Thunder] Map fetched successfully.");
					res.status(200).sendFile(filePath);
				} else {
					log("[War Thunder] Map not found.");
					res.status(404).send("Map not found.");
				}
			}
		}, {
			url: "/warthundermap.png",
			method: "POST",
			run: (_, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[War Thunder] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				fs.writeFileSync(path.join(config.cache.server, "warthundermap.png"), Buffer.from(req.body, "base64url"));
				log("[War Thunder] Map uploaded successfully.");
				res.status(200).end();
			}
		}
	]
};