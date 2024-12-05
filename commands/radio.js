const { ComponentType, ApplicationCommandType, ChannelType, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, ButtonStyle } = require("discord.js");
const { VoiceConnectionStatus } = require("@discordjs/voice");

const Radio = require("../lib/radio.js");
const { hexToIntColor } = require("../utils.js");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "radio",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("radio")
		.setDescription("High-quality radio that can be synced to W.L.M.A. database")
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("join")
				.setDescription("Join the specific channel")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the radio channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("quit")
				.setDescription("Quit the channel")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("add")
				.setDescription("Adds a song on the radio's waiting list")
				.addStringOption(
					new SlashCommandStringOption()
						.setName("query")
						.setDescription("Search query of the song")
						.setRequired(true)
						.setMinLength(3)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("pause")
				.setDescription("Pause radio")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("resume")
				.setDescription("Resume radio")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("next")
				.setDescription("Skip the current song")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("stop")
				.setDescription("Clear songs on the radio's waiting list and stops the current song")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("clear")
				.setDescription("Clear songs on the radio's waiting list")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("volume")
				.setDescription("Change the radio's volume")
				.addNumberOption(
					new SlashCommandNumberOption()
						.setName("volume")
						.setDescription("In percents - Defaults to 20%.")
						.setMinValue(0)
						.setMaxValue(100)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("sync")
				.setDescription("Synchronise radio to W.L.M.A. database")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("desync")
				.setDescription("Desynchronize radio")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("song")
				.setDescription("Gets current song details")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("list")
				.setDescription("List all songs on the radio's waiting list")
		),
	execute: async (interaction) => {
		await interaction.deferReply({
			ephemeral: true
		});

		const radioSettings = settings.guilds[interaction.guildId]?.radio;

		if (!radioSettings?.active) {
			interaction.log("Radio disabled");
			return await interaction.editReply({
				content: "Radio is currently disabled",
				ephemeral: true
			});
		}

		/**
		 * @type {import("discord.js").VoiceBasedChannel}
		 */
		let channel = null;
		switch (interaction.options.getSubcommand()) {
			case "join":
				channel = interaction.options.get("channel").channel;
				if (await Radio.join(channel)) {
					await interaction.editReply({
						content: `Radio now active at <#${channel.id}>`,
						ephemeral: true
					});
				} else {
					await interaction.editReply({
						content: `Failed to launch radio at <#${channel.id}>`,
						ephemeral: true
					});
				}
				break;

			case "quit":
				channel = Radio.channel;
				Radio.quit();
				await interaction.editReply({
					content: `Radio left at <#${channel?.id}>`,
					ephemeral: true
				});
				break;

			case "add":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					const song = await Radio.search(interaction.options.getString("query"));
					await Radio.load(song);

					await interaction.editReply({
						components: [{
							type: ComponentType.ActionRow,
							components: [{
								label: "Watch on YouTube",
								style: ButtonStyle.Link,
								type: ComponentType.Button,
								url: `https://www.youtube.com/watch?v=${song.youtubeId}`
							}]
						}],
						embeds: [{
							title: song.track,
							description: `This song has been added to the waiting list.\n${Radio.waitingList.length > 1 ? (Radio.waitingList.length == 2 ? "One song remaining." : `${Radio.waitingList.length} songs remaining.`) : "The next song will be this one."}`,
							author: {
								name: song.artist,
								icon_url: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`
							},
							thumbnail: {
								url: song.spotifyArtworkURL
							},
							color: hexToIntColor(song.color)
						}],
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "pause":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					if (Radio.song?.state == "PLAYING") {
						if (Radio.pause()) await interaction.editReply({
							content: `Song paused.`,
							ephemeral: true
						});
						else await interaction.editReply({
							content: "Failed to pause the song.",
							ephemeral: true
						});
					} else await interaction.editReply({
						content: Radio.song.state == "PAUSED" ? "Can't pause, the song is already paused." : "There's currently no song to pause.",
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "resume":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					if (Radio.song?.state == "PAUSED") {
						if (Radio.resume()) await interaction.editReply({
							components: [{
								type: ComponentType.ActionRow,
								components: [{
									label: "Watch on YouTube",
									style: ButtonStyle.Link,
									type: ComponentType.Button,
									url: `https://www.youtube.com/watch?v=${Radio.song.youtubeId}`
								}]
							}],
							content: `Song resumed: playing ${Radio.song.track} by ${Radio.song.artist}.`,
							embeds: [{
								title: Radio.song.track,
								description: `This song is currently playing at <#${Radio.channel.id}>.`,
								author: {
									name: Radio.song.artist,
									icon_url: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`
								},
								thumbnail: {
									url: Radio.song.spotifyArtworkURL
								},
								color: hexToIntColor(Radio.song.color)
							}],
							ephemeral: true
						});
						else await interaction.editReply({
							content: "Failed to resume the song.",
							ephemeral: true
						});
					} else await interaction.editReply({
						content: Radio.song.state == "PLAYING" ? "Can't resume, the song is already playing." : "There's currently no song to resume.",
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "next":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					const previousSongName = Radio.song.track;
					Radio.next();
					Radio.refresh();
					await interaction.editReply({
						components: [{
							type: ComponentType.ActionRow,
							components: [{
								label: "Watch on YouTube",
								style: ButtonStyle.Link,
								type: ComponentType.Button,
								url: `https://www.youtube.com/watch?v=${Radio.song.youtubeId}`
							}]
						}],
						content: `Skipping ${previousSongName}, and playing ${Radio.song.track} by ${Radio.song.artist}.`,
						embeds: [{
							title: Radio.song.track,
							description: `This song is currently playing at <#${Radio.channel.id}>.`,
							author: {
								name: Radio.song.artist,
								icon_url: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`
							},
							thumbnail: {
								url: Radio.song.spotifyArtworkURL
							},
							color: hexToIntColor(Radio.song.color)
						}],
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "stop":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					Radio.stop();
					await interaction.editReply({
						content: "Radio stopped. Radio's waiting list has been cleared.",
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "volume":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					Radio.setVolume(interaction.options.getNumber("volume"));
					await interaction.editReply({
						content: `Radio's volume set to ${Radio.volume}%.`,
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "clear":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					Radio.waitingList = [];
					await interaction.editReply({
						content: "Radio's waiting list has been cleared.",
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			case "sync":
				await interaction.editReply({
					content: "Syncing is not available right now.",
					ephemeral: true
				});
				break;

			case "desync":
				await interaction.editReply({
					content: "Syncing is not available right now.",
					ephemeral: true
				});
				break;

			case "song":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready && Radio.song) {
					await interaction.editReply({
						components: [{
							type: ComponentType.ActionRow,
							components: [{
								label: "Watch on YouTube",
								style: ButtonStyle.Link,
								type: ComponentType.Button,
								url: `https://www.youtube.com/watch?v=${Radio.song.youtubeId}`
							}]
						}],
						embeds: [{
							title: Radio.song.track,
							description: `This song is currently playing at <#${Radio.channel.id}>.`,
							author: {
								name: Radio.song.artist,
								icon_url: `https://cdn.discordapp.com/app-assets/${config.discord.application.clientId}/${config.discord.application.assets.youtube}.png`
							},
							thumbnail: {
								url: Radio.song.spotifyArtworkURL
							},
							color: hexToIntColor(Radio.song.color)
						}],
						ephemeral: true
					});
				} else {
					await interaction.editReply({
						content: "No song currently playing on the radio.",
						ephemeral: true
					});
				}
				break;

			case "list":
				if (Radio.connection?.state?.status == VoiceConnectionStatus.Ready) {
					await interaction.editReply({
						content: "Radio's list is not available right now.",
						ephemeral: true
					});
				} else await interaction.editReply({
					content: "Radio is not active right now.",
					ephemeral: true
				});
				break;

			default:
				interaction.log(`Unknown subcommand "${interaction.options.getSubcommand()}"`);
				await interaction.editReply({
					content: `Unknown subcommand "${interaction.options.getSubcommand()}"`,
					ephemeral: true
				});
				break;
		};
	}
};