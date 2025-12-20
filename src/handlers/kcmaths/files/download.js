const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/files/download/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const { name } = req.query;
			if (!name) return res.status(400).json({ error: "Missing name parameter" });

			const safeName = path.basename(name);
			const filePath = path.join(settings.paths.kcmaths, "files", safeName);

			if (fs.existsSync(filePath)) {
				res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
				const stream = fs.createReadStream(filePath);
				stream.pipe(res);
			} else {
				res.status(404).json({ error: "File not found" });
			}
		}
	}
};

module.exports = info;
