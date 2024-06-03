const { ApplicationCommandType, MessageFlagsBitField, SlashCommandBuilder } = require("discord.js");
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
		const rulesSettings = settings.guilds[interaction.guildId].rules;

		if (!rulesSettings.active) {
			interaction.log("Rumes automation disabled");
			return await interaction.reply({
				content: "Rules automation is currenlty disabled",
				ephemeral: true
			});
		}

		if (!rulesSettings.channel) {
			interaction.log("Channel not set");
			return await interaction.reply({
				content: "Rules channel is not set",
				ephemeral: true
			});
		}

		const channel = await interaction.guild.channels.fetch(rulesSettings.channel);

		if (!channel) {
			interaction.log(`Channel ${rulesSettings.channel} not found`);
			return await interaction.reply({
				content: "Rules channel not found",
				ephemeral: true
			});
		}

		if (!channel.isTextBased()) {
			interaction.log(`Channel ${channel.name} (${channel.id}) is not text-based`);
			return await interaction.reply({
				content: "Rules channel is not a text-based channel",
				ephemeral: true
			});
		}

		const messages = await channel.messages.fetch();
		messages.each((message) => channel.messages.delete(message));

		const rules = fs.readFileSync(path.join(__dirname, "..", "rules", interaction.guildId + ".md"), "utf-8")
			.split("{{CHANNEL.HELP}}").join(settings.guilds[interaction.guildId].help.channel)
			.split("{{CHANNEL.ROLES}}").join(settings.guilds[interaction.guildId].roles.channel);

		await channel.send({
			content: rules,
			flags: new MessageFlagsBitField().add("SuppressNotifications")
		});

		await interaction.reply({
			content: `Rules updated at <#${channel.id}>`,
			ephemeral: true
		});

		interaction.log("Updated");
	}
};