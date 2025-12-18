const cheerio = require("cheerio");

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const request = require("../lib/request.js");
const { userAgent } = require("../lib/utils.js");

/** @typedef {Record<string, {firstName: string, lastName: string, kcCoins: number, victories: number, entries: number}>} Data */

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../../types.d.ts").SecretsSettings} secrets
 */
const getSession = async (logger, secrets) => {
	const response = await request(logger, {
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": userAgent()
		},
		method: "POST",
		type: "headers",
		url: "https://www.kcmaths.com/index.php",
		body: `nom_session=${secrets.kcmaths.username}&mot_de_passe=${secrets.kcmaths.password}`
	});

	try {
		return response["set-cookie"][0].split("PHPSESSID=")[1].split(";")[0];
	} catch {
		return false;
	}
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} sessionId
 * @returns {Promise<Data?>}
 */
const getData = async (logger, sessionId) => {
	const response = await request(logger, {
		headers: {
			"Cookie": `PHPSESSID=${sessionId}`,
			"User-Agent": userAgent()
		},
		method: "GET",
		type: "text",
		url: "https://www.kcmaths.com/race_sommaire.php"
	});

	if (response.error) return null;

	/** @type {Data} */
	const data = {};

	const initializeStudent = (fullName) => {
		const nameParts = fullName.split(" ");
		const lastName = nameParts.pop();
		const firstName = nameParts.join(" ");

		data[fullName] = {
			lastName,
			firstName,
			kcCoins: 0,
			victories: 0,
			entries: 0
		};
	};

	const $ = cheerio.load(response);

	$('h1:contains("Banque")').next("table").find("tr").each((i, row) => {
		const cells = $(row).find("td");
		if (cells.length == 2) {
			const fullName = $(cells[0]).text().trim();
			const kcCoinsText = $(cells[1]).text().trim();
			const kcCoins = parseInt(kcCoinsText.replace(" KC-coins", ""), 10);

			if (fullName) {
				initializeStudent(fullName);
				data[fullName].kcCoins = kcCoins;
			}
		}
	});

	$('h1:contains("Classement des victoires au chifoumi")').next("table").find("tr").each((i, row) => {
		const cells = $(row).find("td");
		if (cells.length == 2) {
			const fullName = $(cells[0]).text().trim();
			const entryText = $(cells[1]).text().trim();

			const victoriesMatch = entryText.match(/(\d+)\s+victoire/);
			const entriesMatch = entryText.match(/(\d+)\s+participation/);

			const victories = victoriesMatch ? parseInt(victoriesMatch[1], 10) : 0;
			const entries = entriesMatch ? parseInt(entriesMatch[1], 10) : 0;

			if (fullName) {
				if (!data[fullName]) initializeStudent(fullName);
				data[fullName].victories = victories;
				data[fullName].entries = entries;
			}
		}
	});

	return data;
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} sessionId
 * @param {import("../../types.d.ts").SecretsSettings} secrets
 * @returns {Promise<{name: string, url: string, date: string, size: string}[]?>}
 */
const getFiles = async (logger, sessionId, secrets) => {
	const response = await request(logger, {
		auth: `${secrets.kcmaths.username}:${secrets.kcmaths.password}`,
		headers: {
			"Accept": "text/html",
			"Cookie": `PHPSESSID=${sessionId}`,
			"User-Agent": userAgent()
		},
		method: "GET",
		type: "text",
		url: "https://www.kcmaths.com/docs/25-26/"
	});

	if (response.error) return null;

	const files = [];
	const $ = cheerio.load(response);

	$("table tr").each((i, row) => {
		const cells = $(row).find("td");
		if (cells.length >= 4) {
			const nameLink = $(cells[1]).find("a");
			const name = nameLink.text().trim();
			const url = nameLink.attr("href");
			const date = $(cells[2]).text().trim();
			const size = $(cells[3]).text().trim();

			if (name && url && name !== "Parent Directory" && url !== "/docs/") {
				files.push({
					name,
					url: `https://www.kcmaths.com/docs/25-26/${url}`,
					date,
					size
				});
			}
		}
	});

	return files;
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} sessionId
 * @param {import("../../types.d.ts").SecretsSettings} secrets
 * @param {string} url
 * @returns {Promise<Buffer?>}
 */
const downloadFile = async (logger, sessionId, secrets, url) => {
	const response = await request(logger, {
		auth: `${secrets.kcmaths.username}:${secrets.kcmaths.password}`,
		headers: {
			"Cookie": `PHPSESSID=${sessionId}`,
			"User-Agent": userAgent()
		},
		method: "GET",
		type: "raw",
		url
	});

	if (response.error) return null;

	return Buffer.concat(response);
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../../types.d.ts").PathsSettings} paths
 * @param {Date} now
 * @param {{name: string, buffer: Buffer, size: string}[]} files
 */
const saveFilesSnapshot = (logger, paths, now, files) => {
	const storagePath = path.join(paths.kcmaths, "files", "storage");
	const historyPath = path.join(paths.kcmaths, "files", "history");

	if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
	if (!fs.existsSync(historyPath)) fs.mkdirSync(historyPath, { recursive: true });

	const manifest = {};

	for (const file of files) {
		const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
		const filePath = path.join(storagePath, hash);

		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, file.buffer);
			logger.info(`[KCMaths] New file downloaded: ${file.name} (${hash})`);
		}

		manifest[file.name] = {
			hash,
			size: file.size,
			lastModified: file.date
		};
	}

	const dateStr = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	const yesterdayStr = `${String(yesterday.getDate()).padStart(2, "0")}${String(yesterday.getMonth() + 1).padStart(2, "0")}${yesterday.getFullYear()}`;

	const currentManifestPath = path.join(historyPath, `${dateStr}.json`);
	const yesterdayManifestPath = path.join(historyPath, `${yesterdayStr}.json`);

	let shouldSave = true;

	if (fs.existsSync(yesterdayManifestPath)) {
		const yesterdayManifest = JSON.parse(fs.readFileSync(yesterdayManifestPath, "utf-8"));
		if (JSON.stringify(manifest) === JSON.stringify(yesterdayManifest)) {
			shouldSave = false;
			logger.info(`[KCMaths] No changes detected for ${dateStr}, skipping manifest save.`);
		}
	}

	if (shouldSave) {
		fs.writeFileSync(currentManifestPath, JSON.stringify(manifest), "utf-8");
		logger.info(`[KCMaths] Saved manifest for ${dateStr}`);
	}
};

module.exports = {
	getSession,
	getData,
	getFiles,
	downloadFile,
	saveFilesSnapshot
};