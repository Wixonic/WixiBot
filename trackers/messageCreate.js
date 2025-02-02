const { MessageType } = require("discord.js");

const { getRank } = require("../lib/ranks.js");

module.exports = async (log, message) => {
	log(`Message "${message.id}" sent by user "${message.author.username}" (${message.author.id})` + (message.inGuild() ? `, in guild "${message.guild.name}" (${message.guild.id}), in channel "${message.channel.name}" (${message.channel.id})` : ", outside of a guild"));

	if (!message.author.bot && message.inGuild() && [MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage].includes(message.type)) {
		const rank = await getRank(message.guild.id, message.author.id);
		await rank.addMessage();
	}
};