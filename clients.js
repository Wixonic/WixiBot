const { ActivityType, ChannelType, Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const config = require("./config.js");
const log = require("./log.js");


const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates
	]
});

client.on("voiceStateUpdate", async (_, newState) => {
	if (newState.member.id == client.user.id && newState.channel?.type == ChannelType.GuildStageVoice && newState.suppress) newState.setSuppressed(false);
});

client.setDefaultActivity = () => {
	if (client.user) {
		client.user.setPresence({
			activities: [
				{
					name: process.env.DEV == "true" ? "In training" : "/help",
					type: ActivityType.Custom
				}
			],
			status: process.env.DEV == "true" ? "dnd" : "online"
		});
	}
};

client.login(config.discord.application.token);


const rest = new REST({
	version: "10"
});

rest.setToken(config.discord.application.token);

const getGuild = async (guildId) => {
	try {
		const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId);
		return guild;
	} catch (e) {
		log.error(`Failed to fetch guild ${guildId}: ${e}`);
		return null;
	}
};

const getChannel = async (guildId, channelId) => {
	try {
		const guild = await getGuild(guildId);
		if (!guild) return null;
		const channel = guild.channels.cache.get(channelId) ?? await guild.channels.fetch(channelId);
		return channel;
	} catch (e) {
		log.error(`Failed to fetch channel ${channelId} in guild ${guildId}: ${e}`);
		return null;
	}
};

const getMember = async (guildId, memberId) => {
	try {
		const guild = await getGuild(guildId);
		if (!guild) return null;
		const member = guild.members.cache.get(memberId) ?? await guild.members.fetch(memberId);
		return member;
	} catch (e) {
		log.error(`Failed to fetch member ${memberId} in guild ${guildId}: ${e}`);
		return null;
	}
};

const getRole = async (guildId, roleId) => {
	try {
		const guild = await getGuild(guildId);
		if (!guild) return null;
		const role = guild.roles.cache.get(roleId) ?? await guild.roles.fetch(roleId);
		return role;
	} catch (e) {
		log.error(`Failed to fetch role ${roleId} in guild ${guildId}: ${e}`);
		return null;
	}
};

const getUser = async (userId) => {
	try {
		const user = client.users.cache.get(userId) ?? await client.users.fetch(userId);
		return user;
	} catch (e) {
		log.error(`Failed to fetch user ${userId}: ${e}`);
		return null;
	}
};

module.exports = {
	client,
	rest,
	Routes,
	getGuild,
	getChannel,
	getMember,
	getRole,
	getUser
}