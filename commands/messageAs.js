const { ApplicationCommandType, MessageFlags, SlashCommandBuilder, SlashCommandStringOption } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "message-as",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("message-as")
		.setDescription("Send a message as the bot")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("content")
				.setDescription("Content of the message")
				.setRequired(true)
		).addStringOption(
			new SlashCommandStringOption()
				.setName("embeds")
				.setDescription("Embeds the message")
				.setRequired(false)
		),
	execute: async (interaction) => {
		const messageAsSettings = settings.guilds[interaction.guildId] ? settings.guilds[interaction.guildId]["message-as"] : null;

		if (!messageAsSettings?.active) {
			interaction.log("Message As disabled");
			return await interaction.reply({
				content: "Message As is currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		const content = interaction.options.getString("content");
		let embeds = [];
		try {
			embeds = JSON.parse(interaction.options.getString("embeds"));
		} catch { }

		try {
			await interaction.channel.send({
				content: content,
				embeds: embeds
			});

			await interaction.reply({
				content: "Message sent",
				flags: MessageFlags.Ephemeral
			});

			interaction.log("Message sent");
		} catch (e) {
			interaction.error(`Failed to send message: ${e}`);
			return await interaction.reply({
				content: "Failed to send message",
				flags: MessageFlags.Ephemeral
			});
		}
	}
};