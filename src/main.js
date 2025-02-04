const { GatewayIntentBits } = require("discord.js");

const { Bot } = require("./bot.js");
const { Settings } = require("./settings.js");
/**
 * @param {string} applicationId
 */
const init = (applicationId) => {
	const settings = new Settings(applicationId);

	const bot = new Bot({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildModeration,
			GatewayIntentBits.GuildPresences,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.DirectMessageReactions,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildScheduledEvents
		],
		token: settings.application.token
	});
};

init(process.env.client);