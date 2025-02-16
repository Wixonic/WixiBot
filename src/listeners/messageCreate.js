/**
 * @type {ListenerInfo}
 */
const listener = {
	name: "Message Create",
	event: "messageCreate",

	/**
	 * @param {import("discord.js").Message} message
	 */
	run: async (bot, logger, message) => {
		if (!message.author.bot) {
			logger.debug(`Message "${message.id}" sent by user "${message.author.username}" (${message.author.id})` + (message.inGuild() ? `, in guild "${message.guild.name}" (${message.guild.id}), in channel "${message.channel.name}" (${message.channel.id})` : ", outside of a guild"));
		}
	}
};

module.exports = listener;