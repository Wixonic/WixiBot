const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/files/history/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const { date } = req.query;
			if (!date) return res.status(400).json({ error: "Missing date parameter" });

			const [year, month, day] = date.split("-");
			const filename = `${day}${month}${year}.json`;
			const filePath = path.join(settings.paths.kcmaths, "files", "history", filename);

			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, "utf-8");
				res.status(200).json(JSON.parse(content));
			} else {
				res.status(404).json({ error: "History not found for this date" });
			}
		}
	}
};

module.exports = info;
