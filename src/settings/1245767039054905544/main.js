/**
 * @type {MainSettings}
 */
const mainSettings = {
	active: true,

	application: require("./application.js"),
	secrets: require("./secrets.js")
};

module.exports = mainSettings;