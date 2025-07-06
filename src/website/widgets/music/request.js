import storage from "./storage.js";

/**
 * @typedef {Object} response
 * @property {Object.<string, string>} headers
 * @property {XMLHttpRequest.response} response,
 * @property {XMLHttpRequest.status} status,
 * @property {number} timestamp
 */

/**
 * @param {"GET" | "POST" | "PUT" | "PATCH" | "DELETE"} method
 * @param {URL | string} url
 * @param {XMLHttpRequestResponseType} type
 * @param {string} mimeType
 * @param {Document | XMLHttpRequestBodyInit | null | undefined} body
 * @param {number} cache
 * @param {boolean} credentials
 * @returns {any}
 */
const request = (method, url, type = "", mimeType = "text/plain", body, cache = 180, credentials = false) => new Promise((resolve, reject) => {
	try {
		const cachedResponse = storage.getItem(`request-cache|${url}`);
		if (cachedResponse || cache > 0) {
			const data = JSON.parse(cachedResponse);

			if (cache == 0 || Date.now() - data.timestamp < cache * 1000) resolve(data);
			else throw "Expired";
		} else throw "Uncached";
	} catch (e) {
		console.log(`${method} ${url} - Cache: ${cache > 0 ? cache + "s" : (cache < 0 ? "disabled" : "permanent")} - ${e}`);
		const xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
		xhr.withCredentials = credentials;
		xhr.responseType = type;
		xhr.overrideMimeType(mimeType);

		xhr.addEventListener("load", async () => {
			if (String(xhr.status).startsWith("3")) resolve(await request(method, xhr.getResponseHeader("location"), type, mimeType, body, cache, credentials));
			else {
				/**
				 * @type {Headers}
				 */
				const headers = {};

				xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
					const parts = line.split(": ");
					headers[parts.shift()] = parts.join(": ");
				});

				/**
				 * @type {Response}
				 */
				const response = {
					headers,
					response: xhr.response,
					status: xhr.status,
					timestamp: Date.now()
				};

				if (cache >= 0) storage.setItem(`request-cache|${url}`, JSON.stringify(response));
				resolve(response);
			}
		});

		xhr.addEventListener("error", () => reject({
			status: 0,
			error: "Network error"
		}));
		xhr.send(body);
	}
});

export default request;