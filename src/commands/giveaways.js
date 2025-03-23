const { ApplicationCommandType, ApplicationCommandOptionType, ButtonStyle, ComponentType, InteractionContextType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");

const Giveaway = require("../lib/giveaways.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
module.exports = {
	name: "Giveaways",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "giveaways",
		description: "Manage giveaways",
		default_member_permissions: PermissionFlagsBits.Administrator.toString(),
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "create",
				description: "Create a giveaway"
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "edit",
				description: "Edit a giveaway",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "id",
						description: "Giveaway ID",
						required: true,
						min_length: 5
					}
				]
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "list",
				description: "List giveaways"
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
			case "create":
				const createdGiveaway = Giveaway.get(logger, bot);
				await interaction.followUp({
					content: `Giveaway created.\n-# Giveaway #${createdGiveaway.id}`,
					components: [{
						type: ComponentType.ActionRow,
						components: [{
							custom_id: `editGiveaway_${createdGiveaway.id}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}, {
							custom_id: `cancelGiveaway_${createdGiveaway.id}`,
							label: "Cancel",
							style: ButtonStyle.Danger,
							type: ComponentType.Button
						}]
					}]
				});
				break;

			case "edit":
				const giveawayId = interaction.options.getString("id");
				if (!fs.existsSync(bot.settings.paths.giveaway(bot.settings.application.guildId, giveawayId))) return await interaction.followUp(`Giveaway #${giveawayId} does not exist.`);

				const editedGiveaway = Giveaway.get(logger, bot, giveawayId);

				const gifts = [""];
				for (const gift of editedGiveaway.gifts) gifts.push(gift.name);

				await interaction.followUp({
					content: `Available gifts:${gifts.length > 1 ? gifts.join("\n- ") : " _no available gift right now._"}${typeof editedGiveaway.startsAt == "number" ? `\n\n- Starts at: <t:${Math.floor(editedGiveaway.startsAt / 1000)}:f>` : ""}${typeof editedGiveaway.endsAt == "number" ? `\n- Ends at: <t:${Math.floor(editedGiveaway.endsAt / 1000)}:f>` : ""}\n\n-# Giveaway #${editedGiveaway.id}`,
					components: [{
						type: ComponentType.ActionRow,
						components: [{
							custom_id: `editGiveaway_${editedGiveaway.id}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}, {
							custom_id: `cancelGiveaway_${editedGiveaway.id}`,
							label: "Cancel",
							style: ButtonStyle.Danger,
							type: ComponentType.Button
						}]
					}]
				});
				break;

			case "list":
				const giveaways = Giveaway.list(logger, bot).filter((giveaway) => giveaway.status != Giveaway.status.done);

				let giveawaysList = [""];
				for (const giveaway of giveaways) if (giveaway.status != Giveaway.status.done) giveawaysList.push(`Giveaway #${giveaway.id}${typeof giveaway.startsAt == "number" && typeof giveaway.endsAt == "number" ? ` - from <t:${Math.floor(giveaway.startsAt / 1000)}:f> to <t:${Math.floor(giveaway.endsAt / 1000)}:f>` : ""}`);

				await interaction.followUp(`All active or planned giveaways: ${giveawaysList.length > 1 ? giveawaysList.join("\n- ") : " _no active or planned giveaway right now._"}`);
				break;

			default:
				logger.error(`Unknown subcommand "${subcommand}"`);
				break;
		};
	}
};