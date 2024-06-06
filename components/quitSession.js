const { Session } = require("../lib/sessions.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "quitSession",
	args: 1,
	execute: async (interaction, args) => {
		const channelId = args[0];
		const session = Session.get(channelId);

		if (session) {
			const index = session.members.findIndex((member) => member.id == interaction.user.id);
			if (index >= 0) {
				await session.removeMember(session.members[index]);
				await interaction.reply({
					content: "You are no longer part of this session",
					ephemeral: true
				});
			} else {
				interaction.log(`User "${interaction.user.username}" (${interaction.user.id}) is not part of session at channel "${session.channel.name}" (${session.channel.id}) in guild "${session.guild.name}" (${session.guild.id})`);
				await interaction.reply({
					content: "You are not part of this session",
					ephemeral: true
				});
			}
		} else {
			interaction.log(`Session ${channelId} no longer exists`);
			await interaction.reply({
				content: "This session no longer exists",
				ephemeral: true
			});
		}
	}
}