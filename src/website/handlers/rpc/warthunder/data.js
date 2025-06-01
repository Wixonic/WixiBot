const fs = require("fs");
const path = require("path");

const { wait } = require("../../../../lib/utils.js");

let updatingData = false;

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/warthunder/data.json",
	handlers: {
		get: async (logger, settings, req, res) => {
			const filePath = path.join(settings.paths.cache, "/rpc//warthunder/data.json");
			if (fs.existsSync(filePath)) {
				while (updatingData) await wait(50);
				res.status(200).sendFile(filePath);
			} else res.status(404).send("Data not found");
		},
		post: (logger, settings, req, res) => {
			updatingData = true;
			const authHeader = req.headers.authorization;
			const filePath = path.join(settings.paths.cache, "/rpc/warthunder/data.json");

			if (!authHeader || authHeader !== `WixKey ${settings.secrets.wixkey}`) {
				logger.warn("[War Thunder]", "Unauthorized access attempt");
				updatingData = false;
				return res.status(401).send("Unauthorized: Invalid API key");
			}

			if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, Buffer.from(req.body, "utf-8"));
			res.status(204).end();
			updatingData = false;
		}
	}
};

module.exports = info;