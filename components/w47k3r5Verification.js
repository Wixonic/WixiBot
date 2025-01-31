const { MessageFlags } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "w47k3r5Verification",
	args: 2,
	execute: async (interaction, args) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const guildSettings = settings?.guilds?.[interaction.guildId];

		const mode = args[0];
		const memberId = args[1];

		const role = guildSettings?.customSettings?.w47k3r5Role;

		if (!role) {
			interaction.error("w47k3r5 role is not set.");
			await interaction.editReply({
				content: "This role is not available.",
				flags: MessageFlags.Ephemeral
			});
		} else {
			const member = await interaction.guild.members.fetch(memberId);

			switch (mode) {
				case "accept":
					await member.roles.add(role);

					await interaction.message.edit({
						content: `${interaction.message.content}\n- **Accepted** by <@${interaction.user.id}> at <t:${Math.floor(Date.now() / 1000)}:f>`,
						components: []
					});

					await interaction.editReply({
						content: "Request accepted.",
						flags: MessageFlags.Ephemeral
					});

					interaction.log(`Request accepted by ${interaction.user.id}`);
					break;

				case "reject":
					await interaction.message.edit({
						content: `${interaction.message.content}\n- **Rejected** by <@${interaction.user.id}> at <t:${Math.floor(Date.now() / 1000)}:f>`,
						components: []
					});

					await interaction.editReply({
						content: "Request rejected.",
						flags: MessageFlags.Ephemeral
					});

					interaction.log(`Request rejected by ${interaction.user.id}`);
					break;

				default:
					await interaction.editReply({
						content: "This role is not available.",
						flags: MessageFlags.Ephemeral
					});
					interaction.error(`Invalid mode: ${mode}`);
					break;
			}
		}
	}
};