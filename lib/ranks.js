const fs = require("fs");
const path = require("path");

const { getChannel, getMember, getRole } = require("../clients.js");
const log = require("../log.js");
const { displayTime } = require("../utils.js");

const config = require("../config.js");
const settings = require("../settings.js");

class Rank {
	static async get(guildId, memberId) {
		const guildPath = path.join(config.cache.ranks, guildId);
		const memberPath = path.join(guildPath, memberId + ".json");

		if ((await getMember(guildId, memberId))?.user.bot) return null;

		if (!fs.existsSync(memberPath)) return new Rank(guildId, memberId);
		else {
			try {
				return new Rank(guildId, memberId, JSON.parse(fs.readFileSync(memberPath, "utf-8")));
			} catch (e) {
				log.error(`[Rank] Failed to read rank data: ${e}`);
				return new Rank(guildId, memberId);
			}
		}
	};

	static getRankText = (rank) => rank == -1 ? "Unranked" : `${rank + 1}${["st", "nd", "rd"][((rank + 1 + 90) % 100 - 10) % 10 - 1] || "th"}`;

	static async leaderboard(guildId) {
		const guildPath = path.join(config.cache.ranks, guildId);

		const leaderboard = {
			global: [],
			month: []
		};

		if (!fs.existsSync(guildPath)) return leaderboard;

		for (const file of fs.readdirSync(guildPath)) {
			if (![".DS_Store"].includes(file)) {
				try {
					const rank = await Rank.get(guildId, file.replace(".json", ""));

					if (rank) {
						leaderboard.global.push({
							id: rank.memberId,
							points: rank.points.global
						});

						leaderboard.month.push({
							id: rank.memberId,
							points: rank.points.month
						});
					}
				} catch (e) {
					log.error(`[Rank] Failed to read rank data for file ${file}: ${e}`);
				}
			}
		}

		leaderboard.global.sort((rankA, rankB) => rankB.points - rankA.points);
		leaderboard.month.sort((rankA, rankB) => rankB.points - rankA.points);

		return leaderboard;
	};

	constructor(guildId, memberId, data) {
		if (data) {
			if (data.version == null || data.version == "1") {
				data = {
					version: "2",
					messages: {
						global: data.messages,
						month: 0
					},
					roles: data.roles,
					voice: {
						time: {
							global: data.voice?.time,
							month: 0
						},
						count: {
							global: data.voice?.count,
							month: 0
						},
						startedAt: data.voice?.startedAt,
						stream: {
							time: {
								global: data.voice?.stream?.time,
								month: 0
							},
							count: {
								global: data.voice?.stream?.count,
								month: 0
							},
							startedAt: data.voice?.stream?.startedAt
						}
					}
				}
			}

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
				startedAt: data.voice?.startedAt ?? null,
				stream: {
					time: {
						global: data.voice?.stream?.time?.global ?? 0,
						month: data.voice?.stream?.time?.month ?? 0
					},
					count: {
						global: data.voice?.stream?.count?.global ?? 0,
						month: data.voice?.stream?.count?.month ?? 0
					},
					startedAt: data.voice?.stream?.startedAt ?? null
				}
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

	get points() {
		const rankSettings = settings.guilds[this.guildId]?.ranks;

		return {
			global: rankSettings.points.messages * this.messages.global + rankSettings.points.voice * this.voice.time.global + rankSettings.points.stream * this.voice.stream.time.global,
			month: rankSettings.points.messages * this.messages.month + rankSettings.points.voice * this.voice.time.month + rankSettings.points.stream * this.voice.stream.time.month
		};
	};

	async rank() {
		const leaderboard = await Rank.leaderboard(this.guildId);
		return {
			global: leaderboard.global.findIndex((rank) => rank.id == this.memberId),
			month: leaderboard.month.findIndex((rank) => rank.id == this.memberId)
		};
	};

	async description() {
		return `## <@${this.memberId}>\n### Ranks\n- Global: ${Rank.getRankText((await this.rank()).global)} (${Math.ceil(this.points.global)} points)\n- Month: ${Rank.getRankText((await this.rank()).month)} (${Math.ceil(this.points.month)} points)\n### Stats\n- Messages sent: ${this.messages.global} (${this.messages.month} this month)\n- Time spent in voice channels: ${displayTime(this.voice.time.global)} (${displayTime(this.voice.time.month)} this month)\n- Time spent streaming: ${displayTime(this.voice.stream.time.global)} (${displayTime(this.voice.stream.time.month)} this month)`;
	};

	async save() {
		const rankSettings = settings.guilds[this.guildId]?.ranks;

		if (rankSettings?.active) {
			const roles = [];
			for (const role in rankSettings?.roles) {
				if (rankSettings?.roles[role] <= this.points.global) roles.push(role);
			}

			if (this.roles.values() != roles.values()) {
				for (const roleId of this.roles) {
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
			}
		}

		const guildPath = path.join(config.cache.ranks, this.guildId);
		const memberPath = path.join(guildPath, this.memberId + ".json");

		if (!fs.existsSync(guildPath)) fs.mkdirSync(guildPath, { recursive: true });
		fs.writeFileSync(memberPath, JSON.stringify({
			version: "2",
			lastUpdate: this.lastUpdate.getTime(),
			messages: this.messages,
			roles: this.roles,
			voice: this.voice
		}), "utf-8");
	}
};

const getRank = async (guildId, memberId) => {
	const member = await getMember(guildId, memberId);
	if (!member) return null;

	return Rank.get(guildId, memberId);
};

module.exports = {
	Rank,
	getRank
};