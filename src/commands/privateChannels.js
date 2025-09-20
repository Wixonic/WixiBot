const { ApplicationCommandType, ApplicationCommandOptionType, InteractionContextType, MessageFlags } = require("discord.js");

const PrivateChannel = require("../lib/privateChannels.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Private Channels",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "private-channels",
		description: "Manage your private channel in the server",
		contexts: [
			InteractionContextType.Guild
		],
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "info",
				description: "View details of your current private channel"
			}, {
				type: ApplicationCommandOptionType.SubcommandGroup,
				name: "add",
				description: "Invite members to your private channel",
				options: [
					{
						type: ApplicationCommandOptionType.Subcommand,
						name: "role",
						description: "Invite a role to your private channel",
						options: [
							{
								type: ApplicationCommandOptionType.Role,
								name: "role",
								description: "Select the role you want to invite",
								required: true
							}
						]
					}, {
						type: ApplicationCommandOptionType.Subcommand,
						name: "member",
						description: "Invite a member to your private channel",
						options: [
							{
								type: ApplicationCommandOptionType.User,
								name: "member",
								description: "Select the user you want to invite",
								required: true
							}
						]
					}
				]
			}, {
				type: ApplicationCommandOptionType.SubcommandGroup,
				name: "remove",
				description: "Revoke members' access to your private channel",
				options: [
					{
						type: ApplicationCommandOptionType.Subcommand,
						name: "role",
						description: "Revoke a role's access to your private channel",
						options: [
							{
								type: ApplicationCommandOptionType.Role,
								name: "role",
								description: "Select the role you want to remove",
								required: true
							}
						]
					}, {
						type: ApplicationCommandOptionType.Subcommand,
						name: "member",
						description: "Revoke a member's access to your private channel",
						options: [
							{
								type: ApplicationCommandOptionType.User,
								name: "member",
								description: "Select the user you want to remove",
								required: true
							}
						]
					}
				]
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "open",
				description: "Open the channel so anyone can join"
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "restrict",
				description: "Lock the channel to invite-only access"
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const privateChannel = await PrivateChannel.get(logger, bot, interaction.member.id);
		if (privateChannel) {
			const subcommandGroup = interaction.options.getSubcommandGroup();
			const subcommand = interaction.options.getSubcommand();
			const targetRole = interaction.options.getRole("role");
			const targetUser = interaction.options.getUser("member");

			const isPublic = await privateChannel.isPublic();
			const roles = await privateChannel.getRoles();
			const members = await privateChannel.getMembers();

			switch (subcommandGroup) {
				case "add":
					switch (subcommand) {
						case "role":
							await privateChannel.addRole(targetRole.id);
							await interaction.followUp({
								allowedMentions: {},
								content: `<@&${targetRole.id}> has been added to <#${privateChannel.id}>.${isPublic ? "\n\nThis channel is currently public, so anyone can join without being added until this channel is restricted." : ""}`
							});
							break;

						case "member":
							await privateChannel.addMember(targetUser.id);
							await interaction.followUp({
								allowedMentions: {},
								content: `<@${targetUser.id}> has been added to <#${privateChannel.id}>.${isPublic ? "\n\nThis channel is currently public, so anyone can join without being added until this channel is restricted." : ""}`
							});
							break;

						default:
							logger.error("Invalid subcommand:", subcommandGroup, subcommand);
							break;
					}
					break;

				case "remove":
					switch (subcommand) {
						case "role":
							await privateChannel.removeRole(targetRole.id);
							await interaction.followUp({
								allowedMentions: {},
								content: `<@&${targetRole.id}> has been removed from <#${privateChannel.id}>.${isPublic ? "\n\nThis channel remains public, so members can still join freely until this channel is restricted" : ""}`
							});
							break;

						case "member":
							await privateChannel.removeMember(targetUser.id);
							await interaction.followUp({
								allowedMentions: {},
								content: `<@${targetUser.id}> has been removed from <#${privateChannel.id}>.${isPublic ? "\n\nThis channel remains public, so members can still join freely until this channel is restricted" : ""}`
							});
							break;

						default:
							logger.error("Invalid subcommand:", subcommandGroup, subcommand);
							break;
					}
					break;

				default:
					switch (subcommand) {
						case "info":
							await interaction.followUp({
								allowedMentions: {},
								content: `### Private channel: <#${privateChannel.id}>\n- Owner: <@${privateChannel.memberId}>\n- Status: ${isPublic ? "Public" : "Restricted"}\n- Allowed roles:${roles.length > 0 ? `\n  - <@&${roles.join(">\n  - <@&")}>` : " _No roles have access yet._"}\n- Allowed members:${members.length > 0 ? `\n  - <@${members.join(">\n  - <@")}>` : " _No members have access yet._"}`
							});
							break;

						case "open":
							await privateChannel.setPublic();
							await interaction.followUp({
								allowedMentions: {},
								content: `<#${privateChannel.id}> is now public. Everyone can view and join this channel.`
							});
							break;

						case "restrict":
							await privateChannel.setPrivate();
							await interaction.followUp({
								allowedMentions: {},
								content: `<#${privateChannel.id}> is now restricted. Only invited members may access it.`
							});
							break;

						default:
							logger.error("Invalid subcommand:", subcommand);
							break;
					}
			}
		} else await interaction.followUp({
			allowedMentions: {},
			content: `You don't have a private channel.\nCreate one by joining one of theses channels:\n- <#${Object.keys(bot.settings.application.commands.privateChannels.channels).join(">\n- <#")}>`
		});
	}
};

module.exports = info;