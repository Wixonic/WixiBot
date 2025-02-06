const secrets = require("./secrets.js");

/**
 * @type {ApplicationSettings}
 */
const applicationSettings = {
	clientId: "1245767039054905544",
	clientSecret: secrets.discord.client.secret,
	publicKey: "5bb264bfee87985278e2f33bbec9a36eb05d7a7ce0b0238625c942ebff88bfa4",
	token: secrets.discord.client.token,
	webhook: secrets.discord.webhook
};

module.exports = applicationSettings;