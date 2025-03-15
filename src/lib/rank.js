const fs = require("fs");
const path = require("path");

const { displayTime } = require("./utils.js");

class Rank {
	static convert = {
		"1": (data) => {
			data = {
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
					startedAt: data.voice?.startedAt ?? null,
					stream: {
						time: {
							global: data.voice?.stream?.time ?? 0,
							month: 0
						},
						count: {
							global: data.voice?.stream?.count ?? 0,
							month: 0
						},
						startedAt: data.voice?.stream?.startedAt ?? null
					}
				}
			};
		},
		"2": (data) => {
			data = {
				version: "3",
				messages: {
					global: data.messages?.global ?? 0,
					month: data.messages?.month ?? 0
				},
				roles: data.roles ?? [],
				voice: {
					time: {
						global: data.voice?.time?.global ?? 0,
						month: data.voice?.time?.month ?? 0
					},
					count: {
						global: data.voice?.count?.global ?? 0,
						month: data.voice?.count?.month ?? 0
					},
					startedAt: data.voice?.startedAt ?? null
				},
				streak: {
					best: 0,
					count: 0,
					last: 0
				},
				monthFirst: {
					count: 0,
					last: 0
				},
				lastUpdate: data.lastUpdate ?? 0
			};
		}
	};

	/**
	 * @param {import("@wixonic/logger")} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @param {string} guildId
	 * @param {string} memberId
	 * @returns {Promise<Rank>}
	 */
	static async get(logger, settings, guildId, memberId) {
		const memberPath = path.join(settings.paths.rank(guildId), memberId + ".json");

		if (!fs.existsSync(memberPath)) return new Rank(logger, settings, guildId, memberId);
		else {
			try {
				return new Rank(logger, settings, guildId, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				if (e?.stack) logger.warn("[Rank] Failed to read rank data:", e, e.stack.replaceAll("\n", "<br />"));
				else logger.warn("[Rank] Failed to read rank data:", e);
				return new Rank(logger, settings, guildId, memberId);
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
	 * @param {string} guildId
	 * @returns {Promise<import("../typ.d.ts").Leaderboard>}
	 */
	static async leaderboard(logger, settings, guildId) {
		const guildPath = settings.paths.rank(guildId);

		const leaderboard = {
			global: [],
			month: []
		};

		if (!fs.existsSync(guildPath)) return leaderboard;

		for (const file of fs.readdirSync(guildPath)) {
			if (![".DS_Store"].includes(file)) {
				try {
					const rank = await Rank.get(guildId, file.replace(".json", ""));

					if (rank && !settings.application.commands.rank.ignored.includes(rank.memberId)) {
						leaderboard.global.push({
							id: rank.memberId,
							points: rank.points.global
						});

						leaderboard.month.push({
							id: rank.memberId,
							points: rank.points.month
						});
					} else if (settings.application.commands.rank.ignored.includes(rank.memberId)) logger.debug(`User "${rank.memberId}" ignored`);
				} catch (e) {
					logger.error(`[Rank] Failed to read rank data for file ${file}:`, e);
				}
			}
		}

		leaderboard.global.sort((rankA, rankB) => rankB.points - rankA.points);
		leaderboard.month.sort((rankA, rankB) => rankB.points - rankA.points);

		return leaderboard;
	};

	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 * @param {string} guildId
	 * @param {string} memberId
	 */
	constructor(logger, settings, guildId, memberId, data) {
		this.logger = logger;
		this.settings = settings;

		if (data) {
			if (data.version == null || data.version == "1") data = Rank.convert["1"](data);
			if (data.version == "2") data = Rank.convert["2"](data);

			this.guildId = guildId;
			this.memberId = memberId;

			this.messages = {
				global: data.messages?.global ?? 0,
				month: data.messages?.month ?? 0
			};
			this.lastUpdate = new Date();
			this.lastUpdate.setTime(data.lastUpdate ?? 0);
			this.roles = data.roles ?? [];
			this.voice = {
				time: {
					global: data.voice?.time?.global ?? 0,
					month: data.voice?.time?.month ?? 0
				},
				count: {
					global: data.voice?.count?.global ?? 0,
					month: data.voice?.count?.month ?? 0
				},
				startedAt: data.voice?.startedAt ?? null
			};
			this.streak = {
				best: 0,
				count: 0,
				last: 0
			};
			this.monthFirst = {
				count: 0,
				last: 0
			};

			const beginningOfTheMonth = new Date();
			beginningOfTheMonth.setUTCDate(0);
			beginningOfTheMonth.setUTCHours(0);
			beginningOfTheMonth.setUTCMinutes(0);
			beginningOfTheMonth.setUTCSeconds(0);
			beginningOfTheMonth.setUTCMilliseconds(0);

			if (this.lastUpdate.getTime() < beginningOfTheMonth.getTime()) {
				(async () => {
					if (this.voice.startedAt != null) {
						await this.leftVoice();
						await this.joinedVoice();
					}

					if (this.voice.stream.startedAt != null) {
						await this.stoppedStreaming();
						await this.startedStreaming();
					}

					this.messages.month = 0;
					this.voice.time.month = 0;
					this.voice.count.month = 0;
					this.voice.stream.time.month = 0;
					this.voice.stream.count.month = 0;

					this.lastUpdate = new Date();

					await this.save();
				})();
			}
		} else {
			this.guildId = guildId;
			this.memberId = memberId;

			this.messages = {
				global: 0,
				month: 0
			};
			this.lastUpdate = new Date();
			this.roles = [];
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
			global: this.settings.application.commands.rank.points.messages * this.messages.global + this.settings.application.commands.rank.points.voice * this.voice.time.global + this.settings.application.commands.rank.points.stream * this.voice.stream.time.global,
			month: this.settings.application.commands.rank.points.messages * this.messages.month + this.settings.application.commands.rank.points.voice * this.voice.time.month + this.settings.application.commands.rank.points.stream * this.voice.stream.time.month
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

	async startedStreaming() {
		this.voice.stream.startedAt = Date.now();
		this.voice.stream.count.global++;
		this.voice.stream.count.month++;
		await this.save();
	};

	async stoppedStreaming() {
		this.voice.stream.time.global += Math.floor((Date.now() - this.voice.stream.startedAt) / 1000);
		this.voice.stream.time.month += Math.floor((Date.now() - this.voice.stream.startedAt) / 1000);
		this.voice.stream.startedAt = null;
		await this.save();
	};

	async description() {
		return `## <@${this.memberId}>\n### Ranks\n- Global: ${Rank.getRankText((await this.rank()).global)} (${Math.ceil(this.points.global)} points)\n- Month: ${Rank.getRankText((await this.rank()).month)} (${Math.ceil(this.points.month)} points)\n### Stats\n- Messages sent: ${this.messages.global} (${this.messages.month} this month)\n- Time spent in voice channels: ${displayTime(this.voice.time.global)} (${displayTime(this.voice.time.month)} this month)\n- Time spent streaming: ${displayTime(this.voice.stream.time.global)} (${displayTime(this.voice.stream.time.month)} this month)`;
	};

	async rank() {
		const leaderboard = await Rank.leaderboard(this.logger, this.settings, this.guildId);
		return {
			global: leaderboard.global.findIndex((rank) => rank.id == this.memberId),
			month: leaderboard.month.findIndex((rank) => rank.id == this.memberId)
		};
	};

	async save() {
		/* const rankSettings = this.settings.application.commands.rank(this.guildId);
		
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
					// Add stack
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
					// Add stack
				}
			}
		}
		
		this.roles = roles; */
		/*}
			
		const memberPath = path.join(this.settings.paths.rank(this.guildId), this.memberId + ".json");
			
		if(!fs.existsSync(path.dirname(memberPath))) fs.mkdirSync(path.dirname(memberPath), { recursive: true });
		fs.writeFileSync(memberPath, JSON.stringify({
		version: "3",
		lastUpdate: this.lastUpdate.getTime(),
		messages: this.messages,
		roles: this.roles,
		voice: this.voice
		}), "utf-8"); */
	}
};

module.exports = Rank;