import {
	ApplicationIntegrationType,
	ChannelType,
	type ChatInputCommandInteraction,
	CheckboxBuilder,
	ContainerBuilder,
	type GuildTextBasedChannel,
	InteractionContextType,
	LabelBuilder,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	RadioGroupBuilder,
	RadioGroupOptionBuilder,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";

import { client, type Command } from "../lib/client.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("message")
		.setDescription("Sends messages with the bot.")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM
		])
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand((subcommand) => subcommand
			.setName("as")
			.setDescription("Sends a message as the bot.")
		)
		.addSubcommand((subcommand) => subcommand
			.setName("ticket")
			.setDescription("Publish the ticket message in the specified channel.")
			.addChannelOption((option) => option
				.setName("channel")
				.setDescription("The channel to publish the ticket message in")
				.addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)
				.setRequired(true)
			)
		),

	async execute(_logger, interaction) {
		if (interaction.options.getSubcommand(true) !== "as") {
			await interaction.deferReply({
				flags: MessageFlags.Ephemeral
			});
		}

		switch (interaction.options.getSubcommand(true)) {
			case "as": {
				const modal = new ModalBuilder()
					.setCustomId("message:as")
					.setTitle("Send Message");

				const content = new LabelBuilder()
					.setLabel("Message Content")
					.setTextInputComponent(
						new TextInputBuilder()
							.setCustomId("content")
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder("Enter the message content here...")
							.setRequired(true)
					);

				/* const style = new LabelBuilder()
					.setLabel("Message Style")
					.setRadioGroupComponent(
						new RadioGroupBuilder()
							.setCustomId("style")
							.setOptions([
								new RadioGroupOptionBuilder().setLabel("Raw Message").setValue("raw").setDefault(true)
							])
							.setRequired(true)
					); */

				const ephemeral = new LabelBuilder()
					.setLabel("Ephemeral")
					.setDescription("Send as an ephemeral message?")
					.setCheckboxComponent(
						new CheckboxBuilder()
							.setCustomId("ephemeral")
							.setDefault(false)
					);

				await interaction.showModal(modal
					.addLabelComponents(content, /* style, */ ephemeral)
				);
				break;
			}

			case "ticket": {
				if (interaction.guild) {
					const guildId = interaction.guildId;
					if (!guildId) {
						await interaction.deleteReply();
						throw new Error("Guild context expected");
					}

					const guild = await client.getGuild(guildId);

					if (guild) {
						const channel = interaction.options.getChannel("channel", true) as GuildTextBasedChannel;
						const ticketChannel = await interaction.guild.channels.fetch(guild.settings.tickets.channel ?? "-1").catch(() => null);

						if (!ticketChannel || !ticketChannel.isTextBased() || !ticketChannel.isSendable()) {
							const settingsCommandId = await client.getCommandId("settings");
							const settingsCommandText = settingsCommandId ? `</settings:${settingsCommandId}>` : "`/settings`";
							await interaction.editReply({
								content: `The ticket channel is not set up yet! Please set it up using ${settingsCommandText}.`
							});
							return;
						}

						const rolesText: string[] = [];
						const roles = await interaction.guild.roles.fetch();

						for (const role of roles.values()) {
							const permissions = ticketChannel.permissionsFor(role);
							if (permissions.has(PermissionFlagsBits.ViewChannel) || permissions.has(PermissionFlagsBits.Administrator)) {
								if (role.id === interaction.guild.roles.everyone.id) {
									await interaction.editReply({
										content: `The ticket channel cannot be visible to everyone!
Please adjust the permissions and try again.`
									});
									return;
								} else rolesText.push(`<@&${role.id}>`);
							}
						}

						const applicationBotName = interaction.client.user?.username;
						const guildName = interaction.guild.name;

						await channel.send({
							components: [
								new ContainerBuilder()
									.addTextDisplayComponents((component) => component
										.setContent(`# Need help?
If you need assistance and believe we can help, please select a reason below.
Our support team will review your request and get back to you as soon as possible!`)
									)
									.addActionRowComponents((component) => component
										.addComponents([
											new StringSelectMenuBuilder()
												.setCustomId("ticket:reason")
												.setPlaceholder("Select a reason")
												.addOptions([
													new StringSelectMenuOptionBuilder()
														.setLabel("Select a reason")
														.setValue("reset"),
													new StringSelectMenuOptionBuilder()
														.setLabel(`I have an issue on ${guildName}`)
														.setValue("server"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I have an issue on Discord in general")
														.setValue("discord"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I need help with a command")
														.setValue("command"),
													new StringSelectMenuOptionBuilder()
														.setLabel(`I have a question about ${applicationBotName} in general`)
														.setValue("application"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I have a question about privacy")
														.setValue("privacy"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I found a bug")
														.setValue("bug"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I want to contribute on GitHub")
														.setValue("github"),
													new StringSelectMenuOptionBuilder()
														.setLabel("I want to contribute in another way")
														.setValue("contribute"),
													new StringSelectMenuOptionBuilder()
														.setLabel("Not listed above")
														.setValue("other")
												])
										])
									)
									.addTextDisplayComponents((component) => component
										.setContent(`-# Your ticket will be visible to ${rolesText.join(", ")}`)
									)
							],
							flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications
						});

						await interaction.deleteReply();
						break;
					} else {
						await interaction.deleteReply();
						throw new Error("Guild not found")
					}
				} else {
					await interaction.deleteReply();
					throw new Error("Guild context expected");
				}

			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown subcommand");
			}
		}
	}
} satisfies Command<ChatInputCommandInteraction>;