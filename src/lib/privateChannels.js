const { PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

class PrivateChannel {
	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @param {string} memberId
	 * @returns {Promise<PrivateChannel?>}
	 */
	static async get(logger, bot, memberId) {
		const memberPath = bot.settings.paths.privateChannel(bot.settings.application.guildId, memberId);

		if (fs.existsSync(memberPath)) {
			try {
				const privateChannel = new this(logger, bot, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
				if (privateChannel) {
					const channel = await bot.channels.fetch(privateChannel.id);

					if (channel) return privateChannel;
					else fs.rmSync(memberPath);
				} else fs.rmSync(memberPath);
			} catch (e) {
				logger.warn(`[Private Channels] Error reading private channel data:`, e);
				fs.rmSync(memberPath);
			}
		}

		return null;
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./bot.js")} bot
	 * @param {string} memberId
	 */
	constructor(logger, bot, memberId, data) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug(`[Private channel ${memberId}]`, ...any),
			error: (...any) => logger.error(`[Private channel ${memberId}]`, ...any),
			info: (...any) => logger.info(`[Private channel ${memberId}]`, ...any),
			warn: (...any) => logger.warn(`[Private channel ${memberId}]`, ...any)
		};

		this.bot = bot;
		this.memberId = memberId;
		this.id = data.channel;
	}

	async isPublic() {
		const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
		const channel = await guild.channels.fetch(this.id);
		if (!channel) return false;

		return channel.permissionOverwrites.cache.get(guild.roles.everyone.id)
			.allow.has(PermissionFlagsBits.ViewChannel);
	}

	async getMembers() {
		const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
		const channel = await guild.channels.fetch(this.id);
		if (!channel) return [];

		return channel.permissionOverwrites.cache
			.filter((overwrite) => overwrite.id != guild.roles.everyone.id && overwrite.allow.has(PermissionFlagsBits.ViewChannel))
			.map((overwrite) => overwrite.id);
	}

	async addMember(memberId) {
		const channel = await this.bot.channels.fetch(this.id);
		if (channel) await channel.permissionOverwrites.create(memberId, { ViewChannel: true });
	}

	async removeMember(memberId) {
		const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
		const member = await guild.members.fetch(memberId);
		const channel = await guild.channels.fetch(this.id);

		if (channel) {
			await channel.permissionOverwrites.delete(memberId);
			if (member.voice.channel?.id == channel.id) await member.voice.disconnect("Permission removed");
		}
	}

	async setPublic() {
		const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
		const channel = await guild.channels.fetch(this.id);

		if (channel) channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
	}

	async setPrivate() {
		const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);
		const channel = await guild.channels.fetch(this.id);

		if (channel) channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
	}

	async save() {
		const memberPath = this.bot.settings.paths.privateChannel(this.bot.settings.application.guildId, this.memberId);

		if (!fs.existsSync(path.dirname(memberPath))) fs.mkdirSync(path.dirname(memberPath), { recursive: true });
		fs.writeFileSync(memberPath, JSON.stringify({
			channel: this.id
		}), "utf-8");
	}
};

module.exports = PrivateChannel;