const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");

const log = require("./log.js");

const config = require("./config.js");

const server = {
	init: () => {
		const app = express();

		app.use((req, _, next) => {
			log(`[Request] ${req.method} ${req.path}`);
			next();
		});

		app.use(bodyParser.text({
			type: ["image/png"],
			limit: "500mb"
		}));

		app.use(bodyParser.json({
			type: "application/json",
			limit: "500mb"
		}));

		if (!fs.existsSync(config.cache.server)) {
			fs.mkdirSync(config.cache.server, { recursive: true });
			log(`[Server] Cache folder created at ${config.cache.server}`);
		}

		const websitesPath = path.join(__dirname, "websites");
		log(`[Server] Scanning websites folder: ${websitesPath}`);

		fs.readdirSync(websitesPath).forEach((folder) => {
			if (folder !== "website.cer" && folder !== ".DS_Store") {
				const folderPath = path.join(websitesPath, folder);
				log(`[Server] Found website folder: ${folderPath}`);

				const routesPath = path.join(folderPath, "index.js");
				if (!fs.existsSync(routesPath)) log(`[Server] No index.js found in ${folderPath}.`);
				else {
					const routes = require(routesPath);
					log(`[Server] Loaded routes from ${routesPath}`);

					routes.overrides.forEach((override) => {
						const { url, method, run } = override;
						const httpMethod = method.toLowerCase();

						if (typeof app[httpMethod] === "function") {
							const fullPath = `/${path.join(folder, url)}`;
							app[httpMethod](fullPath, (req, res) => {
								log(`[Server] Executing ${method} ${fullPath}`);
								run(req, res);
							});

							log(`[Server] Added override: ${method} ${fullPath}`);
						} else log(`[Server] Invalid HTTP method "${method}" for route "${url}" in ${routesPath}`);
					});

					const ignoredFiles = routes.ignore || [];
					ignoredFiles.push(path.join(folder, "index.js"));

					app.use((req, res, next) => {
						const requestedPath = path.join(folder, req.path);

						if (ignoredFiles.some((pattern) => new RegExp(`${folder}\/${pattern.replace("**", ".*")}`).test(requestedPath))) {
							log(`[Server] Request blocked for ${requestedPath}`);
							return res.status(403).send("Access denied.");
						}
						next();
					});
				}

				app.use(`/${folder}`, express.static(folderPath));
				log(`[Server] Static hosting initialized for /${folder}`);
			}
		});

		app.get("/warthundermap.png", (_, res) => {
			const filePath = path.join(config.cache.server, "warthundermap.png");
			if (fs.existsSync(filePath)) {
				log("[War Thunder] Map fetched successfully.");
				res.status(200).sendFile(filePath);
			} else {
				log("[War Thunder] Map not found.");
				res.status(404).send("Map not found.");
			}
		});

		app.post("/warthundermap.png", async (req, res) => {
			const authHeader = req.headers.authorization;

			if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) {
				log("[War Thunder] Unauthorized access attempt.");
				return res.status(401).send("Unauthorized: Invalid API key.");
			}

			fs.writeFileSync(path.join(config.cache.server, "warthundermap.png"), Buffer.from(req.body, "base64url"));
			log("[War Thunder] Map uploaded successfully.");
			res.status(200).end();
		});

		https.createServer({
			key: fs.readFileSync(config.ssl.key),
			cert: fs.readFileSync("./websites/website.cer"),
		}, app).listen(config.port.server, () => {
			log(`[Server] Express server is running on https://localhost:${config.port.server}`);
		});
	}
};

module.exports = server;