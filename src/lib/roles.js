class Role {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @param {string} roleId
	 */
	constructor(logger, bot, roleId) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug(`[Role ${memberId}]`, ...any),
			error: (...any) => logger.error(`[Role ${memberId}]`, ...any),
			info: (...any) => logger.info(`[Role ${memberId}]`, ...any),
			warn: (...any) => logger.warn(`[Role ${memberId}]`, ...any)
		};

		this.bot = bot;
		this.roleId = roleId;

		/**
		 * @type {import("discord.js").Role?}
		 */
		this.role = null;
	};

	async init() {
		try {
			const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
			this.role = await guild.roles.fetch(this.roleId);
			if (!this.role) throw new Error("Invalid role: role not found");
		} catch (e) {
			this.logger.error("Failed to initialize:", e);
		}
	};
};