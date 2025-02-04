const fs = require("fs");
const path = require("path");

class Settings {
	constructor(applicationId) {
		this.applicationId = applicationId;
		this.path = path.join(__dirname, "settings", this.applicationId, "main.js");

		if (fs.existsSync(this.path)) {
			/**
			 * @type {MainSettings}
			 */
			const settings = require(this.path);

			/**
			 * @type {ApplicationSettings}
			 */
			this.application = settings.application;

			/**
			 * @type {SecretsSettings}
			 */
			this.secrets = settings.secrets;
		} else throw "Settings not found.";
	};
};

module.exports = {
	Settings
};