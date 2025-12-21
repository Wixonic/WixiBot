const cheerio = require("cheerio");

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
		if (cells.length === 2) {
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
		if (cells.length === 2) {
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
			const url = nameLink.attr("href");
			const name = decodeURIComponent(url);
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
 * @param {string} dateString
 * @returns {Date}
 */
const parseDate = (dateString) => {
	const [datePart, timePart] = dateString.split(" ");
	const [year, month, day] = datePart.split("-").map(Number);
	const [hour, minute] = timePart.split(":").map(Number);
	return new Date(year, month - 1, day, hour, minute);
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} sessionId
 * @param {import("../../types.d.ts").SecretsSettings} secrets
 * @param {{name: string, url: string, date: string, size: string}[]} filesList
 * @param {import("../../types.d.ts").PathsSettings} paths
 */
const syncFiles = async (logger, sessionId, secrets, filesList, paths) => {
	const storagePath = path.join(paths.kcmaths, "files");
	if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

	for (const file of filesList) {
		const filePath = path.join(storagePath, file.name);
		const serverDate = parseDate(file.date);

		let shouldDownload = false;

		if (!fs.existsSync(filePath)) {
			shouldDownload = true;
			logger.info(`[KCMaths] New file detected: ${file.name}`);
		} else {
			const stats = fs.statSync(filePath);
			if (stats.mtime.getTime() < serverDate.getTime()) {
				shouldDownload = true;
				logger.info(`[KCMaths] File update detected: ${file.name} (Local: ${stats.mtime.toISOString()}, Server: ${serverDate.toISOString()})`);
			}
		}

		if (shouldDownload) {
			const buffer = await downloadFile(logger, sessionId, secrets, file.url);
			if (buffer) {
				fs.writeFileSync(filePath, buffer);
				fs.utimesSync(filePath, serverDate, serverDate);
				logger.debug(`[KCMaths] Downloaded ${file.name}`);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} else {
				logger.error(`[KCMaths] Failed to download ${file.name}`);
			}
		}
	}
};

module.exports = {
	getSession,
	getData,
	getFiles,
	downloadFile,
	syncFiles
};