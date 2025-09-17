const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/user/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const id = decodeURIComponent(req.query.id);
			const dir = path.join(settings.paths.kcmaths);
			const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));

			const totals = files.map((file) => {
				const date = file.slice(0, -5);

				const filePath = path.join(dir, file);

				const content = JSON.parse(fs.readFileSync(filePath, "utf8"));

				return {
					date,
					value: content
				};
			});

			totals.sort((a, b) => `${a.date.slice(4, 8)}${a.date.slice(2, 4)}${a.date.slice(0, 2)}`.localeCompare(`${b.date.slice(4, 8)}${b.date.slice(2, 4)}${b.date.slice(0, 2)}`));

			res.status(200).json(totals.map((entry) => ({ date: entry.date, value: entry.value[id] })));
		}
	}
};

module.exports = info;