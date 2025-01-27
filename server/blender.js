const http = require("http");

const log = require("../log.js");

const config = require("../config.js");

let blenderData = {
	date: 0
};

const launch = () => {
	const server = http.createServer((req, res) => {
		let body = "";

		req.on("data", (chunk) => {
			body += chunk.toString();
		});

		req.on("end", () => {
			try {
				blenderData = JSON.parse(body);
				blenderData.date = Date.now();

				res.writeHead(200).end("Ok");
			} catch (e) {
				blenderData = null;
				res.writeHead(400).end("Bad content");
			}
		});
	});

	server.listen(config.blender.port, () => log(`Blender server listening on :${config.blender.port}`));
};

module.exports = {
	get: () => blenderData,
	launch,
	reset: () => blenderData = null
};