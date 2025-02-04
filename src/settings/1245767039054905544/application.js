/**
 * @type {ApplicationSettings}
 */
const applicationSettings = {
	clientId: "1245767039054905544",
	clientSecret: require("./secrets.js").discord.client.secret,
	publicKey: "5bb264bfee87985278e2f33bbec9a36eb05d7a7ce0b0238625c942ebff88bfa4",
	token: require("./secrets.js").discord.client.token
};

module.exports = applicationSettings;