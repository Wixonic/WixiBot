const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { displayTime, hexToIntColor } = require("./utils.js");

class Rank {
	static convert = {
		"1": (data) => {
			return {
				version: "2",
				messages: {
					global: data.messages ?? 0,
					month: 0
				},
				roles: data.roles ?? [],
				voice: {
					time: {
						global: data.voice?.time ?? 0,
						month: 0
					},
					startedAt: data.voice?.startedAt ?? null
				}
			};
		},
		"2": (data) => {
			return {
				version: "3",
				eliteOfTheMonth: [],
				messages: {
					global: data.messages?.global ?? 0,
					month: data.messages?.month ?? 0
				},
				roles: data.roles ?? [],
				voice: {
					global: 0,
					month: 0,
					startedAt: null
				},
				penalty: 0
			};
		}
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @param {string} memberId
	 * @returns {Rank}
	 */
	static get(logger, bot, memberId) {
		const memberPath = bot.settings.paths.rank(bot.settings.application.guildId, memberId);

		if (!fs.existsSync(memberPath)) return new this(logger, bot, memberId);
		else {
			try {
				return new this(logger, bot, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				logger.warn(`[Rank] Error reading rank data:`, e);
				return new this(logger, bot, memberId);
			}
		}
	};

	/**
	 * @param {number} rank
	 * @returns {string}
	 */
	static getRankText = (rank) => rank == -1 ? "Unranked" : `${rank + 1}${["st", "nd", "rd"][((rank + 1 + 90) % 100 - 10) % 10 - 1] || "th"}`;


	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @returns {import("../types.d.ts").Leaderboard}
	*/
	static getLeaderboard = (logger, bot) => {
		let leaderboard = {
			global: [],
			month: [],
			updatedAt: Date.now(),
			eliteOfTheMonth: null
		};

		const leaderboardPath = bot.settings.paths.leaderboard(bot.settings.application.guildId);

		try {
			leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, "utf-8"));
		} catch (e) {
			logger.warn("Error reading leaderboard:", e);
		}

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @returns {import("../types.d.ts").Leaderboard}
	 */
	static updateLeaderboard(logger, bot) {
		const guildPath = bot.settings.paths.ranks(bot.settings.application.guildId);
		const leaderboardPath = bot.settings.paths.leaderboard(bot.settings.application.guildId);

		/**
		 * @type {import("../types.d.ts").Leaderboard}
		 */
		const leaderboard = {
			global: [],
			month: [],
			updatedAt: Date.now(),
			eliteOfTheMonth: null
		};

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (file.endsWith(".json")) {
					try {
						const rank = this.get(logger, bot, file.replace(".json", ""));

						if (rank) {
							if (rank.points.global > 0) leaderboard.global.push({
								id: rank.memberId,
								points: rank.points.global
							});

							if (rank.points.month > 0) leaderboard.month.push({
								id: rank.memberId,
								points: rank.points.month
							});
						} else logger.warn(`[Rank] Error reading rank data for file ${file}:`, e);
					} catch (e) {
						logger.error(`[Rank] Error reading rank data for file ${file}:`, e);
					}
				}
			}

			leaderboard.global.sort((rankA, rankB) => rankB.points - rankA.points);
			leaderboard.month.sort((rankA, rankB) => rankB.points - rankA.points);

			for (const user of leaderboard.month) {
				if (user.points > 0) {
					if (!bot.settings.application.commands.ranks.ignored.includes(user.id)) {
						leaderboard.eliteOfTheMonth = user;
						break;
					} else logger.debug(`Ignoring user "${user.id}"`);
				} else break;
			}
		}

		if (!fs.existsSync(path.dirname(leaderboardPath))) fs.mkdirSync(path.dirname(leaderboardPath), { recursive: true });
		fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard));

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @returns {Promise<import("../types.d.ts").Leaderboard>}
	 */
	static async resetLeaderboard(logger, bot) {
		const guildPath = bot.settings.paths.ranks(bot.settings.application.guildId);

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (![".DS_Store"].includes(file)) {
					try {
						const rank = this.get(logger, bot, file.replace(".json", ""));

						rank.messages.month = 0;
						rank.voice.month = 0;

						await rank.save();
					} catch (e) {
						logger.error(`[Rank] Error reading rank data for file ${file}:`, e);
					}
				}
			}
		}

		return this.updateLeaderboard(logger, bot);
	};

	/**
	 * @param {import("discord.js").GuildMember} member
	 * @param {import("discord.js").VoiceBasedChannel} channel
	 */
	static canGetPoint(member, channel) {
		let count = 0;
		let muted = 0;
		let deafen = 0;
		for (const channelMember of channel.members.values()) {
			if (!channelMember.user.bot) count++;
			if (!channelMember.user.bot && channelMember.voice.mute && !channelMember.voice.suppress) muted++;
			if (!channelMember.user.bot && channelMember.voice.deaf) deafen++;
		}

		const valid = !member.user.bot && count > 1 && !member.voice.mute && !member.voice.deaf && (count - muted) > 1 && (count - deafen) > 1;
		return valid;
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
			debug: (...any) => logger.debug(`[Rank ${memberId}]`, ...any),
			error: (...any) => logger.error(`[Rank ${memberId}]`, ...any),
			info: (...any) => logger.info(`[Rank ${memberId}]`, ...any),
			warn: (...any) => logger.warn(`[Rank ${memberId}]`, ...any)
		};

		this.bot = bot;

		if (data) {
			let converted = false;
			if (data.version != "3") {
				if (data.version == null || data.version == "1") data = Rank.convert["1"](data);
				if (data.version == "2") data = Rank.convert["2"](data);
				converted = true;
				this.logger.info(`Converting rank data for member "${memberId}"`);
			}

			this.memberId = memberId;

			this.eliteOfTheMonth = data.eliteOfTheMonth;
			this.messages = data.messages;
			this.roles = data.roles;
			this.voice = data.voice;
			this.penalty = data.penalty;

			if (converted) this.save();
		} else {
			this.memberId = memberId;

			this.eliteOfTheMonth = [];
			this.messages = {
				global: 0,
				month: 0
			};
			this.roles = [];
			this.voice = {
				global: 0,
				month: 0,
				startedAt: null
			};
			this.penalty = 0;

			this.save();
		}
	};

	get points() {
		return {
			global: this.bot.settings.application.commands.ranks.points.messages * this.messages.global + this.bot.settings.application.commands.ranks.points.voice * this.voice.global - this.penalty,
			month: this.bot.settings.application.commands.ranks.points.messages * this.messages.month + this.bot.settings.application.commands.ranks.points.voice * this.voice.month - this.penalty
		};
	};

	async addMessage() {
		this.messages.global++;
		this.messages.month++;
		this.logger.debug("Incremented message count");
		await this.save();
	};

	async voiceStart() {
		this.voice.startedAt = Date.now();
		this.logger.debug("Started recording voice time");
		await this.save();
	};

	async voiceStop() {
		if (this.voice.startedAt != null) {
			this.voice.global += Math.ceil((Date.now() - this.voice.startedAt) / 1000);
			this.voice.month += Math.ceil((Date.now() - this.voice.startedAt) / 1000);
			this.voice.startedAt = null;
			this.logger.debug("Stopped recording voice time");
			await this.save();
		}
	};

	/**
	 * @param {number} amount
	 * @param {import("discord.js").GuildMember} by
	 * @param {string?} reason
	 */
	async applyPenalty(amount, by, reason) {
		this.penalty += amount;
		this.logger.debug("Applied a penalty of", amount);

		const moderationChannel = await this.bot.channels.fetch(this.bot.settings.application.moderationChannel);
		if (moderationChannel && moderationChannel.isSendable()) await moderationChannel.send({
			allowedMentions: {},
			embeds: [
				{
					title: "Rank penalty",
					color: hexToIntColor("#FF0000"),
					fields: [{
						name: "Author",
						value: `<@${by.id}>`,
						inline: true
					}, {
						name: "Target",
						value: `<@${this.memberId}>`,
						inline: true
					}, {
						name: "Penalty",
						value: `${amount} point${Math.abs(amount) == 1 ? "" : "s"}`,
						inline: true
					}, {
						name: "Reason",
						value: reason ?? "Unknown reason"
					}]
				}
			],
			flags: process.env.silent == "true" ? MessageFlags.SuppressNotifications : null
		});
		else logger.warn("Invalid moderation channel:", this.bot.settings.application.moderationChannel);

		await this.save();
	};

	/**
	 * @param {Date} date
	 */
	async addElite(date) {
		this.eliteOfTheMonth.push(Math.floor(date.getTime() / 1000));
		this.logger.debug("Won monthly leaderboard");
		await this.save();
	};

	get description() {
		const rank = this.rank;
		return `## <@${this.memberId}>\n### Ranks\n- Global: ${Rank.getRankText(rank.global)} (${Math.ceil(this.points.global)} points)\n- Monthly: ${Rank.getRankText(rank.month)} (${Math.ceil(this.points.month)} points)\n-# Last updated: <t:${Math.floor(rank.updatedAt / 1000)}:R>\n### Stats\n- Messages sent: ${this.messages.global} (${this.messages.month} this month)\n- Time spent in voice channels: ${displayTime(this.voice.global)} (${displayTime(this.voice.month)} this month)` + (this.eliteOfTheMonth.length > 0 ? `\n### Elite of the Month\n- <t:${this.eliteOfTheMonth.join(":D>\n- <t:")}:D>` : "");
	};

	get rank() {
		const leaderboard = Rank.getLeaderboard(this.logger, this.bot);
		return {
			global: leaderboard.global.findIndex((rank) => rank.id == this.memberId),
			month: leaderboard.month.findIndex((rank) => rank.id == this.memberId),
			updatedAt: leaderboard.updatedAt
		};
	};

	async save() {
		const rankSettings = this.bot.settings.application.commands.ranks;

		const roles = [];

		for (const role in rankSettings.roles) {
			if (rankSettings?.roles[role] <= this.points.global) roles.push(role);
		}

		if (this.roles.values() != roles.values()) {
			try {
				const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);

				try {
					const member = await guild.members.fetch(this.memberId);

					for (const roleId of this.roles) {
						const role = await guild.roles.fetch(roleId);

						if (!role) this.logger.info(`Removed role "${roleId}" because it no longer exists.`);
						else if (!roles.includes(roleId)) {
							try {
								await member.roles.remove(role);
								this.logger.info(`Role removed: "${role.name}" (${role.id})`);
							} catch (e) {
								this.logger.error(`Error removing role "${role.name}" (${role.id}):`, e);
							}
						}
					}

					for (const roleId of roles) {
						const role = await guild.roles.fetch(roleId);

						if (!role) this.logger.error(`Error adding role "${role.id}": Role does not exist`);
						else if (!this.roles.includes(roleId)) {
							try {
								const channel = await guild.channels.fetch(rankSettings.channel);

								if (channel) await channel.send({
									content: `<@${this.memberId}> just unlocked a new rank role!`,
									embeds: [{
										title: role.name,
										description: `Reached ${rankSettings?.roles[role.id] ?? 0} point${(rankSettings?.roles[role.id] ?? 0) == 1 ? "" : "s"}`,
										color: role.color
									}],
									flags: process.env.silent == "true" ? MessageFlags.SuppressNotifications : null
								});

								await member.roles.add(role);
								this.logger.info(`Role added: "${role.name}" (${role.id})`);
							} catch (e) {
								this.logger.error(`Error adding role "${role.name}" (${role.id}):`, e);
							}
						}
					}

					this.roles = roles;
				} catch {
					fs.rmSync(memberPath, "utf-8");
					fs.writeFileSync(memberPath + ".old", JSON.stringify({
						version: "3",
						eliteOfTheMonth: this.eliteOfTheMonth,
						messages: this.messages,
						roles: this.roles,
						voice: this.voice,
						penalty: this.penalty
					}), "utf-8");
					return this.logger.warn("Member not found:", this.memberId);
				}
			} catch {
				this.logger.warn("Guild not found:", this.bot.settings.application.guildId);
			}
		}

		const memberPath = this.bot.settings.paths.rank(this.bot.settings.application.guildId, this.memberId);

		if (!fs.existsSync(path.dirname(memberPath))) fs.mkdirSync(path.dirname(memberPath), { recursive: true });
		fs.writeFileSync(memberPath, JSON.stringify({
			version: "3",
			eliteOfTheMonth: this.eliteOfTheMonth,
			messages: this.messages,
			roles: this.roles,
			voice: this.voice,
			penalty: this.penalty
		}), "utf-8");
	}
};

module.exports = Rank;