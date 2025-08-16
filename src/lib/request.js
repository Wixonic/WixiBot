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
		logger.debug("[Request]", "Request:", options.method, options.url.toString());

		try {
			const req = (options.secure ? https : http).request(options.url, {
				auth: options.auth,
				headers: options.headers,
				method: options.method,
				rejectUnauthorized: options.rejectUnauthorized ?? false,
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
					if (res.statusCode == 204) resolve(null);
					else {
						if (options.type == "headers") resolve(res.headers);
						else {
							const chunks = [];

							const reject = (reason = "Unknown reason", response) => {
								logger.debug("[Request]", "Rejected while response:", reason);

								res.removeAllListeners();
								req.removeAllListeners();

								resolve({
									error: reason,
									response
								});
							};

							res.on("close", () => reject("Connection closed"));
							res.on("error", (e) => reject(e));

							res.on("data", (chunk) => chunks.push(chunk));
							res.on("end", () => {
								res.removeAllListeners();
								req.removeAllListeners();

								switch (options.type) {
									case "json":
										let json = "";
										try {
											json = JSON.parse(chunks.join(""));
										} catch {
											reject("Failed to parse JSON", chunks.join(""));
										}
										if (String(res.statusCode).startsWith("2")) resolve(json);
										else reject(`Status: ${res.statusCode}`, json);
										break;

									case "raw":
										if (String(res.statusCode).startsWith("2")) resolve(chunks);
										else reject(`Status: ${res.statusCode}`, chunks);
										break;

									case "text":
										if (String(res.statusCode).startsWith("2")) resolve(chunks.join(""));
										else reject(`Status: ${res.statusCode}`, chunks.join(""));
										break;

									default:
										reject(`Invalid type: ${options.type ?? "<empty>"}`, chunks.join(""));
										break;
								}
							});
						}
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