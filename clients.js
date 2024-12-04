const { ActivityType, ChannelType, Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const config = require("./config.js");


const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
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


module.exports = {
	client,
	rest,
	Routes
}