const fs = require("fs");
const path = require("path");

class Settings {
	constructor(applicationId) {
		this.applicationId = applicationId;
		this.path = path.join(__dirname, "settings", this.applicationId, "main.js");

		if (fs.existsSync(this.path)) {
			/**
			 * @type {import("../types.d.ts").MainSettings}
			 */
			const settings = require(this.path);

			this.active = settings.active;
			this.port = settings.port;
			this.application = settings.application;
			this.paths = settings.paths;
			this.secrets = settings.secrets;
		} else throw "Settings not found.";
	};
};

module.exports = Settings;