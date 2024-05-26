/**
 * @type {import("../buttons.js").Button}
 */
module.exports = {
	name: "addRole",
	args: 1,
	execute: async (interaction, args) => {
		const roleId = args[0];
		const role = await interaction.guild.roles.fetch(roleId);
		const member = await interaction.guild.members.fetch(interaction.member.id);

		if (role && member) {
			interaction.log(`Role "${role.name}" (${role.id})`);

			if (member.roles.cache.has(roleId)) {
				try {
					await member.roles.remove(roleId);
					interaction.log("Removed");
				} catch (e) {
					interaction.log(`Failed to remove: ${e}`);
					return await interaction.reply({
						content: "An error occured.",
						ephemeral: true
					});
				}

				await interaction.reply({
					content: `<@&${roleId}> successfully removed from your account.`,
					ephemeral: true
				});
			} else {
				try {
					await member.roles.add(roleId);
					interaction.log("Added");
				} catch (e) {
					interaction.log(`Failed to add: ${e}`);
					return await interaction.reply({
						content: "An error occured.",
						ephemeral: true
					});
				}

				await interaction.reply({
					content: `<@&${roleId}> successfully added to your account.`,
					ephemeral: true
				});
			}
		} else {
			interaction.log(`Failed to fetch role (${roleId}) or member`);
			await interaction.reply({
				content: "This role is not available.",
				ephemeral: true
			});
		}
	}
}