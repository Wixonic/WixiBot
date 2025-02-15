const { Client } = require("discord.js");

const ChatHandler = require("./chat.js");
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
				request(logger.basicIndent("[Client]"), {
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
			warn: (...any) => logger.warn("[Client]", ...any),
			basicIndent: (...any) => logger.basicIndent("[Client]", ...any)
		};

		this.chatHandler = new ChatHandler(this.logger.basicIndent("[Ollama]"));
		this.commandHandler = new CommandHandler(this.logger.basicIndent("[Commands]"));
		this.listenerHandler = new ListenerHandler(this.logger.basicIndent("[Listeners]"));

		this.destroyed = false;
		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
			process.on(signal, async (reason, code) => {
				if (!this.destroyed) {
					this.destroyed = true;
					this.logger.warn("Destroying... | Reason:", reason ?? "Unknown", "| Code:", code ?? "None");

					try {
						await this.destroy();
						this.logger.debug("Destroyed.");
					} catch (e) {
						this.logger.error("Failed to exit:", e);
					}

					process.exit(code);
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
		await super.destroy();
	};
};

module.exports = {
	Bot
};