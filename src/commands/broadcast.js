const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const { Readable } = require("stream");

/**
 * @type {import("@discordjs/voice").VoiceConnection?}
 */
let connection = null;
/**
 * @type {string?}
 */
let connectionChannelId = null;

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Broadcast",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "broadcast",
		description: "Broadcast audio from WixiBot Local",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		options: [
			{
				type: ApplicationCommandOptionType.Channel,
				name: "channel",
				description: "The channel where the audio will be broadcasted",
				required: true,
				channel_types: [
					ChannelType.GuildStageVoice,
					ChannelType.GuildVoice
				]
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		/**
		 * @type {import("discord.js").VoiceBasedChannel?}
		 */
		const channel = interaction.options.getChannel("channel");

		if (channel && channel.isVoiceBased() && channel.joinable && channel.id != connectionChannelId) {
			if (connection && connection.state.status != VoiceConnectionStatus.Destroyed) {
				logger.debug("Old connection destroyed");
				connection.destroy();
			}

			connection = joinVoiceChannel({
				channelId: channel.id,
				guildId: channel.guild.id,
				adapterCreator: channel.guild.voiceAdapterCreator
			});

			connectionChannelId = channel.id;
			const audioPlayer = createAudioPlayer();
			connection.subscribe(audioPlayer);

			let stream = new Readable({
				read() { }
			});

			const reset = () => {
				stream.destroy();
				stream = new Readable({
					read() { }
				});

				const resource = createAudioResource(stream, {
					inputType: StreamType.Raw,
					inlineVolume: true
				});

				audioPlayer.play(resource);

				logger.debug("Stream and audio resource reset");
			};

			/**
			 * @type {import("ws").WebSocket?}
			 */
			let currentWs = null;
			bot.server.ws.on("connection", (ws) => {
				ws.once("message", (data) => {
					if (data[0] == 0x01) {
						logger.debug("Broadcasting started");
						currentWs = ws;
						reset();
						ws.send(Buffer.from([0x00]));
						ws.on("message", (data) => stream.push(data));
						ws.on("close", () => {
							currentWs = null;
							audioPlayer.stop();
						});
					}
				});
			});

			connection.on("stateChange", (oldState, newState) => {
				logger.debug("Connection state changed from", Object.keys(VoiceConnectionStatus).find((key) => VoiceConnectionStatus[key] == oldState.status), "to", Object.keys(VoiceConnectionStatus).find((key) => VoiceConnectionStatus[key] == newState.status));

				if (newState.status == VoiceConnectionStatus.Destroyed) {
					if (currentWs && currentWs.readyState < 2) currentWs.terminate();
					connectionChannelId = null;
					bot.off("voiceStateUpdate", handleVoiceStateUpdate);
					logger.debug("Connection destroyed");
				}
			});

			let membersCount = channel.members.filter((member) => !member.user.bot).size;

			/**
			 * @param {import("discord.js").VoiceState} oldState
			 * @param {import("discord.js").VoiceState} newState
			 */
			const handleVoiceStateUpdate = (oldState, newState) => {
				if (!newState.member.user.bot && !oldState.channel && newState.channelId == channel.id) {
					membersCount++;
					logger.debug(`${newState.member.displayName} joined, broadcasting with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}`);
				} else if (!newState.member.user.bot && oldState.channelId == channel.id && !newState.channel) {
					membersCount--;
					logger.debug(`${oldState.member.displayName} left, broadcasting with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}`);
				}

				if ((membersCount < 1 || (newState.member.id == bot.user.id && !newState.channel)) && connection.state.status != VoiceConnectionStatus.Destroyed) connection.destroy();
				else bot.once("voiceStateUpdate", handleVoiceStateUpdate);
			};

			bot.once("voiceStateUpdate", handleVoiceStateUpdate);

			await interaction.followUp(`Broadcasting in <#${channel.id}> with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}.`);
		} else await interaction.followUp("Invalid voice channel or unable to join.");
	}
};

module.exports = info;