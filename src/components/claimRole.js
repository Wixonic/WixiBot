const { ComponentType, MessageFlags } = require("discord.js");

const Roles = require("../lib/roles.js");

/**
 * @type {import("../types.d.ts").ComponentInfo}
 */
const component = {
	name: "Claim Role",
	id: "claimRole",
	type: ComponentType.Button,

	/**
	 * @param {import("discord.js").ButtonInteraction} interaction
	 */
	run: async (logger, bot, interaction, roleId, recurrent) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const guild = await bot.guilds.fetch(bot.settings.application.guildId);
		const role = await guild.roles.fetch(roleId);

		const claimRole = async (id) => {
			if (id) {
				if (interaction.member.roles.cache.has(id)) {
					try {
						await interaction.member.roles.remove(id);
						return await interaction.followUp(`<@&${id}> successfully removed from your account.`);
					} catch (e) {
						logger.warn(`Failed to remove role "${id}":`, e);
					}
				} else {
					try {
						await interaction.member.roles.add(id);
						return await interaction.followUp(`<@&${id}> successfully added to your account.`);
					} catch (e) {
						logger.warn(`Failed to add role "${id}":`, e);
					}
				}
			}

			await interaction.followUp("This role is not available anymore.");
		};

		if (role) {
			const list = Roles.list(logger, bot);

			if (recurrent === "true") {
				if (list.recurrentRoles.active.findIndex((r) => r.name === role.name.replace(` ${new Date().getUTCFullYear()}`, "")) > -1) return await claimRole(role.id);
			} else {
				const roleSettings = list.roles.all.find((r) => r.id === role.id);

				if (roleSettings) {
					if (roleSettings.requirements) return await interaction.followUp(roleSettings.requirements);
					else return await claimRole(role.id);
				}
			}
		}

		await interaction.followUp("This role is not available anymore.");
	}
};

module.exports = component;