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
	run: async (logger, bot, server, oldState, newState) => {
		const isTrackedGuild = newState.guild.id == bot.settings.application.guildId;
		const channel = newState.channel || oldState.channel;
		const member = newState.member || oldState.member;

		if (member && !member.user.bot) {
			const updateStatus = async (message) => {
				logger.debug(`User "${member.user.displayName}" (${member.user.id}) ${message} channel "${channel.name}" (${channel.id}), in guild "${channel.guild.name}" (${channel.guild.id}`);

				if (isTrackedGuild) {
					/**
					 * @param {import("discord.js").VoiceBasedChannel} channel
					 */
					const checkChannel = async (channel) => {
						for (const member of channel.members.values()) {
							const userRank = Rank.get(logger, bot, member.id);

							if (Rank.canGetPoint(member, channel)) await userRank.voiceStart();
							else await userRank.voiceStop();
						}
					};

					if (!newState.channel && oldState.channel) await checkChannel(oldState.channel);
					else if (newState.channel) await checkChannel(newState.channel);
				}
			};

			if (!oldState.channel && newState.channel) await updateStatus("joined");
			else if (oldState.channel && !newState.channel) await updateStatus("left");
			else if (!oldState.mute && newState.mute) await updateStatus("muted, in");
			else if (oldState.mute && !newState.mute) await updateStatus("unmuted, in");
			else if (!oldState.deaf && newState.deaf) await updateStatus("defaen, in");
			else if (oldState.deaf && !newState.deaf) await updateStatus("undefan, in");
			else if (!oldState.suppress && newState.suppress) await updateStatus("suppressed, in");
			else if (oldState.suppress && !newState.suppress) await updateStatus("unsuppressed, in");
		}
	}
};

module.exports = listener;