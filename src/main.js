const { GatewayIntentBits } = require("discord.js");

const { Bot } = require("./bot.js");
const { Settings } = require("./settings.js");

const log = require("./log.js");

/**
 * @param {string} applicationId
 */
const init = async (applicationId) => {
	/* const settings = new Settings(applicationId);

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
		token: settings.application.client.token,
		webhook: settings.application.webhook
	});

	await bot.login();
	*/

	this.debug("Debug");
	this.info("Info");
	this.error("Error");
	this.warn("Warn");
};

const main = async () => {
	const tries = {
		current: 0,
		max: 5,
		delay: 5
	};

	while (tries.current < tries.max) {
		try {
			await init.apply({
				debug: (...any) => log.debug(`[init ${tries}/${maxTries}]`, ...any),
				info: (...any) => log.info(`[init ${tries} / ${maxTries}]`, ...any),
				error: (...any) => log.error(`[init ${tries}/${maxTries}]`, ...any),
				warn: (...any) => log.warn(`[init ${tries} / ${maxTries}]`, ...any)
			}, process.env.client);
		} catch (e) {
			tries.current++;
			log.error(`[init ${tries.current}/${tries.max}] Failed to initialize: ${e}`);
		}
	}
};

main();