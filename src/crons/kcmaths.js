const fs = require("fs");
const path = require("path");

const { getSession, getData, getFiles, downloadFile, saveFilesSnapshot } = require("../lib/kcmaths.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "KCMaths history",
	priority: 0,
	condition: (minutes, now) => {
		const localDay = now.getDay();
		const localHour = now.getHours();
		const localMinute = now.getMinutes(); // Local time

		const schedule = {
			[1]: 12, // Monday,     12:00
			[2]: 17, // Tuesday,    17:00
			[4]: 12, // Thursday,   12:00
			[5]: 12  // Friday      12:00
		};

		const workDays = [
			["2025-09-01", "2025-10-19"],
			["2025-11-03", "2025-12-21"],
			["2025-01-05", "2025-02-22"],
			["2025-03-09", "2025-04-19"],
			["2025-05-03", "2025-07-05"]
		];

		const validDay = localDay in schedule;
		const validTime = validDay && localHour == schedule[localDay] && localMinute == 0;

		const nowString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const inWorkPeriod = workDays.some(([start, end]) => start <= nowString && nowString <= end);

		return (validDay && validTime && inWorkPeriod) || localHour == 22 && localMinute == 0;
	},
	run: async (logger, bot, minutes, now) => {
		const sessionId = await getSession(logger, bot.settings.secrets);
		if (!sessionId) return;
		const data = await getData(logger, sessionId);
		if (!data) return;

		const leaderboardPath = path.join(bot.settings.paths.kcmaths, "leaderboard");
		if (!fs.existsSync(leaderboardPath)) fs.mkdirSync(leaderboardPath, { recursive: true });

		fs.writeFileSync(path.join(leaderboardPath, `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}.json`), JSON.stringify(data), "utf-8");

		await new Promise((resolve) => setTimeout(resolve, 1000));

		const filesList = await getFiles(logger, sessionId, bot.settings.secrets);

		if (filesList) {
			const historyPath = path.join(bot.settings.paths.kcmaths, "files", "history");
			let lastManifest = {};

			if (fs.existsSync(historyPath)) {
				const historyFiles = fs.readdirSync(historyPath).filter((file) => file.endsWith(".json"));

				if (historyFiles.length > 0) {
					historyFiles.sort((a, b) => {
						const dateA = a.replace(".json", "");
						const dateB = b.replace(".json", "");

						const format = (d) => `${d.substring(4, 8)}${d.substring(2, 4)}${d.substring(0, 2)}`;
						return format(dateB).localeCompare(format(dateA));
					});

					for (const historyFile of historyFiles) {
						try {
							const manifestPath = path.join(historyPath, historyFile);
							lastManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
							logger.info(`[KCMaths] Loaded manifest from ${historyFile} with ${Object.keys(lastManifest).length} entries.`);
							break;
						} catch (e) {
							logger.error(`[KCMaths] Failed to read manifest ${historyFile}: ${e.message}`);
						}
					}
				} else {
					logger.info(`[KCMaths] No manifest files found in ${historyPath}.`);
				}
			} else {
				logger.info(`[KCMaths] History directory does not exist: ${historyPath}`);
			}

			const uniqueFiles = [];
			const seenNames = new Set();
			for (const file of filesList) {
				if (!seenNames.has(file.name)) {
					seenNames.add(file.name);
					uniqueFiles.push(file);
				}
			}

			const files = [];
			for (const file of uniqueFiles) {
				let buffer = null;
				const cached = lastManifest[file.name];

				if (cached) {
					if (cached.lastModified === file.date) {
						const cachedFilePath = path.join(bot.settings.paths.kcmaths, "files", "storage", cached.hash);
						if (fs.existsSync(cachedFilePath)) {
							buffer = fs.readFileSync(cachedFilePath);
						} else {
							logger.warn(`[KCMaths] Cache file missing for ${file.name} (hash: ${cached.hash})`);
						}
					} else {
						logger.info(`[KCMaths] File changed: ${file.name} (Manifest: ${cached.lastModified}, Current: ${file.date})`);
					}
				} else {
					logger.info(`[KCMaths] New file detected: ${file.name}`);
				}

				if (!buffer) {
					buffer = await downloadFile(logger, sessionId, bot.settings.secrets, file.url);
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}

				files.push({
					...file,
					buffer
				});
			}

			const validFiles = files.filter((f) => f.buffer);
			if (validFiles.length > 0) saveFilesSnapshot(logger, bot.settings.paths, now, validFiles);
		}
	}
};

module.exports = cron;