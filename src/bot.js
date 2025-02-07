const { Client } = require("discord.js");

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
			info: (...any) => logger.info("[Client]", ...any),
			error: (...any) => {
				request({
					debug: (...any) => logger.debug("[Client]", ...any),
					info: (...any) => logger.info("[Client]", ...any),
					error: (...any) => logger.error("[Client]", ...any),
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
			warn: (...any) => logger.warn("[Client]", ...any)
		};
	};

	/**
	 * @param {string} token
	 */
	async login(token) {
		try {
			this.logger.debug("Attempting to log in...");
			const result = await super.login(token);
			this.logger.info("Successfully logged in");
			return result;
		} catch (e) {
			this.logger.error("Failed to login:", e);
		}
	};

	async init() {
		this.logger.debug("Initializing...");

		// Initialize everything

		this.logger.error("This is a test");

		this.logger.info("Successfully initialized");
	};

	async destroy() {
		// Destroy everything
		this.logger = {
			debug: new Function(),
			error: new Function(),
			info: new Function(),
			warn: new Function()
		};
		await super.destroy();
	};
};

module.exports = {
	Bot
};