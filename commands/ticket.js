const { ApplicationCommandType, MessageFlagsBitField, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

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
		const ticketSettings = settings.guilds[interaction.guildId].ticket;

		if (!ticketSettings.active) {
			interaction.log("Ticket Tool disabled");
			return await interaction.reply({
				content: "Ticket Tool is currenlty disabled",
				ephemeral: true
			});
		}

		if (!ticketSettings.channel) {
			interaction.log("Ticket channel not set");
			return await interaction.reply({
				content: "Ticket channel is not set",
				ephemeral: true
			});
		}

		const channel = await interaction.guild.channels.fetch(ticketSettings.channel);

		if (!channel) {
			interaction.log(`Channel ${ticketSettings.channel} not found`);
			return await interaction.reply({
				content: "Ticket channel not found",
				ephemeral: true
			});
		}

		if (!channel.isTextBased()) {
			interaction.log(`Channel ${channel.name} (${channel.id}) is not text-based`);
			return await interaction.reply({
				content: "Ticket channel is not a text-based channel",
				ephemeral: true
			});
		}

		const messages = await channel.messages.fetch();
		messages.each((message) => channel.messages.delete(message));

		const roles = [];

		for (const role of interaction.guild.roles.cache.keys()) {
			if (channel.permissionsFor(role).has(PermissionFlagsBits.ViewChannel)) roles.push(`<@&${role}>`);
		}

		await channel.send({
			content: `## Ticket Tool\n> Ticket Content will be visible to ${roles.join(", ")}\n\n**If you need help and you think we can help you, please create a ticket using the button below.**\n\nWe can help you:\n- Inside, or with any issue related to this Discord server\n- In all [wixonic.fr](<https://wixonic.fr>) domain and subdomains\n- On [Wixonic's GitHub page](<https://go.wixonic.fr/github>)`,
			components: [
				new ActionRowBuilder()
					.setComponents(
						new ButtonBuilder()
							.setCustomId("sendTicket")
							.setLabel("Open a ticket")
							.setStyle(ButtonStyle.Primary)
					)
			],
			flags: new MessageFlagsBitField().add("SuppressNotifications")
		});

		await interaction.reply({
			content: `Ticket Tool updated at <#${channel.id}>`,
			ephemeral: true
		});

		interaction.log("Updated");
	}
};