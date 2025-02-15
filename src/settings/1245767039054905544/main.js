/**
 * @type {MainSettings}
 */
const mainSettings = {
	active: true,

	application: require("./application.js"),
	secrets: require("./secrets.js"),
	paths: require("./paths.js")
};

module.exports = mainSettings;