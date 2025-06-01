const fs = require("fs");
const path = require("path");

const { wait } = require("../../../../lib/utils.js");

let updatingMap = false;

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/map.png",
	handlers: {
		get: async (logger, settings, req, res) => {
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/map.png");
			if (fs.existsSync(filePath)) {
				while (updatingMap) await wait(50);
				res.status(200).sendFile(filePath);
			} else res.status(404).send("Map not found");
		},
		post: (logger, settings, req, res) => {
			updatingMap = true;
			const authHeader = req.headers.authorization;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/map.png");

			if (!authHeader || authHeader !== `WixKey ${settings.secrets.wixkey}`) {
				logger.warn("[War Thunder]", "Unauthorized access attempt");
				updatingMap = false;
				return res.status(401).send("Unauthorized: Invalid API key");
			}

			if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, Buffer.from(req.body, "base64url"));
			res.status(204).end();
			updatingMap = false;
		}
	}
};

module.exports = info;