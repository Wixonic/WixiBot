const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus, StreamType } = require("@discordjs/voice");
const { Readable } = require("stream");
const WebSocket = require("ws");

/**
 * @type {import("@discordjs/voice").VoiceConnection?}
 */
let connection = null;
/**
 * @type {string?}
 */
let connectionChannelId = null;

/**
 * @type {CommandInfo}
 */
const info = {
	name: "Broadcast",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "broadcast",
		description: "Broadcast audio from WixiBot Local",
		contexts: [
			InteractionContextType.Guild
		],
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
	run: async (bot, logger, interaction) => {
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

			let wss = new WebSocket.Server({ port: 1001 });
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

			wss.on("connection", (ws) => {
				logger.debug("New WebSocket connection");
				reset();

				ws.on("message", (data) => stream.push(data));
				ws.on("close", () => {
					audioPlayer.stop();
					logger.debug("WebSocket connection closed");
				});
			});

			connection.on("stateChange", (oldState, newState) => {
				logger.debug("Connection state changed from", Object.keys(VoiceConnectionStatus).find((key) => VoiceConnectionStatus[key] == oldState.status), "to", Object.keys(VoiceConnectionStatus).find((key) => VoiceConnectionStatus[key] == newState.status));

				if (newState.status == VoiceConnectionStatus.Destroyed) {
					wss.close((e) => {
						if (e) logger.error("WebSocket server closed with error:", e);
						else logger.debug("WebSocket server closed");
					});
					for (const client of wss.clients) client.terminate();
					connectionChannelId = null;
					logger.debug("Connection destroyed");
				}
			});

			let membersCount = channel.members.size;

			/**
			 * @param {import("discord.js").VoiceState} oldState 
			 * @param {import("discord.js").VoiceState} newState 
			 */
			const handleVoiceStateUpdate = (oldState, newState) => {
				if (newState.member.id != bot.user.id && !oldState.channel && newState.channelId == channel.id) {
					membersCount++;
					logger.debug(`${newState.member.displayName} joined, broadcasting with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}`);
				} else if (newState.member.id != bot.user.id && oldState.channelId == channel.id && !newState.channel) {
					membersCount--;
					logger.debug(`${oldState.member.displayName} left, broadcasting with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}`);
				}

				if (((newState.member.id == bot.user.id && !newState.channel) || membersCount < 1) && connection.state.status != VoiceConnectionStatus.Destroyed) connection.destroy();
				else bot.once("voiceStateUpdate", handleVoiceStateUpdate);
			};

			bot.once("voiceStateUpdate", handleVoiceStateUpdate);

			for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
				process.once(signal, () => {
					if (connection.state.status != VoiceConnectionStatus.Destroyed) connection.destroy();
				});
			}

			await interaction.editReply(`Broadcasting in <#${channel.id}> with ${membersCount == 1 ? "one" : membersCount} member${membersCount == 1 ? "" : "s"}.`);
		} else await interaction.editReply("Invalid voice channel or unable to join.");
	}
};

module.exports = info;