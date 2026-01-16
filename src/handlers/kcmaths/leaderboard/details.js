const fsp = require("fs/promises");
const path = require("path");

const modifiers = require("../modifiers.json");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/kcmaths/details/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (!req.query.id) return res.status(400).json({
				error: "Missing id query parameter"
			});

			const id = decodeURIComponent(req.query.id);
			const dir = path.join(settings.paths.kcmaths, "leaderboard");

			let files;
			try {
				files = (await fsp.readdir(dir)).filter((file) => file.endsWith(".json"));
			} catch (e) {
				logger.error("Error reading directory:", e);
				return res.status(500).json({ error: "Internal Server Error" });
			}

			const readPromises = files.map(async (file) => {
				const dateStr = file.slice(0, -5);
				const filePath = path.join(dir, file);

				try {
					const fileContent = await fsp.readFile(filePath, "utf8");
					const jsonContent = JSON.parse(fileContent);

					return {
						date: dateStr,
						val: jsonContent[id] ?? null
					};
				} catch (readError) {
					logger.warn(`Failed to read/parse file ${file}:`, readError);
					return null;
				}
			});

			const results = (await Promise.all(readPromises)).filter((item) => item !== null);

			results.sort((a, b) => {
				const dateA = `${a.date.slice(4, 8)}${a.date.slice(2, 4)}${a.date.slice(0, 2)}`;
				const dateB = `${b.date.slice(4, 8)}${b.date.slice(2, 4)}${b.date.slice(0, 2)}`;
				return dateA.localeCompare(dateB);
			});

			if (modifiers[id]) {
				for (const result of results) {
					if (!result.val) continue;

					const day = result.date.slice(0, 2);
					const month = result.date.slice(2, 4);
					const year = result.date.slice(4, 8);
					const date = new Date(`${year}-${month}-${day}`);
					date.setUTCHours(0, 0, 0, 0);

					for (const field in modifiers[id]) {
						if (result.val[field] === undefined) continue;

						for (const modifier of modifiers[id][field]) {
							const modifierDate = new Date(modifier[0]);
							modifierDate.setUTCHours(0, 0, 0, 0);

							if (date.getTime() >= modifierDate.getTime()) {
								result.val[field] += modifier[1];
							}
						}
					}
				}
			}

			res.status(200).json(results.map((entry) => ({
				date: entry.date,
				value: entry.val
			})));
		}
	}
};

module.exports = info;