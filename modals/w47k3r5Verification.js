const settings = require("../settings.js");

/**
 * @type {import("../modals.js").Modal}
 */
module.exports = {
	name: "w47k3r5Verification",
	execute: async (interaction) => {
		const member = await interaction.guild.members.fetch(interaction.member.id);

		if (member) {
			const channelId = settings.guilds[interaction.guild.id]?.customSettings?.formResultChannel;

			if (channelId) {
				const channel = await interaction.guild.channels.fetch(channelId);

				if (channel) {
					await channel.send({
						content: `## W47K3R5 Verification:\n- **From**: <@${member.id}>\n- **Walker ID**: ${interaction.fields.getTextInputValue("walkerId")}`
					});

					await interaction.reply({
						content: "Your form has been sent for review. This process may take a few hours or days.\nPlease do not resubmit this form, or action will be taken.",
						ephemeral: true
					});
					interaction.log("Verification prompt sent");
				} else {
					interaction.log("Failed to fetch channel");
					await interaction.reply({
						content: "This role is not available.",
						ephemeral: true
					});
				}
			} else {
				interaction.log("Failed to find channel ID");
				await interaction.reply({
					content: "This role is not available.",
					ephemeral: true
				});
			}
		} else {
			interaction.log("Failed to fetch member");
			await interaction.reply({
				content: "This role is not available.",
				ephemeral: true
			});
		}
	}
}