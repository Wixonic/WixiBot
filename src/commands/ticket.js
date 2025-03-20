const { ApplicationCommandType, ButtonStyle, ComponentType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Ticket Prompt",
	mode: "global",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "ticket",
		description: "Publishes the ticket prompt the specified channel",
		contexts: [
			InteractionContextType.Guild
		],
		default_member_permissions: PermissionFlagsBits.Administrator.toString()
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const ticketMessage = fs.existsSync(bot.settings.paths.markdown.ticket) ? fs.readFileSync(bot.settings.paths.markdown.ticket, "utf-8") : null;

		if (ticketMessage) {
			const channel = await bot.channels.fetch(bot.settings.application.commands.ticket.channel);

			if (channel && channel.isTextBased() && channel.isSendable()) {
				const rolesText = [];
				const roles = await interaction.guild.roles.fetch();

				for (let role of roles.values()) {
					const permissions = channel.permissionsFor(role);
					if (role.id != interaction.guild.roles.everyone.id && (permissions.has(PermissionFlagsBits.ViewChannel) || permissions.has(PermissionFlagsBits.Administrator))) rolesText.push(`<@&${role.id}>`);
				}

				await channel.send({
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

				await interaction.followUp("Ticket prompt updated");
			} else logger.error("Invalid channel");
		} else logger.error("Ticket prompt file missing");
	}
};

module.exports = info;