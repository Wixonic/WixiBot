const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");

const Rank = require("../lib/rank.js");
const Settings = require("../lib/settings.js");

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

		const settings = Settings.get(bot.user.id);

		/**
		 * @type {import("discord.js").User}
		 */
		const targetUser = interaction.options.getUser("user") ?? interaction.user;
		if (targetUser.bot) return await interaction.followUp("Ranks are disabled for bots.");

		const userRank = await Rank.get(logger, settings, interaction.guild.id, targetUser.id);
		await interaction.followUp(await userRank.description());
	}
};

module.exports = info;