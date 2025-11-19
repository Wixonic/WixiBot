/**
 * @type {import("../../types.d.ts").MainSettings}
 */
const mainSettings = {
	active: true,

	port: 1000,

	application: require("./application.js"),
	paths: require("./paths.js"),
	secrets: require("./secrets.js"),
	rpc: require("./rpc.js")
};

module.exports = mainSettings;