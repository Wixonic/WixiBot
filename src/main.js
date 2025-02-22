const { GatewayIntentBits } = require("discord.js");
const { colors, log } = require("@wixonic/logger");

const Bot = require("./lib/bot.js");
const CommandHandler = require("./lib/commands.js");
const Settings = require("./lib/settings.js");
const { wait } = require("./lib/utils.js");

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} applicationId
 */
const init = async (logger, applicationId) => {
	const settings = new Settings(applicationId);

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

	await bot.login(settings.application.token);
};


/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {string} applicationId
 */
const publish = async (logger, applicationId) => {
	logger.warn("Publishing...");
	const settings = new Settings(applicationId);

	const commandHandler = new CommandHandler(logger);
	commandHandler.loadCommands();

	await commandHandler.deployCommands(applicationId, settings.application.token);
	logger.info("Successfully published.");

	process.exit(0);
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 */
const main = async (logger) => {
	const tries = {
		current: 0,
		max: 10,
		delay: 3,
		get text() {
			return `${String(this.current).padStart(String(this.max).length, "0")}/${this.max}`;
		}
	};

	const restart = async () => {
		if (tries.current < tries.max) await wait(tries.delay * tries.current * 1000);
		else {
			logger.warn("-".repeat(tries.text.length), "Exceeded maximum number of retries. Restarting in 5 minutes.");
			await wait(5 * 60 * 1000);
			tries.current = 0;
		}
		await execute();
	};

	process.on("unhandledRejection", (e) => {
		if (e.message != "--restart--") log.error(`Unhandled Rejection at [INIT ${tries.text}]:`, e.message);
		if (e.stack) console.log(colors.error + e.stack.split("\n").slice(1).join("\n"));
		if (e.cause) log.debug("Cause:", e.cause);
		if (e.message == "--restart--") restart();
		else process.exit(1);
	});

	process.on("uncaughtException", (e) => {
		if (e.message != "--restart--") log.error(`Uncaught Exception at [INIT ${tries.text}]:`, e.message);
		if (e.stack) console.log(colors.error + e.stack.split("\n").slice(1).join("\n"));
		if (e.cause) log.debug("Cause:", e.cause);
		if (e.message == "--restart--") restart();
		else process.exit(1);
	});

	const execute = async () => {
		tries.current++;

		switch (process.env.mode) {
			case "publish":
				await publish({
					debug: (...any) => logger.debug(`[PUBLISH ${tries.text}]`, ...any),
					error: (...any) => { logger.error(`[PUBLISH ${tries.text}]`, ...any); throw new Error("--restart--") },
					info: (...any) => logger.info(`[PUBLISH ${tries.text}]`, ...any),
					warn: (...any) => logger.warn(`[PUBLISH ${tries.text}]`, ...any)
				}, process.env.client);
				break;

			default:
				await init({
					debug: (...any) => logger.debug(`[RUN ${tries.text}]`, ...any),
					error: (...any) => { logger.error(`[RUN ${tries.text}]`, ...any); throw new Error("--restart--") },
					info: (...any) => logger.info(`[RUN ${tries.text}]`, ...any),
					warn: (...any) => logger.warn(`[RUN ${tries.text}]`, ...any)
				}, process.env.client);
				break;
		}
	};

	await execute();
};

main(log);