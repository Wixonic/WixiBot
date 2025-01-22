const { ApplicationCommandType, MessageFlags, SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "rules",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("rules")
		.setDescription("Update and publish rules"),
	execute: async (interaction) => {
		const rulesSettings = settings.guilds?.[interaction.guildId]?.rules;

		if (!rulesSettings?.active) {
			interaction.log("Rules automation disabled");
			return await interaction.reply({
				content: "Rules automation is currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!rulesSettings?.channel) {
			interaction.log("Rules channel not set");
			return await interaction.reply({
				content: "Rules channel is not set",
				flags: MessageFlags.Ephemeral
			});
		}

		const channel = await interaction.guild.channels.fetch(rulesSettings?.channel);

		if (!channel) {
			interaction.log(`Rules channel "${rulesSettings?.channel}" not found`);
			return await interaction.reply({
				content: "Rules channel not found",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!channel.isTextBased()) {
			interaction.log(`Rules channel "${channel.name}" (${channel.id}) is not text-based`);
			return await interaction.reply({
				content: "Rules channel is not a text-based channel",
				flags: MessageFlags.Ephemeral
			});
		}

		const messages = await channel.messages.fetch();
		messages.each((message) => channel.messages.delete(message));

		const rules = fs.readFileSync(path.join(__dirname, "..", "rules", interaction.guildId + ".md"), "utf-8")
			.split("{{CHANNEL.HELP}}").join(settings.guilds?.[interaction.guildId]?.ticket?.channel)
			.split("{{CHANNEL.ROLES}}").join(settings.guilds?.[interaction.guildId]?.roles?.channel);

		await channel.send({
			content: rules,
			flags: MessageFlags.SuppressNotifications
		});

		await interaction.reply({
			content: `Rules updated at <#${channel.id}>`,
			flags: MessageFlags.Ephemeral
		});

		interaction.log("Rules updated");
	}
};