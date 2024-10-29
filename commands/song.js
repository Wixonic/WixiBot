const { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, SlashCommandBuilder } = require("discord.js");

const Radio = require("../lib/radio.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "song",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("song")
		.setDescription("Displays the current song played on the radio"),
	execute: async (interaction) => {
		const radioSettings = settings.guilds[interaction.guildId]?.radio;

		if (!radioSettings?.active) {
			interaction.log("Radio disabled");
			return await interaction.reply({
				content: "Radio is currently disabled",
				ephemeral: true
			});
		}

		if (Radio.song) {
			await interaction.reply({
				content: `${Radio.song.track} by ${Radio.song.artist}`,
				ephemeral: true,
				components: [
					new ActionRowBuilder()
						.setComponents(
							new ButtonBuilder()
								.setLabel("Watch on YouTube")
								.setStyle(ButtonStyle.Link)
								.setURL(Radio.song.url),
						)
				]
			});
		} else {
			await interaction.reply({
				content: "No music is currently playing.",
				ephemeral: true
			});
		}

		interaction.log("Song sent");
	}
};