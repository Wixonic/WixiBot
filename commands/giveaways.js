const { ApplicationCommandType, ButtonStyle, ChannelType, ComponentType, MessageFlags, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } = require("discord.js");

const { Giveaway } = require("../lib/giveaways.js");

const config = require("../config.js");
const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "giveaways",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("giveaways")
		.setDescription("Manage giveaways")
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("create")
				.setDescription("Create a giveaway")
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("edit")
				.setDescription("Edit a giveaway")
				.addStringOption(
					new SlashCommandStringOption()
						.setName("id")
						.setDescription("Giveaway ID")
						.setRequired(true)
						.setMinLength(5)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("list")
				.setDescription("List giveaways")
		),
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const giveawaysSettings = settings.guilds[interaction.guildId]?.giveaways;

		if (!giveawaysSettings?.active) {
			interaction.log("Giveaways disabled");
			return await interaction.editReply({
				content: "Giveaways are currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		const subcommand = interaction.options.getSubcommand();

		interaction.log(`/giveaways ${subcommand}`);

		switch (subcommand) {
			case "create":
				const createGiveaway = new Giveaway(interaction.guildId, Giveaway.generateId(interaction.createdTimestamp));
				await interaction.editReply({
					content: `Giveaway created.`,
					components: [{
						type: ComponentType.ActionRow,
						components: [{
							customId: `giveawayEdit_${createGiveaway.giveawayId}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}]
					}],
					flags: MessageFlags.Ephemeral
				});
				break;

			case "edit":
				const editGiveaway = new Giveaway(interaction.guildId, Giveaway.generateId(interaction.createdTimestamp));
				await interaction.editReply({
					content: `EDITGIVEAWAY.DETAILS`,
					components: [{
						type: ComponentType.ActionRow,
						components: [{
							customId: `giveawayEdit_${editGiveaway.giveawayId}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}, {
							customId: `giveawayDelete_${editGiveaway.giveawayId}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}]
					}],
					flags: MessageFlags.Ephemeral
				});
				break;

			case "list":
				await interaction.editReply({
					content: `GIVEAWAYS`,
					flags: MessageFlags.Ephemeral
				});
				break;

			default:
				interaction.log(`Unknown subcommand "${interaction.options.getSubcommand()}"`);
				await interaction.editReply({
					content: `Unknown subcommand "${interaction.options.getSubcommand()}"`,
					flags: MessageFlags.Ephemeral
				});
				break;
		};
	}
};