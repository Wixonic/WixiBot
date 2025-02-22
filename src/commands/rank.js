const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Rank",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "rank",
		description: "Displays a user's rank details on the server",
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.User,
				name: "user",
				description: "If not specified, your own rank will be displayed",
				required: false
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (bot, logger, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const targetUser = interaction.options.getUser("user") ?? interaction.user;

		await interaction.followUp(`## <@${targetUser.id}>`);
	}
};

module.exports = info;