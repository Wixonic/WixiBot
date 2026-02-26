const { GatewayIntentBits } = require("discord.js");
const { log } = require("@wixonic/logger");

const Bot = require("./lib/bot.js");
const CommandHandler = require("./lib/commands.js");
const Settings = require("./lib/settings.js");
const RPC = require("./lib/rpc.js");
const SDK = require("./lib/sdk.js");
const Server = require("./lib/server.js");
const { clone } = require("./lib/utils.js");

log.displayDate = false;

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} applicationId
 */
const init = async (logger, applicationId) => {
	const settings = Settings.get(applicationId);

	if (settings.active) {
		const server = new Server(logger, settings);

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

		await bot.login(server);

		const rpc = new RPC(logger, settings);

		await rpc.login();

		const sdk = new SDK(logger, settings);

		await sdk.login();

		await server.init(bot, rpc, sdk);
	} else logger.warn("Application disabled.");
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

	await commandHandler.deployCommands(applicationId, settings.application.token, settings.application.guildId);
	logger.info("Successfully published commands.");

	logger.info("Republishing rules and ticket prompts...");
	try {
		const { Client, GatewayIntentBits } = require("discord.js");
		const client = new Client({ intents: [GatewayIntentBits.Guilds] });
		client.settings = settings;
		await client.login(settings.application.token);

		const rulesCmd = require("./commands/rules.js");
		const ticketCmd = require("./commands/ticket.js");

		const fakeInteraction = {
			deferReply: async () => { },
			followUp: async (msg) => logger.info(msg),
			guild: await client.guilds.fetch(settings.application.guildId)
		};

		// Pass the logged-in client to the commands as the 'bot' object
		await rulesCmd.run(logger, client, null, fakeInteraction);
		await ticketCmd.run(logger, client, null, fakeInteraction);

		client.destroy();
		logger.info("Successfully republished rules and tickets.");
	} catch (e) {
		logger.error("Error republishing:", e);
	}

	process.exit(0);
};


const main = async (logger) => {
	if (!process.env.client) {
		logger.error("Missing client environment argument.");
		process.exit(1);
	}

	const handler = clone(logger);
	handler.error = (...any) => {
		let stacks = "";
		any.forEach((el) => {
			if (el instanceof Error) {
				stacks += el.stack;
				el = `${el.name}: ${el.message}`;
			}
		});
		logger.error(...any);
		if (stacks.length > 0) logger.debug("{Stack}", stacks.replaceAll("\n", "<br />"));
		process.exit(1);
	};

	process.on("uncaughtException", (e) => handler.error("Uncaught exception:", e));
	process.on("unhandledRejection", (e) => handler.error("Unhandled rejection:", e));

	try {
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
				await init({
					debug: (...any) => handler.debug(...any),
					error: (...any) => handler.error(...any),
					info: (...any) => handler.info(...any),
					warn: (...any) => handler.warn(...any)
				}, process.env.client);
				break;
		};
	} catch (e) {
		handler.error(e);
	}
};

main(log);