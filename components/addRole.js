const { getRoleSettingsForGuild } = require("../utils.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "addRole",
	args: 2,
	execute: async (interaction, args) => {
		const roleId = args[0];
		const role = await interaction.guild.roles.fetch(roleId);
		const roleSettings = getRoleSettingsForGuild(interaction.guildId, roleId);
		const member = await interaction.guild.members.fetch(interaction.member?.id);

		const isLocked = args[1] == "locked";

		if (member && role && roleSettings) {
			if (isLocked) {
				if (roleSettings.modal) {
					interaction.log(`Role "${role.name}" (${role.id}) - Locked, sending modal`);

					await interaction.showModal(roleSettings.modal.toJSON());
				}

				if (roleSettings.prompt) {
					interaction.log(`Role "${role.name}" (${role.id}) - Locked, sending prompt`);

					await interaction.reply({
						components: roleSettings.prompt?.components ?? [],
						content: `> As this role requires extra steps, please follow the instructions\n\n${roleSettings.prompt?.content ?? "_No instruction, good luck!_\nIf you see this message, please contact an admin."}`,
						ephemeral: true
					});
				}
			} else {
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
			}
		} else {
			interaction.log(`Failed to fetch role (${roleId}), role settings or member`);
			await interaction.reply({
				content: "This role is not available.",
				ephemeral: true
			});
		}
	}
}