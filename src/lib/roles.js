const { ButtonStyle, ComponentType, MessageFlags } = require("discord.js");
const fs = require("fs");

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
					categories: [],
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

				const now = new Date();

				for (const category of content.categories) data.categories.push(category);

				for (const role of content.roles) {
					data.roles.all.push(role);
					if (role.requirements) data.roles.locked.push(role);
					else data.roles.available.push(role);
				}

				for (const role of content.recurrentRoles) {
					data.recurrentRoles.all.push(role);

					const from = new Date(`${now.getUTCFullYear()}-${role.from}`);
					const to = new Date(`${now.getUTCFullYear()}-${role.to}`);
					if (now.getTime() >= from.getTime() && now.getTime() <= to.getTime()) data.recurrentRoles.active.push(role);
				}

				return data;
			} catch (e) {
				logger.error("Failed to parse roles list:", e);
			}
		}

		return {
			categories: [],
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
	 */
	static async update(logger, bot) {
		const now = new Date();
		const settings = bot.settings.application.commands.roles;

		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const channel = await guild.channels.fetch(settings.channel);

		if (channel && channel.isSendable()) {
			const messages = await channel.messages.fetch({
				limit: 10
			});

			for (const message of messages.values()) await channel.messages.delete(message);

			await channel.send({
				allowedMentions: {},
				content: "## Roles\nYou can claim any role by pressing a role button below.",
				flags: MessageFlags.SuppressNotifications
			});

			const list = this.list(logger, bot);

			for (const category of list.categories) {
				const categoryRoles = list.roles.all.filter((role) => role.category === category.id);

				if (categoryRoles.length > 0) {
					const roles = [];
					const buttons = [];

					for (const role of categoryRoles) {
						const guildRole = await guild.roles.fetch(role.id);

						if (guildRole) {
							roles.push(`- <@&${role.id}>: ${role.description}`);
							buttons.push({
								type: ComponentType.Button,
								custom_id: `claimRole_${role.id}`,
								label: guildRole.name ?? "Unknown role",
								style: ButtonStyle.Secondary
							});
						}
					}

					const components = [];
					for (let i = 0; i < buttons.length; i += 5) {
						components.push({
							type: ComponentType.ActionRow,
							components: buttons.slice(i, i + 5)
						});
					}

					if (buttons.length > 0) {
						await channel.send({
							allowedMentions: {},
							content: `### ${category.name}\n> ${category.description}\n${roles.join("\n")}`,
							components,
							flags: MessageFlags.SuppressNotifications
						});
					}
				} else logger.warn("Empty category");
			}

			const roles = [];
			const buttons = [];

			for (const role of list.recurrentRoles.active) {
				const guildRoles = await guild.roles.fetch();
				const guildRole = guildRoles.find((r) => r.name === `${role.name} ${now.getUTCFullYear()}`);

				const to = new Date(`${now.getUTCFullYear()}-${role.to}`);

				if (guildRole) {
					roles.push(`- <@&${role.id}>: available until <t:${Math.floor(to.getTime() / 1000)}:f>`);
					buttons.push({
						type: ComponentType.Button,
						custom_id: `claimRole_${role.id}_true`,
						label: guildRole.name ?? "Unknown role",
						style: ButtonStyle.Primary
					});
				}
			}

			const components = [];
			for (let i = 0; i < buttons.length; i += 5) {
				components.push({
					type: ComponentType.ActionRow,
					components: buttons.slice(i, i + 5)
				});
			}

			if (buttons.length > 0) {
				await channel.send({
					allowedMentions: {},
					content: `### Exclusive Roles\n> These roles are temporary and will be available only once!\n${roles.join("\n")}`,
					components,
					flags: MessageFlags.SuppressNotifications
				});
			}
		} else logger.error("Invalid channel:", settings.channel);
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