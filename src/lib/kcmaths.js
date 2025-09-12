const cheerio = require("cheerio");

const request = require("../lib/request.js");
const { userAgent } = require("../lib/utils.js");

/** @typedef {Record<string, {firstname: string, lastname: string, kcCoins: number, victories: number, entries: number}>} Data */

/**
 * @param {import("@wixonic/logger").Logger}
 * @param {import("../../../types.d.ts").SecretsSettings} secrets
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

	/** @type {data} */
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

module.exports = {
	getSession,
	getData
};