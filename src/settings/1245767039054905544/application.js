const commands = require("./commands.js");
const secrets = require("./secrets.js");

/**
 * @type {import("../../types.d.ts").ApplicationSettings}
 */
const applicationSettings = {
	clientId: "1245767039054905544",
	clientSecret: secrets.discord.application.secret,
	publicKey: "5bb264bfee87985278e2f33bbec9a36eb05d7a7ce0b0238625c942ebff88bfa4",
	token: secrets.discord.application.token,
	webhook: secrets.discord.webhook,

	guildId: "1243943943779909652",

	commands
};

module.exports = applicationSettings;