const { ApplicationCommandType, MessageFlags, PermissionFlagsBits } = require("discord.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Restart",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "restart",
		description: "Restart the bot",
		default_member_permissions: PermissionFlagsBits.Administrator.toString()
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		await interaction.reply({
			content: "Restarting...",
			flags: MessageFlags.Ephemeral
		});

		process.exit(42);
	}
};

module.exports = info;