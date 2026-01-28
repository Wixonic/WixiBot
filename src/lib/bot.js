const { Client } = require("discord.js");
const { colors } = require("@wixonic/logger");

const CommandHandler = require("./commands.js");
const ComponentHandler = require("./components.js");
const CronHandler = require("./crons.js");
const ListenerHandler = require("./listeners.js");
const ModalHandler = require("./modals.js");

const request = require("./request.js");

class Bot extends Client {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {{intents: import("discord.js").GatewayIntentBits[], webhook: URL | string}} options
	 * @param {import("../types.d.ts").MainSettings} settings
	 */
	constructor(logger, options, settings) {
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
				}).then(() => logger.error("[Client]", ...any));
			},
			info: (...any) => logger.info("[Client]", ...any),
			warn: (...any) => logger.warn("[Client]", ...any)
		};

		this.settings = settings;

		this.commandHandler = new CommandHandler(logger);
		this.componentHandler = new ComponentHandler(logger);
		this.cronHandler = new CronHandler(logger);
		this.listenerHandler = new ListenerHandler(logger);
		this.modalHandler = new ModalHandler(logger);

		const processSignal = async (reason, code) => {
			if (!this.destroyed) {
				this.destroyed = true;
				this.logger.warn("Destroying... | Reason:", reason ?? "Unknown", "| Code:", code ?? "None");

				try {
					await this.destroy(code);
				} catch (e) {
					this.logger.error("Failed to exit:", e);
				}
			};
		};

		this.destroyed = false;
		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, (reason, code) => processSignal(reason, code));
		process.on("uncaughtException", (e) => this.logger.error(e));
		process.on("unhandledRejection", (e) => this.logger.error(e));
	};

	/** @param {import("./server.js")} server */
	async login(server) {
		try {
			this.logger.debug("Attempting to log in...");
			await super.login(this.settings.application.token);
			this.logger.info("Successfully logged in");

			this.commandHandler.loadCommands();
			this.componentHandler.loadComponents();
			this.cronHandler.loadCrons();
			this.listenerHandler.loadListeners(this, server);
			this.modalHandler.loadModals();

			this.cronHandler.init(this);
		} catch (e) {
			this.logger.error("Failed to login:", e);
		}
	};

	async destroy(code) {
		this.cronHandler.destroy();
		this.listenerHandler.destroy(this);

		this.emit("destroy");
		await super.destroy();

		process.exit(typeof code === "number" ? code : 1);
	};
};

module.exports = Bot;