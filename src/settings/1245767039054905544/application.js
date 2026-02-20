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

	adminRole: "1352221761877442564",
	defaultTextChannel: "1243943943779909655",
	guildId: "1243943943779909652",
	moderationChannel: "1243991489575522375",
	ticketChannel: "1340598588270579712",

	commands
};

module.exports = applicationSettings;