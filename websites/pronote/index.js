const fs = require("fs");
const path = require("path");

const log = require("../../log.js");

const config = require("../../config.js");

module.exports = {
	overrides: [
		{
			url: "/refresh.json",
			method: "GET",
			run: (_, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[Pronote] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				try {
					const storedInformation = JSON.parse(fs.readFileSync(path.join(config.cache.pronote, "refresh.json"), "utf-8"));
					storedInformation.deviceUUID = config.pronote.deviceId;
					res.send(200).write(JSON.stringify(storedInformation)).end();
				} catch {
					res.status(404).end("Not found");
				}
			}
		}, {
			url: "/refresh.json",
			method: "POST",
			run: (req, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[Pronote] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				if (!fs.existsSync(config.cache.pronote)) fs.mkdirSync(config.cache.pronote, { recursive: true });
				fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), req.body, "utf-8");
			}
		}, {
			url: "/qr.json",
			method: "GET",
			run: (_, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[Pronote] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				try {
					res.send(200).write(fs.readFileSync(path.join(config.cache.pronote, "qr.json"), "utf-8")).end();
				} catch {
					res.status(404).end("Not found");
				}
			}
		}
	]
};