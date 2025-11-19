const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").ListenerInfo}
 */
const listener = {
	name: "Message Create",
	event: "messageCreate",

	/**
	 * @param {import("discord.js").Message} message
	 */
	run: async (logger, bot, server, message) => {
		if (!message.author.bot) {
			logger.debug(`Message "${message.id}" sent by user "${message.author.displayName}" (${message.author.id})` + (message.inGuild() ? `, in guild "${message.guild.name}" (${message.guild.id}), in channel "${message.channel.name}" (${message.channel.id})` : ", outside of a guild"));

			if (message.guild?.id == bot.settings.application.guildId) {
				const userRank = Rank.get(logger, bot, message.author.id);
				await userRank.addMessage();

				// Analyse message
			}
		}
	}
};

module.exports = listener;