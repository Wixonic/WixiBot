const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").ListenerInfo}
 */
const listener = {
	name: "Voice State Update",
	event: "voiceStateUpdate",

	/**
	 * @param {import("discord.js").VoiceState} oldState
	 * @param {import("discord.js").VoiceState} newState
	 */
	run: async (logger, bot, oldState, newState) => {
		const isTrackedGuild = newState.guild.id == bot.settings.application.guildId;
		const member = newState.member || oldState.member;

		if (member && !member.user.bot) {
			if (!oldState.channel && newState.channel) {
				logger.debug(`User "${member.user.displayName}" (${member.user.id}) joined channel "${newState.channel.name}" (${newState.channel.id}), in guild "${newState.channel.guild.name}" (${newState.channel.guild.id}`);

				if (isTrackedGuild) {
					const userRank = Rank.get(logger, bot.settings, member.id);
					await userRank.joinedVoice();
				}
			} else if (oldState.channel && !newState.channel) {
				logger.debug(`User "${member.user.displayName}" (${member.user.id}) left channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.channel.guild.name}" (${oldState.channel.guild.id}`);

				if (isTrackedGuild) {
					const userRank = Rank.get(logger, bot.settings, member.id);
					await userRank.leftVoice();
				}
			}
		}
	}
};

module.exports = listener;