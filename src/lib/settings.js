const fs = require("fs");
const path = require("path");

class Settings {
	/**
	 * @param {string} applicationId 
	 * @returns {import("../types.d.ts").MainSettings}
	 */
	static get(applicationId) {
		this.applicationId = applicationId;
		this.path = path.join(__dirname, "..", "settings", this.applicationId, "main.js");

		if (fs.existsSync(this.path)) {
			return require(this.path);
		} else throw "Settings not found.";
	};
};

module.exports = Settings;