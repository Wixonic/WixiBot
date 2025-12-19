const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/files/history/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const storagePath = path.join(settings.paths.kcmaths, "files", "storage");

			if (fs.existsSync(storagePath)) {
				const files = fs.readdirSync(storagePath);
				const manifest = {};

				for (const file of files) {
					if (file.startsWith(".")) continue;

					const filePath = path.join(storagePath, file);
					const stats = fs.statSync(filePath);
					const mtime = stats.mtime;

					const dateStr = `${mtime.getFullYear()}-${String(mtime.getMonth() + 1).padStart(2, "0")}-${String(mtime.getDate()).padStart(2, "0")} ${String(mtime.getHours()).padStart(2, "0")}:${String(mtime.getMinutes()).padStart(2, "0")}`;

					manifest[file] = {
						hash: file,
						size: `${Math.ceil(stats.size / 1024)} KB`,
						lastModified: dateStr
					};
				}

				res.status(200).json(manifest);
			} else {
				res.status(200).json({});
			}
		}
	}
};

module.exports = info;
