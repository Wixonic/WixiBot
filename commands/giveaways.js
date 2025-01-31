const { ApplicationCommandType, ButtonStyle, ChannelType, ComponentType, MessageFlags, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } = require("discord.js");

const { Giveaway } = require("../lib/giveaways.js");

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
				const createGiveaway = new Giveaway(interaction.guildId, Giveaway.generateId(interaction.createdTimestamp, interaction.guildId));
				await interaction.editReply({
					content: `Giveaway created.\n-# Giveaway ${createGiveaway.giveawayId}`,
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
				const editGiveaway = Giveaway.get(interaction.guildId, interaction.options.getString("id"));

				if (!editGiveaway) return await interaction.editReply({
					content: `Giveaway "${interaction.options.getString("id")}" does not exist.`,
					flags: MessageFlags.Ephemeral
				});

				const gifts = [""];
				for (const gift in editGiveaway.gifts) gifts.push(gift);

				await interaction.editReply({
					content: `Available gifts:${gifts.length > 1 ? gifts.join("\n- ") : " no available gift right now."}${typeof editGiveaway.startsAt == "number" ? `\n\n- Starts at: <t:${Math.floor(editGiveaway.startsAt / 1000)}:f>` : ""}${typeof editGiveaway.endsAt == "number" ? `\n- Ends at: <t:${Math.floor(editGiveaway.endsAt / 1000)}:f>` : ""}\n\n-# Giveaway ${editGiveaway.giveawayId}`,
					components: [{
						type: ComponentType.ActionRow,
						components: [{
							customId: `giveawayEdit_${editGiveaway.giveawayId}`,
							label: "Edit",
							style: ButtonStyle.Primary,
							type: ComponentType.Button
						}, {
							customId: `giveawayDelete_${editGiveaway.giveawayId}`,
							label: "Delete",
							style: ButtonStyle.Danger,
							type: ComponentType.Button
						}]
					}],
					flags: MessageFlags.Ephemeral
				});
				break;

			case "list":
				const giveaways = Giveaway.list(interaction.guildId);

				let giveawaysList = [""];
				for (const giveaway of giveaways) if (giveaway.status != Giveaway.status.done) giveawaysList.push(`Giveaway ${giveaway.giveawayId}${typeof giveaway.startsAt == "number" && typeof giveaway.endsAt == "number" ? ` - from <t:${Math.floor(giveaway.startsAt / 1000)}:f> to <t:${Math.floor(giveaway.endsAt / 1000)}:f>` : ""}`);

				await interaction.editReply({
					content: `All active or planned giveaways: ${giveawaysList.length > 1 ? giveawaysList.join("\n- ") : " no active or planned giveaway right now."}`,
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