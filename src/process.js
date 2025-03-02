const { GatewayIntentBits } = require("discord.js");
const { log } = require("@wixonic/logger");

const Bot = require("./lib/bot.js");
const CommandHandler = require("./lib/commands.js");
const Settings = require("./lib/settings.js");
const { clone } = require("./lib/utils.js");

log.displayDate = false;

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} applicationId
 */
const init = async (logger, applicationId) => {
	const settings = Settings.get(applicationId);

	const bot = new Bot(logger, {
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildModeration,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildPresences,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.DirectMessageReactions,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildScheduledEvents
		],
		webhook: settings.application.webhook
	}, settings);

	await bot.login(settings.application.token, settings);
};


/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} applicationId
 */
const publish = async (logger, applicationId) => {
	logger.warn("Publishing...");
	const settings = Settings.get(applicationId);

	const commandHandler = new CommandHandler(logger);
	commandHandler.loadCommands();

	await commandHandler.deployCommands(applicationId, settings.application.token);
	logger.info("Successfully published.");

	process.exit(0);
};


const main = async (logger) => {
	if (!process.env.client) {
		logger.error("Missing client environment argument.");
		process.exit(1);
	}

	try {
		const handler = clone(logger);
		handler.error = (...any) => {
			let stacks = "";
			any.forEach((el) => {
				if (el instanceof Error) {
					stacks += el.stack ?? "";
					el = `${el.name}: ${el.message}`;
				}
			});
			logger.error(...any);

			if (stacks.length > 0) logger.debug("Stack:", stacks.replaceAll("\n", "<br />"));

			throw new Error("--restart--");
		};

		switch (process.env.mode) {
			case "publish":
				await publish({
					debug: (...any) => handler.debug("[PUBLISH]", ...any),
					error: (...any) => handler.error("[PUBLISH]", ...any),
					info: (...any) => handler.info("[PUBLISH]", ...any),
					warn: (...any) => handler.warn("[PUBLISH]", ...any)
				}, process.env.client);
				break;

			default:
				await init(handler, process.env.client);
				break;
		};
	} catch (e) {
		logger.error(e);
		process.exit(1);
	}
};

main(log);