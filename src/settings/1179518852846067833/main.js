/**
 * @type {import("../../types.d.ts").MainSettings}
 */
const mainSettings = {
	active: true,

	port: 1000,

	application: require("./application.js"),
	secrets: require("./secrets.js"),
	paths: require("./paths.js")
};

module.exports = mainSettings;