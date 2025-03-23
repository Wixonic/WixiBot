const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");

const Rank = require("../lib/rank.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Moderation",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "moderation",
		description: "Commands for moderating users",
		default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "penalty",
				description: "Apply a penalty to a user by deducting points",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "The user to penalize",
						required: true
					},
					{
						type: ApplicationCommandOptionType.Number,
						name: "amount",
						description: "The number of points to deduct",
						required: true
					},
					{
						type: ApplicationCommandOptionType.String,
						name: "reason",
						description: "The reason for the penalty"
					}
				]
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

		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case "penalty":
				const targetUser = interaction.options.getUser("user");
				if (targetUser.bot) return await interaction.followUp("Ranks are disabled for bots.");
				const amount = interaction.options.getNumber("amount");
				const reason = interaction.options.getString("reason");

				const rank = Rank.get(logger, bot, targetUser.id);
				await rank.applyPenalty(amount, interaction.member, reason);
				await interaction.followUp({
					allowedMentions: {},
					content: `A penalty of ${amount} points has been applied to <@${targetUser.id}>.`
				});
				break;

			default:
				logger.error("Invalid subcommand:", subcommand);
				break;
		};
	}
};

module.exports = info;