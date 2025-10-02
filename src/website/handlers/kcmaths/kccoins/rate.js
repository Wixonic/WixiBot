const fs = require("fs");
const path = require("path");

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/api/kccoins/rate/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const dir = path.join(settings.paths.kcmaths);
			const files = fs.readdirSync(dir).filter((file) => file.endsWith(".json"));

			const totals = files.map((file) => {
				const date = file.slice(0, -5);
				let total = 0;

				const filePath = path.join(dir, file);

				const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
				for (const user of Object.values(content)) {
					if (user.lastName != "Corbineau") total += user.kcCoins;
				}

				return { date, total };
			});

			totals.sort((a, b) => `${a.date.slice(4, 8)}${a.date.slice(2, 4)}${a.date.slice(0, 2)}`.localeCompare(`${b.date.slice(4, 8)}${b.date.slice(2, 4)}${b.date.slice(0, 2)}`));

			res.status(200).json(totals);
		}
	}
};

module.exports = info;