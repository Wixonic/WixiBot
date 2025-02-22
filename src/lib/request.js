const http = require("http");
const https = require("https");

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../types.d.ts").RequestOptions} options
 * @returns {Promise<any>}
 */
const request = (logger, options = {}) => {
	if (options.secure == null) options.secure = true;
	if (options.method == null) options.method = "GET";

	return new Promise((resolve) => {
		let reject = (reason = "Unknown reason") => {
			logger.debug("[Request]", "Rejected while init:", reason);
			resolve({
				error: reason
			});
		};

		if (!("url" in options) || (!(options.url instanceof URL) && !URL.canParse(options.url))) reject("Cannot request an empty url");
		logger.debug("[Request]", "Request:", options.method, options.url);

		try {
			const req = (options.secure ? https : http).request(options.url, {
				auth: options.auth,
				headers: options.headers,
				method: options.method,
				rejectUnauthorized: false,
				timeout: 10000
			});

			try {
				reject = (reason = "Unknown reason") => {
					logger.debug("[Request]", "Rejected while request:", reason);

					req.removeAllListeners();
					resolve({
						error: reason
					});
				};

				req.on("close", () => reject("Connection closed"));
				req.on("error", (e) => reject(e));
				req.on("timeout", () => reject("Connection got timed out"));

				req.on("response", (res) => {
					if (options.type == "headers") resolve(res.headers);
					else {
						const chunks = [];

						const reject = (reason = "Unknown reason") => {
							logger.debug("[Request]", "Rejected while response:", reason);

							res.removeAllListeners();
							req.removeAllListeners();

							resolve({
								error: reason
							});
						};

						res.on("close", () => reject("Connection closed"));
						res.on("error", (e) => reject(e));

						res.on("data", (chunk) => chunks.push(chunk));
						res.on("end", () => {
							if (String(res.statusCode).startsWith("2")) {
								res.removeAllListeners();
								req.removeAllListeners();

								switch (options.type) {
									case "json":
										try {
											resolve(JSON.parse(chunks.join("")));
										} catch {
											reject("Failed to parse JSON");
										}
										break;

									case "raw":
										resolve(chunks);
										break;

									case "text":
										resolve(chunks.join(""));
										break;

									default:
										reject(`Invalid type: ${options.type ?? "<empty>"}`);
										break;
								}
							} else reject(`Status: ${res.statusCode}`);
						});
					}
				});

				if (options.body) req.write(options.body);
				req.end();
			} catch (e) {
				reject(e);
			}
		} catch (e) {
			reject(e);
		}
	});
};

module.exports = request;