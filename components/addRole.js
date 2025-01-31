const { MessageFlags } = require("discord.js");

const { getRoleSettingsForGuild } = require("../utils.js");

const settings = require("../settings.js");

/**
 * @type {import("../components.js").Component}
 */
module.exports = {
	name: "addRole",
	args: 2,
	execute: async (interaction, args) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const rolesSettings = settings.guilds?.[interaction.guildId]?.roles;
		const recurrentSettings = rolesSettings?.recurrentRoles;

		const member = await interaction.guild.members.fetch(interaction.member?.id);

		const roleId = args[0];
		const role = await interaction.guild.roles.fetch(roleId);
		const roleSettings = getRoleSettingsForGuild(interaction.guildId, roleId);

		const isLocked = args[1] == "locked";

		const recurrentRolesNames = [];
		for (const role of recurrentSettings?.roles ?? []) recurrentRolesNames.push(role.name);
		const isRecurrent = recurrentSettings?.active && recurrentRolesNames.includes(role.name.replace(` ${new Date().getFullYear()}`, ""));

		if (rolesSettings?.active && member && role && (roleSettings || isRecurrent)) {
			if (isLocked) {
				if (roleSettings.modal) {
					interaction.log(`Role "${role.name}" - Locked, sending modal`);

					await interaction.showModal(roleSettings.modal.toJSON());
					await interaction.deleteReply();
				}

				if (roleSettings.prompt) {
					interaction.log(`Role "${role.name}" - Locked, sending prompt`);

					await interaction.editReply({
						components: roleSettings.prompt?.components ?? [],
						content: `> As this role requires extra steps, please follow the instructions\n\n${roleSettings.prompt?.content ?? "_No instruction, good luck!_\nIf you see this message, please contact an admin."}`,
						flags: MessageFlags.Ephemeral
					});
				}

				if (roleSettings.message) {
					interaction.log(`Role "${role.name}" - Locked, sending message`);

					await interaction.editReply({
						content: roleSettings.message,
						flags: MessageFlags.Ephemeral
					});
				}
			} else {
				interaction.log(`Role "${role.name}"`);

				if (member.roles.cache.has(roleId)) {
					try {
						await member.roles.remove(roleId);
						interaction.log("Removed");
					} catch (e) {
						interaction.log(`Failed to remove: ${e}`);
						return await interaction.editReply({
							content: "An error occured.",
							flags: MessageFlags.Ephemeral
						});
					}

					await interaction.editReply({
						content: `<@&${roleId}> successfully removed from your account.`,
						flags: MessageFlags.Ephemeral
					});
				} else {
					try {
						await member.roles.add(roleId);
						interaction.log("Added");
					} catch (e) {
						interaction.log(`Failed to add: ${e}`);
						return await interaction.editReply({
							content: "An error occured.",
							flags: MessageFlags.Ephemeral
						});
					}

					await interaction.editReply({
						content: `<@&${roleId}> successfully added to your account.`,
						flags: MessageFlags.Ephemeral
					});
				}
			}
		} else {
			interaction.log(`Failed to fetch role, role settings or member`);
			await interaction.editReply({
				content: "This role is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	}
}