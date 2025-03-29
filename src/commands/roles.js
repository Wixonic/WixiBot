const { ApplicationCommandType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");

const Roles = require("../lib/roles.js");

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

		await Roles.update(logger, bot);
		await interaction.followUp(`Roles prompt updated at <#${bot.settings.application.commands.roles.channel}>.`);
	}
};

module.exports = info;