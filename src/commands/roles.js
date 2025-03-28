const { ApplicationCommandType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

/**
 * @type {import("../types").CommandInfo}
 */
const info = {
	name: "Roles",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "roles",
		description: "Publishes the server roles",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		// TODO: Update roles select message

		await interaction.followUp("Roles select message updated");
	}
};

module.exports = info;