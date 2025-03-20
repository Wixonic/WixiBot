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
		const channel = newState.channel || oldState.channel;
		const member = newState.member || oldState.member;

		if (member && !member.user.bot) {
			const updateStatus = async (message) => {
				logger.debug(`User "${member.user.displayName}" (${member.user.id}) ${message} channel "${channel.name}" (${channel.id}), in guild "${channel.guild.name}" (${channel.guild.id}`);

				if (isTrackedGuild) {
					/**
					 * @param {import("discord.js").GuildMember} member
					 * @param {import("discord.js").VoiceBasedChannel} channel
					 */
					const canGetPoint = (member, channel) => {
						let count = 0;
						let muted = 0;
						let deafen = 0;
						for (const channelMember of channel.members.values()) {
							if (!channelMember.user.bot) count++;
							if (!channelMember.user.bot && channelMember.voice.mute && !channelMember.voice.suppress) muted++;
							if (!channelMember.user.bot && channelMember.voice.deaf) deafen++;
						}

						const valid = !member.user.bot && count > 1 && !member.voice.mute && !member.voice.deaf && (count - muted) > 1 && (count - deafen) > 1;
						return valid;
					};

					/**
					 * @param {import("discord.js").VoiceBasedChannel} channel
					 */
					const checkChannel = async (channel) => {
						for (const member of channel.members.values()) {
							const userRank = Rank.get(logger, bot, member.id);

							if (canGetPoint(member, channel)) await userRank.voiceStart();
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