const { ApplicationCommandType, ButtonStyle, ChannelType, ComponentType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const Settings = require("../lib/settings.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Ticket Prompt",
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
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const settings = new Settings(bot.user.id);

		const ticketPath = path.join(__dirname, "..", "settings", bot.application.id, "ticket.md");
		const ticketMessage = fs.existsSync(ticketPath) ? fs.readFileSync(ticketPath, "utf-8") : null;

		if (ticketMessage) {
			const channel = await bot.channels.fetch(settings.application.commands.ticket.channel);

			if (channel && channel.isTextBased() && channel.isSendable()) {
				const rolesText = [];
				const roles = await interaction.guild.roles.fetch();

				for (let role of roles.values()) {
					const permissions = channel.permissionsFor(role);
					if (role.id != interaction.guild.roles.everyone.id && (permissions.has(PermissionFlagsBits.ViewChannel) || permissions.has(PermissionFlagsBits.Administrator))) rolesText.push(`<@&${role.id}>`);
				}

				await channel.send({
					content: ticketMessage.replace("{{PERMISSIONS}}", rolesText),
					components: [
						{
							type: ComponentType.ActionRow,
							components: [{
								type: ComponentType.Button,
								custom_id: "openTicket",
								label: "Open a ticket",
								style: ButtonStyle.Primary
							}]
						}
					],
					flags: MessageFlags.SuppressNotifications
				});

				await interaction.followUp("Ticket prompt updated");
			} else logger.error("Invalid channel");
		} else logger.error("Ticket prompt file missing");
	}
};

module.exports = info;