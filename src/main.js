const { GatewayIntentBits } = require("discord.js");

const { Bot } = require("./bot.js");
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

	if (await bot.login(settings.application.token)) {
		try {
			await bot.init();
		} catch {
			await bot.destroy();
		}
	} else throw "Failed to start client";
};


/**
 * @param {Logger} logger
 * @param {string} applicationId
 */
const deploy = async (logger, applicationId) => {
	const settings = new Settings(applicationId);
};

/**
 * @param {Logger} logger
 */
const main = async (logger) => {
	const tries = {
		current: 0,
		max: 10,
		delay: 1,
		get text() {
			return `[Init ${String(this.current).padStart(String(this.max).length, "0")}/${this.max}]`;
		}
	};

	const execute = async () => {
		tries.current++;

		try {
			await init({
				debug: (...any) => logger.debug(tries.text, ...any),
				info: (...any) => logger.info(tries.text, ...any),
				error: (...any) => {
					logger.error(tries.text, ...any);
					throw "--already-logged--";
				},
				warn: (...any) => logger.warn(tries.text, ...any)
			}, process.env.client);
		} catch (e) {
			if (e != "--already-logged--") logger.error(tries.text, "Failed to initialize:", e);

			if (tries.current < tries.max) await wait(tries.delay * tries.current * 1000);
			else {
				logger.warn("-".repeat(tries.text.length), "Failed to initialize. Restarting in 5 minutes.");
				await wait(5 * 60 * 60 * 1000);
				tries.current = 0;
			}

			await execute();
		}
	};

	await execute();
};

main(log);