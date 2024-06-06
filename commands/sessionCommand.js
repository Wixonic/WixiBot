const { ApplicationCommandType, ChannelType, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandSubcommandBuilder, SlashCommandUserOption } = require("discord.js");

const { Session } = require("../lib/sessions.js");
const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "session",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("session")
		.setDescription("Manage sessions")
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("start")
				.setDescription("Start a session")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the session channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("add")
				.setDescription("Add someone to a session")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the session channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice)
				)
				.addUserOption(
					new SlashCommandUserOption()
						.setName("member")
						.setDescription("Member to add to the session")
						.setRequired(true)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("remove")
				.setDescription("Remove someone of a session")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the session channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice)
				)
				.addUserOption(
					new SlashCommandUserOption()
						.setName("member")
						.setDescription("Member to the session")
						.setRequired(true)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("stop")
				.setDescription("Stop a session")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the session channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("info")
				.setDescription("Get info about a session")
				.addChannelOption(
					new SlashCommandChannelOption()
						.setName("channel")
						.setDescription("Name of the session channel")
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildVoice)
				)
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName("list")
				.setDescription("List all sessions in this guild")
		),
	execute: async (interaction) => {
		const sessionSettings = settings?.guilds[interaction.guildId]?.session;

		if (!sessionSettings?.active) {
			interaction.log("Session Tool disabled");
			return await interaction.reply({
				content: "Session Tool is currently disabled",
				ephemeral: true
			});
		}

		switch (interaction.options.getSubcommand()) {
			case "start":
				const startChannel = interaction.options.getChannel("channel", true);
				const startSession = Session.get(startChannel.id);

				if (!startSession) {
					new Session(interaction.guild, startChannel, interaction.member);

					await interaction.reply({
						content: `Created session at <#${startChannel.id}>`,
						ephemeral: true
					});
				} else {
					interaction.log(`Session at channel "${startChannel.name}" (${startChannel.id}) already exists`);
					await interaction.reply({
						content: `Session at <#${startChannel.id}>  already exists`,
						ephemeral: true
					});
				}
				break;

			case "stop":
				const stopChannel = interaction.options.getChannel("channel", true);
				const stopSession = Session.get(stopChannel.id);

				if (stopSession) {
					await stopSession.stop();
					await interaction.reply({
						content: `Session at <#${stopChannel.id}> no longer exists`,
						ephemeral: true
					});
				} else {
					interaction.log(`Session at channel "${stopChannel.name}" (${stopChannel.id}) does not exist`);
					await interaction.reply({
						content: `Session at <#${stopChannel.id}> does not exist`,
						ephemeral: true
					});
				}
				break;

			case "add":
				const addChannel = interaction.options.getChannel("channel", true);
				const addSession = Session.get(addChannel.id);

				if (addSession) {
					const addUser = interaction.options.getUser("member", true);
					const addMember = await interaction.guild.members.fetch(addUser);

					if (addMember) {
						if (await addSession.addMember(addMember)) {
							await interaction.reply({
								content: `User <@${addMember.id}> successfully added to session`,
								ephemeral: true
							});
						} else {
							interaction.log(`User "${addMember.user.name}" (${addMember.id}) already in session at channel "${addChannel.name}" (${addChannel.id})`);
							await interaction.reply({
								content: `User <@${addMember.id}> is already in session`,
								ephemeral: true
							});
						}
					} else {
						interaction.log(`User "${addMember.user.name}" (${addMember.id}) can't join session at channel "${addChannel.name}" (${addChannel.id}) - not in guild`);
						await interaction.reply({
							content: `User <@${addUser.id}> not in guild`,
							ephemeral: true
						});
					}
				} else {
					interaction.log(`Session at channel "${addChannel.name}" (${addChannel.id}) does not exist`);
					await interaction.reply({
						content: `Session at <#${addChannel.id}> does not exist`,
						ephemeral: true
					});
				}
				break;

			case "remove":
				const removeChannel = interaction.options.getChannel("channel", true);
				const removeSession = Session.get(removeChannel.id);

				if (removeSession) {
					const removeUser = interaction.options.getUser("member", true);
					const removeMember = await interaction.guild.members.fetch(removeUser);

					if (removeMember) {
						if (await removeSession.removeMember(removeMember)) {
							await interaction.reply({
								content: `User <@${removeMember.id}> successfully added to session`,
								ephemeral: true
							});
						} else {
							interaction.log(`User "${removeMember.user.name}" (${removeMember.id}) already in session at channel "${removeChannel.name}" (${removeChannel.id})`);
							await interaction.reply({
								content: `User <@${removeMember.id}> is already in session`,
								ephemeral: true
							});
						}
					} else {
						interaction.log(`User "${removeMember.user.name}" (${removeMember.id}) can't join session at channel "${removeChannel.name}" (${removeChannel.id}) - not in guild`);
						await interaction.reply({
							content: `User <@${removeMember.id}> not in guild`,
							ephemeral: true
						});
					}
				} else {
					interaction.log(`Session at channel "${removeChannel.name}" (${removeChannel.id}) does not exist`);
					await interaction.reply({
						content: `Session at <#${removeChannel.id}> does not exist`,
						ephemeral: true
					});
				}
				break;

			case "info":
				const infoChannel = interaction.options.getChannel("channel", true);
				const infoSession = Session.get(infoChannel.id);

				if (infoSession) {
					const infoSessionMembers = [];
					for (const member of infoSession.members) infoSessionMembers.push(member.id);

					await interaction.reply({
						content: `### Basic info\n- Session <#${infoChannel.id}>\n- Created <t:${Math.floor(infoSession.createdAt / 1000)}:R> by <@${infoSession.createdBy.id}>\n- ${infoSessionMembers.length} member${infoSessionMembers.length > 1 ? "s" : ""}\n### Members\n${infoSessionMembers.length > 0 ? `- <@${infoSessionMembers.join(">\n- <@")}>` : "No one has been added to the session"}`,
						ephemeral: true
					});
				} else {
					interaction.log(`Session at channel "${infoChannel.name}" (${infoChannel.id}) does not exist`);
					await interaction.reply({
						content: `Session at <#${infoChannel.id}> does not exist`,
						ephemeral: true
					});
				}
				break;

			case "list":
				const sessionChannels = [];

				for (const channelId in Session.list) {
					const session = Session.get(channelId);

					if (interaction.guildId == session.guild.id) sessionChannels.push(channelId);
				}

				if (sessionChannels.length > 0) {
					await interaction.reply({
						content: `### Here are the sessions on the server:\n- <#${sessionChannels.join(">\n- <#")}>`,
						ephemeral: true
					});
				} else {
					await interaction.reply({
						content: "There are currently no sessions",
						ephemeral: true
					});
				}
				break;

			default:
				interaction.log(`Unknown subcommand "${interaction.options.getSubcommand()}"`);
				await interaction.reply({
					content: `Unknown subcommand "${interaction.options.getSubcommand()}"`,
					ephemeral: true
				});
				break;
		}
	}
};