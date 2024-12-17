const fs = require("fs");
const path = require("path");

const config = require("../../config.js");

module.exports = {
	ignore: [],
	overrides: [
		{
			url: "/user/",
			method: "GET",
			/**
			 * @param {import("http").ClientRequest} req
			 * @param {import("http").ServerResponse} res
			 */
			run: async (req, res) => {
				const wixkey = req.headers.wixkey;
				const user = path.join(config.cache.tcgp, `${wixkey}.json`);

				if (!fs.existsSync(user)) res.writeHead(401).end("Unauthorized.");
				else {
					res.writeHead(200, {
						"content-type": "application/json"
					});
					res.write(fs.readFileSync(user));
					res.end();
				}
			}
		}, {
			url: "/user/",
			method: "POST",
			/**
			 * @param {import("http").ClientRequest} req
			 * @param {import("http").ServerResponse} res
			 */
			run: async (req, res) => {
				const wixkey = req.headers.wixkey;
				const user = path.join(config.cache.tcgp, `${wixkey}.json`);

				if (!fs.existsSync(user)) res.writeHead(401).end("Unauthorized.");
				else {
					fs.writeFileSync(user, await req.json());
					res.writeHead(204).end();
				}
			}
		}
	]
};