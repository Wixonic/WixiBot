const fs = require("fs");
const path = require("path");

const log = require("../../log.js");

const config = require("../../config.js");

module.exports = {
	overrides: [
		{
			url: "/refresh.json",
			method: "GET",
			run: (req, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[Pronote] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				const refreshPath = path.join(config.cache.pronote, "refresh.json");

				if (!fs.existsSync(refreshPath)) return res.status(404).send("Not found");

				try {
					const storedInformation = JSON.parse(fs.readFileSync(refreshPath, "utf-8"));
					storedInformation.deviceUUID = config.pronote.deviceId;
					res.status(200).send(JSON.stringify(storedInformation));
				} catch (e) {
					log(`[Pronote] GET refresh: ${e}`);
					res.status(500).send("Internal server error");
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

				try {
					if (!fs.existsSync(config.cache.pronote)) fs.mkdirSync(config.cache.pronote, { recursive: true });
					fs.writeFileSync(path.join(config.cache.pronote, "refresh.json"), JSON.stringify(req.body), "utf-8");
					res.status(204).end();
				} catch (e) {
					log(`[Pronote] POST refresh: ${e}`);
					res.status(500).send("Internal server error");
				}
			}
		}, {
			url: "/qr.json",
			method: "GET",
			run: (req, res) => {
				const authHeader = req.headers.authorization;

				if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
					log("[Pronote] Unauthorized access attempt.");
					return res.status(401).send("Unauthorized: Invalid API key.");
				}

				const qrPath = path.join(config.cache.pronote, "qr.json");

				if (!fs.existsSync(qrPath)) return res.status(404).send("Not found");

				try {
					res.status(200).send(fs.readFileSync(qrPath, "utf-8"));
				} catch (e) {
					log(`[Pronote] GET qr: ${e}`);
					res.status(500).send("Internal server error");
				}
			}
		}
	]
};