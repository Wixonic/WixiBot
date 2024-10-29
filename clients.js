const { ChannelType, Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const config = require("./config.js");


const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates
	]
});

client.on("voiceStateUpdate", async (oldState, newState) => {
	if (newState.member.id == client.user.id && newState.channel?.type == ChannelType.GuildStageVoice && newState.suppress) newState.setSuppressed(false);
});

client.login(config.token);


const rest = new REST({
	version: "10"
});

rest.setToken(config.token);


module.exports = {
	client,
	rest,
	Routes
}