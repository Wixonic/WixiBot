const fs = require("fs");
const path = require("path");

const { wait } = require("../../../lib/utils.js");

let updatingData = false;

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/data.json",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/data.json");
			while (updatingData) await wait(50);
			if (fs.existsSync(filePath)) res.status(200).sendFile(filePath);
			else res.status(404).json({
				error: "Not Found"
			});
		},
		post: (logger, settings, req, res, bot, rpc, sdk) => {
			updatingData = true;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/data.json");

			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				updatingData = false;
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, req.body, "utf-8");
			res.status(204).end();
			updatingData = false;
		},
		delete: (logger, settings, req, res, bot, rpc, sdk) => {
			updatingData = true;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/data.json");

			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				updatingData = false;
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			if (fs.existsSync(filePath)) fs.rmSync(filePath);
			res.status(204).end();
			updatingData = false;
		}
	}
};

module.exports = info;