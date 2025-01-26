const fs = require("fs");
const path = require("path");

const { getChannel, getMember, getRole } = require("../clients.js");
const log = require("../log.js");

const config = require("../config.js");
const settings = require("../settings.js");

class Rank {
	static get(guildId, memberId) {
		const guildPath = path.join(config.cache.ranks, guildId);
		const memberPath = path.join(guildPath, memberId + ".json");

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

	static leaderboard(guildId) {
		const guildPath = path.join(config.cache.ranks, guildId);

		const leaderboard = [];

		if (!fs.existsSync(guildPath)) return leaderboard;

		for (const file of fs.readdirSync(guildPath)) {
			if (![".DS_Store"].includes(file)) {
				try {
					const rank = Rank.get(guildId, file.replace(".json", ""));

					leaderboard.push({
						id: rank.memberId,
						points: rank.points
					});
				} catch (e) {
					log.error(`[Rank] Failed to read rank data for file ${file}: ${e}`);
				}
			}
		}

		return leaderboard.sort((rankA, rankB) => rankB.points - rankA.points);
	};

	constructor(guildId, memberId, data) {
		if (data) {
			this.guildId = guildId;
			this.memberId = memberId;

			this.achievements = data.achievements ?? [];
			this.messages = data.messages ?? 0;
			this.roles = data.roles ?? [];
			this.voice = data.voice ?? {
				time: data.voice?.time ?? 0,
				count: data.voice?.count ?? 0,
				startedAt: data.voice?.startedAt ?? null,
				stream: {
					time: data.voice?.stream?.time ?? 0,
					count: data.voice?.stream?.count ?? 0,
					startedAt: data.voice?.stream?.startedAt ?? null
				}
			};
		} else {
			this.guildId = guildId;
			this.memberId = memberId;

			this.achievements = [];
			this.messages = 0;
			this.roles = [];
			this.voice = {
				time: 0,
				count: 0,
				stream: {
					time: 0,
					count: 0
				}
			};

			this.save();
		}
	};

	async addMessage() {
		this.messages++;
		await this.save();
	};

	async joinVoice() {
		this.voice.startedAt = Date.now();
		this.voice.count++;
		await this.save();
	};

	async leaveVoice() {
		this.voice.time += Math.floor((Date.now() - this.voice.startedAt) / 1000);
		this.voice.startedAt = null;
		await this.save();
	};

	async startedStreaming() {
		this.voice.stream.startedAt = Date.now();
		this.voice.stream.count++;
		await this.save();
	};

	async stoppedStreaming() {
		this.voice.stream.time += Math.floor((Date.now() - this.voice.stream.startedAt) / 1000);
		this.voice.stream.startedAt = null;
		await this.save();
	};

	get points() {
		let points = 0;
		const rankSettings = settings.guilds[this.guildId]?.ranks;

		if (rankSettings?.active) {
			for (const achievement of rankSettings?.achievements) {
				if (achievement.condition(this)) points += achievement.points;
			}
		}

		return points;
	};

	get rank() {
		const leaderboard = Rank.leaderboard(this.guildId);
		return leaderboard.findIndex((rank) => rank.id == this.memberId);
	};

	get rankText() {
		const rank = this.rank;
		return rank == -1 ? "Unranked" : `${rank + 1}${["st", "nd", "rd"][((rank + 90) % 100 - 10) % 10 - 1] || "th"}`;
	};

	async save() {
		const rankSettings = settings.guilds[this.guildId]?.ranks;

		if (rankSettings?.active) {
			for (const achievement of rankSettings?.achievements) {
				if (achievement.condition(this) && !this.achievements.includes(achievement.id)) {
					log(`[Rank] Unlocked achievement ${achievement.name}.`);
					this.achievements.push(achievement.id);

					const channel = await getChannel(this.guildId, rankSettings.channel);
					if (channel) await channel.send({
						content: `<@${this.memberId}> just unlocked a new achievement, and won ${achievement.points} points!`,
						embeds: [{
							title: achievement.name,
							description: achievement.description
						}]
					});
				}
			}

			const roles = [];
			for (const role of rankSettings?.roles) {
				if (role.condition(this)) roles.push(role.id);
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
							const roleData = rankSettings?.roles.find((data) => data.id == roleId);

							const channel = await getChannel(this.guildId, rankSettings.channel);
							if (channel) await channel.send({
								content: `<@${this.memberId}> just unlocked a new achievement role!`,
								embeds: [{
									title: role.name,
									description: roleData.description,
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
			achievements: this.achievements,
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