const { GatewayIntentBits } = require("discord.js");

const { Bot } = require("./bot.js");
const Command = require("./commands.js");
const { Settings } = require("./settings.js");

const { log } = require("./log.js");
const { wait } = require("./utils.js");

/**
 * @param {Logger} logger
 * @param {string} applicationId
 */
const init = async (logger, applicationId) => {
	const settings = new Settings(applicationId);

	const bot = new Bot(logger, {
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
		webhook: settings.application.webhook
	});

	await bot.login(settings.application.token);

	await Command.init({
		debug: (...any) => logger.debug("[Commands]", ...any),
		error: (...any) => logger.error("[Commands]", ...any),
		info: (...any) => logger.info("[Commands]", ...any),
		warn: (...any) => logger.warn("[Commands]", ...any)
	});
};


/**
 * @param {Logger} logger
 * @param {string} applicationId
 */
const publish = async (logger, applicationId) => {
	logger.warn("Publishing...");
	const settings = new Settings(applicationId);
	logger.info("Successfully published.");

	process.exit(0);
};

/**
 * @param {Logger} logger
 */
const main = async (logger) => {
	const tries = {
		current: 0,
		max: 10,
		delay: 2,
		get text() {
			return `${String(this.current).padStart(String(this.max).length, "0")}/${this.max}`;
		}
	};

	const execute = async () => {
		tries.current++;

		try {
			switch (process.env.mode) {
				case "publish":
					await publish({
						debug: (...any) => logger.debug(`[PUBLISH ${tries.text}]`, ...any),
						error: (...any) => { logger.error(`[PUBLISH ${tries.text}]`, ...any); throw "--already-logged--" },
						info: (...any) => logger.info(`[PUBLISH ${tries.text}]`, ...any),
						warn: (...any) => logger.warn(`[PUBLISH ${tries.text}]`, ...any)
					}, process.env.client);
					break;

				default:
					await init({
						debug: (...any) => logger.debug(`[RUN ${tries.text}]`, ...any),
						error: (...any) => { logger.error(`[RUN ${tries.text}]`, ...any); throw "--already-logged--" },
						info: (...any) => logger.info(`[RUN ${tries.text}]`, ...any),
						warn: (...any) => logger.warn(`[RUN ${tries.text}]`, ...any)
					}, process.env.client);
					break;
			}
		} catch (e) {
			if (e != "--already-logged--") logger.error(`[INIT ${tries.text}]`, e);
			if (tries.current < tries.max) await wait(tries.delay * tries.current * 1000);
			else {
				logger.warn("-".repeat(tries.text.length), "Failed to initialize. Restarting in 5 minutes.");
				await wait(5 * 60 * 1000);
				tries.current = 0;
			}
			await execute();
		}
	};

	await execute();
};

main(log);