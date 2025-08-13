const moderation = require("../lib/moderation.js");
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
	run: async (logger, bot, message) => {
		if (!message.author.bot) {
			logger.debug(`Message "${message.id}" sent by user "${message.author.displayName}" (${message.author.id})` + (message.inGuild() ? `, in guild "${message.guild.name}" (${message.guild.id}), in channel "${message.channel.name}" (${message.channel.id})` : ", outside of a guild"));

			if (message.guild?.id == bot.settings.application.guildId) {
				const userRank = Rank.get(logger, bot, message.author.id);
				await userRank.addMessage();

				moderation.analyseMessage(logger, bot, message).then(async (results) => {
					if (!results.final.valid) {
						/** @type {import("discord.js").TextBasedChannel} */
						const moderationChannel = await bot.channels.fetch(bot.settings.application.moderationChannel);

						if (moderationChannel && moderationChannel.isTextBased()) moderationChannel.send({
							content: `## Flagged Message\nhttps://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}\n- By <@${message.author.id}>\n- Reason${results.final.flags.length > 1 ? "s" : ""}: ${results.final.flags.join(", ")}\n- Confidence: ${results.final.confidence * 100}%`
						});
					}
				});
			}
		}
	}
};

module.exports = listener;