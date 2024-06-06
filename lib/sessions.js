const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const log = require("../log.js");

class Session {
	/**
	 * @type {Object.<string, Session>}
	 */
	static list = {};

	/**
	 * @param {string} channelId 
	 * @return Session?
	 */
	static get(channelId) {
		return this.list[channelId];
	};

	/**
	 * @type {import("discord.js").GuildMember[]}
	 */
	members = [];

	/**
	 * @param {import("discord.js").Guild} guild 
	 * @param {import("discord.js").BaseGuildVoiceChannel} channel 
	 * @param {import("discord.js").GuildMember} author 
	 */
	constructor(guild, channel, author) {
		Session.list[channel.id] = this;

		this.guild = guild;
		this.channel = channel;
		this.createdBy = author;
		this.createdAt = Date.now();

		log(`Session at channel "${this.channel.name}" (${this.channel.id}) in guild "${this.guild.name}" (${this.guild.id}) started`);
	};

	/**
	 * @param {import("discord.js").GuildMember} member
	 */
	async addMember(member) {
		if (!this.members.includes(member)) {
			this.members.push(member);

			await this.channel.permissionOverwrites.create(member, {
				ViewChannel: true,
				Connect: true
			}, {
				reason: `User added to session at "${this.channel.name}" (${this.channel.id})`
			});

			try {
				if (!member.dmChannel) await member.createDM();

				await member.dmChannel.send({
					content: `You are invited to a private session at <#${this.channel.id}>.`,
					components: [
						new ActionRowBuilder()
							.setComponents(
								new ButtonBuilder()
									.setLabel("Join session")
									.setStyle(ButtonStyle.Link)
									.setURL(this.channel.url),
								new ButtonBuilder()
									.setCustomId(`quitSession_${this.channel.id}`)
									.setLabel("Quit session")
									.setStyle(ButtonStyle.Danger)
							)
					]
				});
			} catch (e) {
				log(`Failed to DM user "${member.user.username}" (${member.id}): ${e}`);
			}

			log(`User "${member.user.username}" (${member.id}) added to session at channel "${this.channel.name}" (${this.channel.id}) in guild "${this.guild.name}" (${this.guild.id})`);
			return true;
		} else return false;
	};

	/**
	 * @param {import("discord.js").GuildMember} member
	 */
	async removeMember(member) {
		if (this.members.includes(member)) {
			await this.channel.permissionOverwrites.delete(member, `User removed to session at "${this.channel.name}" (${this.channel.id})`);
			this.members.splice(this.members.indexOf(member), 1);
			log(`User "${member.user.username}" (${member.id}) removed from session at channel "${this.channel.name}" (${this.channel.id}) in guild "${this.guild.name}" (${this.guild.id})`);
			return true;
		} else return false;
	};

	async stop() {
		delete Session.list[this.channel.id];
		for (const member of this.members) await this.removeMember(member);
		log(`Session at channel "${this.channel.name}" (${this.channel.id}) in guild "${this.guild.name}" (${this.guild.id}) ended`);
	};
};

module.exports = {
	Session
};