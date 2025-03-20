const fs = require("fs");
const path = require("path");

const { displayTime } = require("./utils.js");

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
				firstOfTheMonth: [],
				messages: {
					global: data.messages?.global ?? 0,
					month: data.messages?.month ?? 0
				},
				roles: data.roles ?? [],
				streak: {
					best: 0,
					count: 0,
					last: null
				},
				voice: {
					global: 0,
					month: 0,
					startedAt: null
				}
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
		const memberPath = path.join(bot.settings.paths.rank(bot.settings.application.guildId), memberId + ".json");

		if (!fs.existsSync(memberPath)) return new this(logger, bot, memberId);
		else {
			try {
				return new this(logger, bot, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				if (e?.stack) logger.warn("[Rank] Failed to read rank data:", e, e.stack.replaceAll("\n", "<br />"));
				else logger.warn("[Rank] Failed to read rank data:", e);
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
			firstOfTheMonth: null
		};

		const leaderboardPath = bot.settings.paths.leaderboard(bot.settings.application.guildId);
		try {
			leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, "utf-8"));
		} catch (e) {
			logger.warn("Failed to read leaderboard:", e);
		}

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("./bot.js")} bot
	 * @returns {import("../types.d.ts").Leaderboard}
	 */
	static updateLeaderboard(logger, bot) {
		const guildPath = bot.settings.paths.rank(bot.settings.application.guildId);
		const leaderboardPath = bot.settings.paths.leaderboard(bot.settings.application.guildId);

		/**
		 * @type {import("../types.d.ts").Leaderboard}
		 */
		const leaderboard = {
			global: [],
			month: [],
			updatedAt: Date.now(),
			firstOfTheMonth: null
		};

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (![".DS_Store"].includes(file)) {
					try {
						const rank = this.get(logger, bot, file.replace(".json", ""));

						if (rank) {
							leaderboard.global.push({
								id: rank.memberId,
								points: rank.points.global
							});

							leaderboard.month.push({
								id: rank.memberId,
								points: rank.points.month
							});
						} else logger.warn("[Rank]", `Failed to read rank data for file ${file}:`, e);
					} catch (e) {
						logger.error("[Rank]", `Failed to read rank data for file ${file}:`, e);
					}
				}
			}

			leaderboard.global.sort((rankA, rankB) => rankB.points - rankA.points);
			leaderboard.month.sort((rankA, rankB) => rankB.points - rankA.points);

			for (const user of leaderboard.month) {
				if (user.points > 0) {
					if (!settings.application.commands.rank.ignored.includes(user.memberId) && user.points > 0) {
						leaderboard.firstOfTheMonth = user;
						break;
					} else logger.debug(`User "${user.memberId}" ignored`);
				}
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
		const guildPath = bot.settings.paths.rank(bot.settings.application.guildId);

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (![".DS_Store"].includes(file)) {
					try {
						const rank = this.get(logger, bot, file.replace(".json", ""));

						rank.messages.month = 0;
						rank.voice.count.month = 0;
						rank.voice.time.month = 0;

						await rank.save();
					} catch (e) {
						logger.error(`[Rank] Failed to read rank data for file ${file}:`, e);
					}
				}
			}
		}

		return this.updateLeaderboard(logger, bot);
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
				this.logger.info(`Converting "${memberId}"'s rank data`);
			}

			this.memberId = memberId;

			this.firstOfTheMonth = data.firstOfTheMonth;
			this.messages = data.messages;
			this.roles = data.roles;
			this.streak = data.streak;
			this.voice = data.voice;

			if (converted) this.save();
		} else {
			this.memberId = memberId;

			this.firstOfTheMonth = [];
			this.messages = {
				global: 0,
				month: 0
			};
			this.roles = [];
			this.streak = {
				best: 0,
				count: 0,
				last: 0
			};
			this.voice = {
				global: 0,
				month: 0,
				startedAt: null
			};

			this.save();
		}
	};

	get points() {
		return {
			global: this.bot.settings.application.commands.rank.points.messages * this.messages.global + this.bot.settings.application.commands.rank.points.voice * this.voice.global,
			month: this.bot.settings.application.commands.rank.points.messages * this.messages.month + this.bot.settings.application.commands.rank.points.voice * this.voice.month
		};
	};

	async addMessage() {
		this.messages.global++;
		this.messages.month++;
		this.logger.debug("Message added");
		await this.save();
	};

	async voiceStart() {
		if (this.voice.startedAt) await this.voiceStop();
		this.voice.startedAt = Date.now();
		this.logger.debug("Started to add voice time");
		await this.save();
	};

	async voiceStop() {
		if (this.voice.startedAt) {
			this.voice.global += Math.ceil((Date.now() - this.voice.startedAt) / 1000);
			this.voice.month += Math.ceil((Date.now() - this.voice.startedAt) / 1000);
			this.voice.startedAt = null;
			this.logger.debug("Voice time added");
			await this.save();
		}
	};

	get description() {
		const rank = this.rank;
		return `## <@${this.memberId}>\n### Ranks\n- Global: ${Rank.getRankText(rank.global)} (${Math.ceil(this.points.global)} points)\n- Month: ${Rank.getRankText(rank.month)} (${Math.ceil(this.points.month)} points)\n-# Last rank update: <t:${Math.floor(rank.updatedAt / 1000)}:R>\n### Stats\n- Messages sent: ${this.messages.global} (${this.messages.month} this month)\n- Time spent in voice channels: ${displayTime(this.voice.global)} (${displayTime(this.voice.month)} this month)`;
	};

	get rank() {
		const leaderboard = Rank.getLeaderboard(this.logger, this.settings);
		return {
			global: leaderboard.global.findIndex((rank) => rank.id == this.memberId),
			month: leaderboard.month.findIndex((rank) => rank.id == this.memberId),
			updatedAt: leaderboard.updatedAt
		};
	};

	async save() {
		const rankSettings = this.bot.settings.application.commands.rank;

		const roles = [];

		for (const role in rankSettings.roles) {
			if (rankSettings?.roles[role] <= this.points.global) roles.push(role);
		}

		if (this.roles.values() != roles.values()) {
			const guild = await this.bot.guilds.fetch(this.bot.settings.application.guildId);

			if (guild) {
				const member = await guild.members.fetch(this.memberId);

				if (member) {
					for (const roleId of this.roles) {
						const role = await guild.roles.fetch(roleId);

						if (!role) this.logger.info(`Removed role "${roleId}" as it doesn't exist anymore.`);
						else if (!roles.includes(roleId)) {
							try {
								await member.roles.remove(role);
								this.logger.info(`Role removed: "${role.name}" (${role.id})`);
							} catch (e) {
								this.logger.error(`Failed to remove role "${role.name}" (${role.id}):`, e);
							}
						}
					}

					for (const roleId of roles) {
						const role = await guild.roles.fetch(roleId);

						if (!role) this.logger.error(`Failed to add role "${role.id}": Role doesn't exist`);
						else if (!this.roles.includes(roleId)) {
							try {
								const channel = await guild.channels.fetch(rankSettings.channel);

								if (channel) await channel.send({
									content: `<@${this.memberId}> just unlocked a new rank role!`,
									embeds: [{
										title: role.name,
										description: `Reached ${rankSettings?.roles[role.id] ?? 0} point${(rankSettings?.roles[role.id] ?? 0) == 1 ? "" : "s"}`,
										color: role.color
									}]
								});

								await member.roles.add(role);
								this.logger.info(`Role added: "${role.name}" (${role.id})`);
							} catch (e) {
								this.logger.error(`Failed to add role "${role.name}" (${role.id}):`, e);
							}
						}
					}

					this.roles = roles;
				} else this.logger.error("Invalid member:", this.memberId);
			} else this.logger.error("Invalid guild:", this.bot.settings.application.guildId);
		}

		const memberPath = path.join(this.bot.settings.paths.rank(this.bot.settings.application.guildId), this.memberId + ".json");

		if (!fs.existsSync(path.dirname(memberPath))) fs.mkdirSync(path.dirname(memberPath), { recursive: true });
		fs.writeFileSync(memberPath, JSON.stringify({
			version: "3",
			firstOfTheMonth: this.firstOfTheMonth,
			messages: this.messages,
			roles: this.roles,
			streak: this.streak,
			voice: this.voice
		}), "utf-8");
	}
};

module.exports = Rank;