const { Client } = require("discord.js");

const CommandHandler = require("./commands.js");
const ListenerHandler = require("./listeners.js");
const { colors } = require("./log.js");
const request = require("./request.js");

class Bot extends Client {
	/**
	 * @param {Logger} logger
	 * @param {{intents: import("discord.js").GatewayIntentBits[], webhook: URL | string}} options
	 */
	constructor(logger, options) {
		super({
			intents: options.intents
		});

		if (URL.canParse(options.webhook)) this.webhook = new URL(options.webhook);
		else logger.error("[Client]", "Failed to parse Webhook");

		this.logger = {
			debug: (...any) => logger.debug("[Client]", ...any),
			error: (...any) => {
				request({
					debug: (...any) => logger.debug("[Client]", ...any),
					error: (...any) => logger.error("[Client]", ...any),
					info: (...any) => logger.info("[Client]", ...any),
					warn: (...any) => logger.warn("[Client]", ...any)
				}, {
					body: JSON.stringify({
						content: `\`\`\`${["[Client]", ...any].join(" ").replace(colors.regexp, "")}\`\`\``
					}),
					headers: {
						"Content-Type": "application/json"
					},
					method: "POST",
					type: "json",
					url: this.webhook
				});

				logger.error("[Client]", ...any);
			},
			info: (...any) => logger.info("[Client]", ...any),
			warn: (...any) => logger.warn("[Client]", ...any)
		};

		this.commandHandler = new CommandHandler({
			debug: (...any) => this.logger.debug("[Commands]", ...any),
			error: (...any) => this.logger.error("[Commands]", ...any),
			info: (...any) => this.logger.info("[Commands]", ...any),
			warn: (...any) => this.logger.warn("[Commands]", ...any)
		});

		this.listenerHandler = new ListenerHandler({
			debug: (...any) => this.logger.debug("[Listeners]", ...any),
			error: (...any) => this.logger.error("[Listeners]", ...any),
			info: (...any) => this.logger.info("[Listeners]", ...any),
			warn: (...any) => this.logger.warn("[Listeners]", ...any)
		});

		this.destroyed = false;
		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
			process.on(signal, async (reason, code) => {
				if (!this.destroyed) {
					this.destroyed = true;
					if (reason != "Error: --restart--") this.logger.warn("Destroying... | Reason:", reason ?? "Unknown", "| Code:", code ?? "None");

					try {
						await this.destroy();
						this.logger.debug("Destroyed.");
					} catch (e) {
						this.logger.error("Failed to exit:", e);
					}
				}
			});
		}
	};

	/**
	 * @param {string} token
	 */
	async login(token) {
		try {
			this.logger.debug("Attempting to log in...");
			await super.login(token);
			this.logger.info("Successfully logged in");

			this.commandHandler.loadCommands(this.application.id);
			this.listenerHandler.loadListeners(this);
		} catch (e) {
			this.logger.error("Failed to login:", e);
		}
	};

	async destroy() {
		this.listenerHandler.destroy(this);
		this.emit("destroy");
		await super.destroy();
		process.exit();
	};
};

module.exports = Bot;