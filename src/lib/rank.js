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
					count: {
						global: data.voice?.count ?? 0,
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
					time: {
						global: 0,
						month: 0
					},
					count: {
						global: 0,
						month: 0
					},
					startedAt: null
				}
			};
		}
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @param {string} memberId
	 * @returns {Rank}
	 */
	static get(logger, settings, memberId) {
		const memberPath = path.join(settings.paths.rank(settings.application.guildId), memberId + ".json");

		if (!fs.existsSync(memberPath)) return new this(logger, settings, memberId);
		else {
			try {
				return new this(logger, settings, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				if (e?.stack) logger.warn("[Rank] Failed to read rank data:", e, e.stack.replaceAll("\n", "<br />"));
				else logger.warn("[Rank] Failed to read rank data:", e);
				return new this(logger, settings, memberId);
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
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @returns {import("../types.d.ts").Leaderboard}
	*/
	static getLeaderboard = (logger, settings) => {
		let leaderboard = {
			global: [],
			month: [],
			updatedAt: Date.now(),
			firstOfTheMonth: null
		};

		const leaderboardPath = settings.paths.leaderboard(settings.application.guildId);
		try {
			leaderboard = JSON.parse(fs.readFileSync(leaderboardPath, "utf-8"));
		} catch (e) {
			logger.warn("Failed to read leaderboard:", e);
		}

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @returns {import("../types.d.ts").Leaderboard}
	 */
	static updateLeaderboard(logger, settings) {
		const guildPath = settings.paths.rank(settings.application.guildId);
		const leaderboardPath = settings.paths.leaderboard(settings.application.guildId);

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
						const rank = this.get(logger, settings, file.replace(".json", ""));

						if (rank) {
							if (settings.application.commands.rank.ignored.includes(rank.memberId)) logger.debug(`User "${rank.memberId}" ignored`);
							else {
								leaderboard.global.push({
									id: rank.memberId,
									points: rank.points.global
								});

								leaderboard.month.push({
									id: rank.memberId,
									points: rank.points.month
								});
							}
						} else logger.warn("[Rank]", `Failed to read rank data for file ${file}:`, e);
					} catch (e) {
						logger.error("[Rank]", `Failed to read rank data for file ${file}:`, e);
					}
				}
			}

			leaderboard.global.sort((rankA, rankB) => rankB.points - rankA.points);
			leaderboard.month.sort((rankA, rankB) => rankB.points - rankA.points);

			leaderboard.firstOfTheMonth = leaderboard.month[0] && leaderboard.month[0].points > 0 ? leaderboard.month[0] : null;
		}

		if (!fs.existsSync(path.dirname(leaderboardPath))) fs.mkdirSync(path.dirname(leaderboardPath), { recursive: true });
		fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard));

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @returns {Promise<import("../types.d.ts").Leaderboard>}
	 */
	static async resetLeaderboard(logger, settings) {
		const guildPath = settings.paths.rank(settings.application.guildId);

		if (fs.existsSync(guildPath)) {
			for (const file of fs.readdirSync(guildPath)) {
				if (![".DS_Store"].includes(file)) {
					try {
						const rank = this.get(logger, settings, file.replace(".json", ""));

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

		return this.updateLeaderboard(logger, settings);
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @param {string} memberId
	 */
	constructor(logger, settings, memberId, data) {
		this.logger = logger;
		this.settings = settings;

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

			this.firstOfTheMonth = {
				count: 0,
				last: 0
			};
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
				time: {
					global: 0,
					month: 0
				},
				count: {
					global: 0,
					month: 0
				},
				stream: {
					time: {
						global: 0,
						month: 0
					},
					count: {
						global: 0,
						month: 0
					}
				}
			};

			this.save();
		}
	};

	get points() {
		return {
			global: this.settings.application.commands.rank.points.messages * this.messages.global + this.settings.application.commands.rank.points.voice * this.voice.time.global,
			month: this.settings.application.commands.rank.points.messages * this.messages.month + this.settings.application.commands.rank.points.voice * this.voice.time.month
		};
	};

	async addMessage() {
		this.messages.global++;
		this.messages.month++;
		await this.save();
	};

	async joinedVoice() {
		this.voice.startedAt = Date.now();
		this.voice.count.global++;
		this.voice.count.month++;
		await this.save();
	};

	async leftVoice() {
		this.voice.time.global += Math.floor((Date.now() - this.voice.startedAt) / 1000);
		this.voice.time.month += Math.floor((Date.now() - this.voice.startedAt) / 1000);
		this.voice.startedAt = null;
		await this.save();
	};

	get description() {
		const rank = this.rank;
		return `## <@${this.memberId}>\n### Ranks\n- Global: ${Rank.getRankText(rank.global)} (${Math.ceil(this.points.global)} points)\n- Month: ${Rank.getRankText(rank.month)} (${Math.ceil(this.points.month)} points)\n### Stats\n- Messages sent: ${this.messages.global} (${this.messages.month} this month)\n- Time spent in voice channels: ${displayTime(this.voice.time.global)} (${displayTime(this.voice.time.month)} this month)`;
	};

	get rank() {
		const leaderboard = Rank.getLeaderboard(this.logger, this.settings);
		return {
			global: leaderboard.global.findIndex((rank) => rank.id == this.memberId),
			month: leaderboard.month.findIndex((rank) => rank.id == this.memberId)
		};
	};

	async save() {
		const rankSettings = this.settings.application.commands.rank;

		/*
		const roles = [];
		for (const role in rankSettings.roles) {
			if (rankSettings?.roles[role] <= this.points.global) roles.push(role);
		}
		
		if (this.roles.values() != roles.values()) { */
		/* for (const roleId of this.roles) {
			if (!roles.includes(roleId)) {
				const member = await getMember(this.guildId, this.memberId);
				try {
					await member.roles.remove(roleId);
					log(`[Rank] Removed role ${roleId}.`);
				} catch (e) {
					log.error(`[Rank] Failed to remove role "${roleId}": ${e}.`);
				}
			}
		}
		
		for (const roleId of roles) {
			if (!this.roles.includes(roleId)) {
				const member = await getMember(this.guildId, this.memberId);
				try {
					await member.roles.add(roleId);
					log(`[Rank] Added role "${roleId}".`);
		
					const role = await getRole(this.guildId, roleId);
		
					const channel = await getChannel(this.guildId, rankSettings.channel);
					if (channel) await channel.send({
						content: `<@${this.memberId}> just unlocked a new rank role!`,
						embeds: [{
							title: role.name,
							description: `Reached ${rankSettings?.roles[role.id] ?? 0} point${(rankSettings?.roles[role.id] ?? 0) == 1 ? "" : "s"}`,
							color: role.color
						}]
					});
				} catch (e) {
					log.error(`Failed to add role "${roleId}": ${e}.`);
				}
			}
		}
		
		this.roles = roles;
		}*/

		const memberPath = path.join(this.settings.paths.rank(this.settings.application.guildId), this.memberId + ".json");

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