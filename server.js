const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const path = require("path");

const log = require("./log.js");

const config = require("./config.js");

const server = {
	init: () => {
		const app = express();

		app.use(bodyParser.text({
			type: "image/png",
			limit: "500mb"
		}));

		if (!fs.existsSync(config.cache.server)) fs.mkdirSync(config.cache.server);

		app.get("/warthundermap.png", (_, res) => {
			const filePath = path.join(config.cache.server, "warthundermap.png");
			if (fs.existsSync(filePath)) {
				log("War Thunder Map fetched");
				const headers = new Headers({
					"application-type": "image/png"
				});
				res.status(200).setHeaders(headers).sendFile(filePath);
			} else {
				log("War Thunder Map not found");
				res.status(404).send("Map not found.");
			}
		});

		app.post("/warthundermap.png", async (req, res) => {
			const authHeader = req.headers.authorization;

			if (!authHeader || authHeader !== `WixKey ${config.wixkey}`) return res.status(401).send("Unauthorized: Invalid API key.");

			fs.writeFileSync(path.join(config.cache.server, "warthundermap.png"), Buffer.from(req.body, "base64url"));
			log("War Thunder Map uploaded");
			res.status(200).end();
		});

		app.listen(config.port.server, () => log(`Express server is running on http://localhost:${config.port.server}`));
	}
};

module.exports = server;