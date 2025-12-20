const fs = require("fs");
const path = require("path");

const { wait } = require("../../../lib/utils.js");

let updatingMap = false;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/map.png",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/map.png");
			while (updatingMap) await wait(50);
			if (fs.existsSync(filePath)) res.status(200).sendFile(filePath);
			else res.status(404).end();
		},
		post: (logger, settings, req, res, bot, rpc, sdk) => {
			updatingMap = true;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/map.png");

			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				updatingMap = false;
				return res.status(401).end();
			}

			if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, Buffer.from(req.body, "base64url"));
			res.status(204).end();
			updatingMap = false;
		},
		delete: (logger, settings, req, res, bot, rpc, sdk) => {
			updatingMap = true;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/map.png");

			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				updatingMap = false;
				return res.status(401).end();
			}

			if (fs.existsSync(filePath)) fs.rmSync(filePath);
			res.status(204).end();
			updatingMap = false;
		}
	}
};

module.exports = info;