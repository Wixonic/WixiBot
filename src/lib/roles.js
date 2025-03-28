class Role {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 */
	static list(logger, bot) {
		const file = bot.settings.paths.roles;

		if (fs.existsSync(file)) {
			try {
				const content = require(file);

				const data = {
					roles: {
						all: [],
						available: [],
						locked: []
					},
					recurrentRoles: {
						active: [],
						all: []
					}
				};

				for (const role of content.roles) data.roles.all.push(new Role(logger, bot, role.id, role));

				// TODO: Parse all type of roles

				return data;
			} catch (e) {
				logger.error("Failed to parse roles list:", e);
			}
		}

		return {
			roles: {
				all: [],
				available: [],
				locked: []
			},
			recurrentRoles: {
				active: [],
				all: []
			}
		};
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @param {string} roleId
	 */
	constructor(logger, bot, roleId, data) {
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

		this.category = data?.category;
		this.description = data?.description;
		this.requirements = data?.requirements;
	};

	async fetch() {
		try {
			const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
			this.role = await guild.roles.fetch(this.roleId);
			if (!this.role) throw new Error("Invalid role: role not found");
		} catch (e) {
			this.logger.error("Failed to initialize:", e);
		}
	};
};

module.exports = Role;