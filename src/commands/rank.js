const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");

const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Rank",
	mode: "guild",
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
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		/**
		 * @type {import("discord.js").User}
		 */
		const targetUser = interaction.options.getUser("user") ?? interaction.user;
		if (targetUser.bot) return await interaction.followUp("Ranks are disabled for bots.");

		const userRank = Rank.get(logger, bot, targetUser.id);
		await interaction.followUp({
			allowedMentions: {},
			content: userRank.description
		});
	}
};

module.exports = info;