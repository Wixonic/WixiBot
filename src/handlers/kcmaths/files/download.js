const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/files/download/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const { hash, name } = req.query;
			if (!hash || !name) return res.status(400).json({ error: "Missing hash or name parameter" });

			const filePath = path.join(settings.paths.kcmaths, "files", "storage", hash);

			if (fs.existsSync(filePath)) {
				res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
				const stream = fs.createReadStream(filePath);
				stream.pipe(res);
			} else {
				res.status(404).json({ error: "File not found" });
			}
		}
	}
};

module.exports = info;
