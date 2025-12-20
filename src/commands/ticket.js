const { ApplicationCommandType, ButtonStyle, ComponentType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Ticket Prompt",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "ticket",
		description: "Publishes the ticket's message",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const ticketMessage = fs.existsSync(bot.settings.paths.markdown.ticket) ? fs.readFileSync(bot.settings.paths.markdown.ticket, "utf-8") : null;

		if (ticketMessage) {
			const buttonChannel = await bot.channels.fetch(bot.settings.application.commands.tickets.buttonChannel);
			const channel = await bot.channels.fetch(bot.settings.application.commands.tickets.channel);

			if (buttonChannel && buttonChannel.isSendable() && channel && channel.isSendable()) {
				const messages = await buttonChannel.messages.fetch({
					limit: 10
				});

				for (const message of messages.values()) await buttonChannel.messages.delete(message);

				const rolesText = [];
				const roles = await interaction.guild.roles.fetch();

				for (let role of roles.values()) {
					const permissions = channel.permissionsFor(role);
					if (role.id !== interaction.guild.roles.everyone.id && (permissions.has(PermissionFlagsBits.ViewChannel) || permissions.has(PermissionFlagsBits.Administrator))) rolesText.push(`<@&${role.id}>`);
				}

				await buttonChannel.send({
					allowedMentions: {},
					content: ticketMessage.replace("{{PERMISSIONS}}", rolesText.join(", ")),
					components: [
						{
							type: ComponentType.ActionRow,
							components: [{
								type: ComponentType.Button,
								custom_id: "createTicket",
								label: "Create a ticket",
								style: ButtonStyle.Primary
							}]
						}
					]
				});

				await interaction.followUp(`Ticket prompt updated at <#${buttonChannel.id}>.`);
			} else logger.error("Invalid channels:", bot.settings.application.commands.tickets.buttonChannel, "or", bot.settings.application.commands.tickets.channel);
		} else logger.error("Ticket prompt file missing");
	}
};

module.exports = info;