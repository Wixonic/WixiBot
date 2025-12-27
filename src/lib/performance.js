const fs = require("fs");
const path = require("path");

const os = require("os");
const Settings = require("./settings.js");

class Performance {
	/**
	 * @type {import("@wixonic/logger").Logger}
	 */
	static logger;

	static init(logger) {
		this.logger = logger;

		const settings = Settings.get(process.env.client);
		this.logDir = path.join(settings.secrets.paths.root, "logs", "performance");
		this.csvPath = path.join(this.logDir, "server.csv");

		if (process.env.dev === "true") {
			if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
			if (!fs.existsSync(this.csvPath)) {
				fs.writeFileSync(this.csvPath, "Timestamp,Type,Name,Duration(ms),Details\n");
			}
		}
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {string} name
	 * @param {() => Promise<T> | T} callback
	 * @param {any} details
	 * @returns {Promise<T>}
	 */
	static async measure(type, name, callback, details = "") {
		if (process.env.dev !== "true") return await callback();

		const start = performance.now();
		let result;
		try {
			result = await callback();
		} catch (e) {
			throw e;
		} finally {
			const duration = performance.now() - start;
			this.log(type, name, duration, details);
		}
		return result;
	}

	static log(type, name, duration, details = "") {
		if (process.env.dev !== "true") return;

		const timestamp = new Date().toISOString();
		const row = `"${timestamp}","${type}","${name}",${duration.toFixed(3)},"${String(details).replace(/"/g, '""')}"\n`;

		fs.appendFile(this.csvPath, row, (err) => {
			if (err && this.logger) this.logger.error("[Performance]", "Failed to write to CSV:", err);
		});

		if (this.logger) {
			this.logger.debug(`[PERF] [${type}] ${name} took ${duration.toFixed(3)}ms ${details ? `(${details})` : ""}`);
		}
	}
}

module.exports = Performance;