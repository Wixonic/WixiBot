const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "w47k3r5Verification",
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const member = await interaction.guild.members.fetch(interaction.member?.id);

		if (member) {
			const guildSettings = settings?.guilds?.[interaction.guildId];
			const rolesSettings = guildSettings?.roles;

			if (rolesSettings?.active) {
				const memberRoles = [];
				member.roles.cache.forEach((role) => memberRoles.push(role.id));
				if (memberRoles.includes(guildSettings?.customSettings?.w47k3r5Role)) {
					await interaction.reply({
						content: "You already have this role.",
						flags: MessageFlags.Ephemeral
					});
				} else {
					const channelId = settings?.guilds?.[interaction.guild.id]?.customSettings?.formResultChannel;

					if (channelId) {
						const channel = await interaction.guild.channels.fetch(channelId);

						if (channel) {
							await channel.send({
								content: `### W47K3R5 Verification:\n- **From**: <@${member.id}>\n- **Walker ID**: ${interaction.fields.getTextInputValue("walkerId")}`,
								components: [
									new ActionRowBuilder()
										.addComponents(
											new ButtonBuilder()
												.setCustomId(`w47k3r5Verification_accept_${member.id}`)
												.setLabel("Accept")
												.setStyle(ButtonStyle.Success),
											new ButtonBuilder()
												.setCustomId(`w47k3r5Verification_reject_${member.id}`)
												.setLabel("Reject")
												.setStyle(ButtonStyle.Danger)
										)
								]
							});

							await interaction.editReply({
								content: "Your form has been sent for review. This process may take a few hours or days.\nPlease do not resubmit this form.",
								flags: MessageFlags.Ephemeral
							});
							interaction.log("Verification prompt sent");
						} else {
							interaction.error("Failed to fetch channel");
							await interaction.editReply({
								content: "This role is not available.",
								flags: MessageFlags.Ephemeral
							});
						}
					} else {
						interaction.log("Failed to find channel ID");
						await interaction.editReply({
							content: "This role is not available.",
							flags: MessageFlags.Ephemeral
						});
					}
				}
			} else {
				interaction.log("Roles automation disabled");
				await interaction.editReply({
					content: "This role is not available.",
					flags: MessageFlags.Ephemeral
				});
			}
		} else {
			interaction.log("Failed to fetch member");
			await interaction.editReply({
				content: "This role is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}