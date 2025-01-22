const { ApplicationCommandType, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "ticket",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("ticket")
		.setDescription("Update ticket prompt"),
	execute: async (interaction) => {
		const ticketSettings = settings.guilds?.[interaction.guildId]?.ticket;

		if (!ticketSettings?.active) {
			interaction.log("Ticket Tool disabled");
			return await interaction.reply({
				content: "Ticket Tool is currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!ticketSettings?.channel) {
			interaction.log("Ticket channel not set");
			return await interaction.reply({
				content: "Ticket channel is not set",
				flags: MessageFlags.Ephemeral
			});
		}

		const channel = await interaction.guild.channels.fetch(ticketSettings?.channel);

		if (!channel) {
			interaction.log(`Ticket channel "${ticketSettings?.channel}" not found`);
			return await interaction.reply({
				content: "Ticket channel not found",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!channel.isTextBased()) {
			interaction.log(`Ticket channel "${channel.name}" (${channel.id}) is not text-based`);
			return await interaction.reply({
				content: "Ticket channel is not a text-based channel",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!ticketSettings?.queue) {
			interaction.log("Queue channel not set");
			return await interaction.reply({
				content: "Queue channel is not set",
				flags: MessageFlags.Ephemeral
			});
		}

		const queueChannel = await interaction.guild.channels.fetch(ticketSettings?.queue);

		if (!queueChannel) {
			interaction.log(`Queue channel "${ticketSettings.queue}" not found`);
			return await interaction.reply({
				content: "Queue channel not found",
				flags: MessageFlags.Ephemeral
			});
		}

		if (!queueChannel.isTextBased()) {
			interaction.log(`Queue channel "${queueChannel.name}" (${queueChannel.id}) is not text-based`);
			return await interaction.reply({
				content: "Queue channel is not a text-based channel",
				flags: MessageFlags.Ephemeral
			});
		}

		const messages = await channel.messages.fetch();
		messages.each((message) => channel.messages.delete(message));

		const rolesText = [];
		const roles = await interaction.guild.roles.fetch();

		for (let role of roles.values()) {
			const permissions = queueChannel.permissionsFor(role);
			if (role.id != interaction.guild.roles.everyone.id && (permissions.has(PermissionFlagsBits.ViewChannel) || permissions.has(PermissionFlagsBits.Administrator))) rolesText.push(`<@&${role.id}>`);
		}

		await channel.send({
			content: `## Ticket Tool\n> Ticket Content will be visible to ${rolesText.join(", ")}\n**If you need help and you think we can help you, please create a ticket using the button below.**`,
			components: [
				new ActionRowBuilder()
					.setComponents(
						new ButtonBuilder()
							.setCustomId("sendTicket")
							.setLabel("Open a ticket")
							.setStyle(ButtonStyle.Primary)
					)
			],
			flags: MessageFlags.SuppressNotifications
		});

		await interaction.reply({
			content: `Ticket Tool updated at <#${channel.id}>`,
			flags: MessageFlags.Ephemeral
		});

		interaction.log("Ticket Tool updated");
	}
};