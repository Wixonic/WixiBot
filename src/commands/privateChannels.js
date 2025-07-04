const { ApplicationCommandType, MessageFlags, ApplicationCommandOptionType } = require("discord.js");

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
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "info",
				description: "View details of your current private channel"
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "add",
				description: "Invite a member to your private channel",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "member",
						description: "Select the user you want to invite",
						required: true
					}
				]
			}, {
				type: ApplicationCommandOptionType.Subcommand,
				name: "remove",
				description: "Revoke a member's access from your private channel",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "member",
						description: "Select the user you want to remove",
						required: true
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
	run: async (logger, bot, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const privateChannel = await PrivateChannel.get(logger, bot, interaction.member.id);
		if (privateChannel) {
			const subcommand = interaction.options.getSubcommand();
			const targetUser = interaction.options.getUser("member");

			const isPublic = await privateChannel.isPublic();
			const members = await privateChannel.getMembers();

			switch (subcommand) {
				case "info":
					await interaction.followUp({
						allowedMentions: {},
						content: `Private channel: <#${privateChannel.id}>\nOwner: <@${privateChannel.memberId}>\nStatus: ${isPublic ? "Public" : "Restricted"}\nAllowed members:\n${members.length > 0 ? `- <@${members.join(">\n- <@")}>` : "_No members have access yet._"}`
					});
					break;

				case "add":
					await privateChannel.addMember(targetUser);
					await interaction.followUp({
						allowedMentions: {},
						content: `<@${targetUser.id}> has been added to <#${privateChannel.id}>.${isPublic ? "\n\nThis channel is currently public, so anyone can join without an invite until this channel is restricted." : ""}`
					});
					break;

				case "remove":
					await privateChannel.removeMember(targetUser);
					await interaction.followUp({
						allowedMentions: {},
						content: `<@${targetUser.id}> has been removed from <#${privateChannel.id}>.${isPublic ? "\n\nThis channel remains public, so members can still join freely until this channel is restricted" : ""}`
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
		} else await interaction.followUp({
			allowedMentions: {},
			content: `You don't have a private channel.\nCreate one by joining one of theses channels:\n- <#${Object.keys(bot.settings.application.commands.privateChannels.channels).join(">\n- <#")}>`
		});
	}
};

module.exports = info;