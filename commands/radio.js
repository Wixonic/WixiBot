const { ApplicationCommandType, ChannelType, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandChannelOption, SlashCommandStringOption } = require("discord.js");

const Radio = require("../lib/radio.js");

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
				.setName("song")
				.setDescription("Gets current song details")
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
				.setName("add")
				.setDescription("Adds a song on the radio's waiting list")
				.addStringOption(
					new SlashCommandStringOption()
						.setName("query")
						.setDescription("Search query or URL of the song")
						.setRequired(true)
						.setMinLength(3)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("clear")
				.setDescription("Clear songs on the radio's waiting list")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("list")
				.setDescription("List all songs on the radio's waiting list")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("sync")
				.setDescription("Synchronise radio to W.L.M.A. database")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("desync")
				.setDescription("Desynchronize radio")
		),
	execute: async (interaction) => {
		const radioSettings = settings.guilds[interaction.guildId]?.radio;

		if (!radioSettings?.active) {
			interaction.log("Radio disabled");
			return await interaction.reply({
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
					await interaction.reply({
						content: `Radio now active at <#${channel.id}>`,
						ephemeral: true
					});
				} else {
					await interaction.reply({
						content: `Failed to launch radio at <#${channel.id}>`,
						ephemeral: true
					});
				}
				break;

			case "quit":
				channel = Radio.channel;
				await Radio.quit();
				await interaction.reply({
					content: `Radio left at <#${channel?.id}>`,
					ephemeral: true
				});
				break;

			case "song":
				if (Radio.song) {
					await interaction.reply({
						embeds: [{
							title: Radio.song.track
						}],
						ephemeral: true
					});
				} else {
					await interaction.reply({
						content: "No song currently playing on the radio.",
						ephemeral: true
					});
				}
				break;

			default:
				interaction.log(`Unknown subcommand "${interaction.options.getSubcommand()}"`);
				await interaction.reply({
					content: `Unknown subcommand "${interaction.options.getSubcommand()}"`,
					ephemeral: true
				});
				break;
		};
	}
};