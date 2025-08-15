/**
 * @type {import("../../types.d.ts").MainSettings}
 */
const mainSettings = {
	active: true,

	port: 999,

	application: require("./application.js"),
	secrets: require("./secrets.js"),
	paths: require("./paths.js"),
	website: require("./website.js")
};

module.exports = mainSettings;