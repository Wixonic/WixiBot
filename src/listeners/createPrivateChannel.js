const { ChannelType, PermissionFlagsBits } = require("discord.js");

const PrivateChannel = require("../lib/privateChannels.js");

/**
 * @type {import("../types.d.ts").ListenerInfo}
 */
const listener = {
	name: "Create Private Channel",
	event: "voiceStateUpdate",

	/**
	 * @param {import("discord.js").VoiceState} oldState
	 * @param {import("discord.js").VoiceState} newState
	 */
	run: async (logger, bot, server, oldState, newState) => {
		const channels = bot.settings.application.commands.privateChannels.channels;
		const creationChannel = newState.channel;
		const member = newState.member;

		if (creationChannel && member && !member.user.bot) {
			if (Object.keys(channels).includes(creationChannel.id)) {
				try {
					let privateChannel = await PrivateChannel.get(logger, bot, member.id);

					if (privateChannel) member.voice.setChannel(privateChannel.id, "Private voice channel already created");
					else {
						try {
							const channel = await newState.guild.channels.create({
								name: `${member.user.username}${member.user.username.endsWith("s") ? "'" : "'s"} channel`,
								parent: channels[creationChannel.id],
								permissionOverwrites: [{
									id: newState.guild.roles.everyone.id,
									deny: [
										PermissionFlagsBits.ViewChannel
									],
									allow: [
										PermissionFlagsBits.ManageWebhooks,

										PermissionFlagsBits.Connect,
										PermissionFlagsBits.Speak,
										PermissionFlagsBits.Stream,
										PermissionFlagsBits.UseSoundboard,
										PermissionFlagsBits.UseExternalSounds,
										PermissionFlagsBits.UseVAD,

										PermissionFlagsBits.SendMessages,
										PermissionFlagsBits.EmbedLinks,
										PermissionFlagsBits.AttachFiles,
										PermissionFlagsBits.AddReactions,
										PermissionFlagsBits.UseExternalEmojis,
										PermissionFlagsBits.UseExternalStickers,
										PermissionFlagsBits.ReadMessageHistory,
										PermissionFlagsBits.SendVoiceMessages,
										PermissionFlagsBits.SendPolls,

										PermissionFlagsBits.UseApplicationCommands,
										PermissionFlagsBits.UseEmbeddedActivities,
										PermissionFlagsBits.UseExternalApps
									]
								}, {
									id: member.id,
									allow: [
										PermissionFlagsBits.ViewChannel,
										PermissionFlagsBits.PrioritySpeaker,

										PermissionFlagsBits.ManageMessages,

										PermissionFlagsBits.MuteMembers,
										PermissionFlagsBits.DeafenMembers,
										PermissionFlagsBits.MoveMembers,

										PermissionFlagsBits.CreateEvents,
										PermissionFlagsBits.ManageEvents,
									]
								}],
								type: ChannelType.GuildVoice
							});

							const privateChannel = new PrivateChannel(logger, bot, member.id, {
								channel: channel.id
							});
							await privateChannel.save();

							logger.debug(`User "${member.user.displayName}" (${member.user.id}) created private channel "${channel.name}" (${channel.id}), in guild "${channel.guild.name}" (${channel.guild.id}`);

							member.voice.setChannel(channel.id);
						} catch (e) {
							logger.warn(`Failed to create private channel for "${member.user.displayName}" (${member.user.id}):`, e);
						}
					}
				} catch (e) {
					logger.warn(`Failed to fetch private channel for "${member.user.displayName}" (${member.user.id}):`, e);
				}
			}
		}
	}
};

module.exports = listener;