const { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, MessageFlagsBitField, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "roles",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("roles")
		.setDescription("Update the roles selection menu"),
	execute: async (interaction) => {
		const rolesSettings = settings?.guilds?.[interaction.guildId]?.roles;

		if (!rolesSettings?.active) {
			interaction.log("Roles automation disabled");
			return await interaction.reply({
				content: "Roles automation is currently disabled",
				ephemeral: true
			});
		}

		if (!rolesSettings?.channel) {
			interaction.log("Roles channel not set");
			return await interaction.reply({
				content: "Roles channel is not set",
				ephemeral: true
			});
		}

		const channel = await interaction.guild.channels.fetch(rolesSettings?.channel);

		if (!channel) {
			interaction.log(`Roles channel "${rolesSettings?.channel}" not found`);
			return await interaction.reply({
				content: "Roles channel not found",
				ephemeral: true
			});
		}

		if (!channel.isTextBased()) {
			interaction.log(`Roles channel "${channel.name}" (${channel.id}) is not text-based`);
			return await interaction.reply({
				content: "Roles channel is not a text-based channel",
				ephemeral: true
			});
		}

		const messages = await channel.messages.fetch();
		messages.each((message) => channel.messages.delete(message));

		await channel.send({
			content: `# Roles\n- You can add any role by pressing buttons.\n- Buttons with :locked: require further steps`,
			flags: new MessageFlagsBitField().add("SuppressNotifications", "Crossposted")
		});

		for (const group of rolesSettings?.groups ?? {}) {
			if (group.active) {
				let content = `## ${group.name}\n> ${group.description}`;
				const buttons = new ActionRowBuilder();

				for (const role of group.roles) {
					const guildRole = await interaction.guild.roles.fetch(role.id);

					if (guildRole) {
						content += `\n- <@&${role.id}>${role.description ? ": " + role.description : ""}`;

						const button = new ButtonBuilder();
						button.setCustomId(`addRole_${role.id}_${role.locked ? "locked" : "unlocked"}`);
						button.setLabel(guildRole.name);
						if (role.locked) button.setEmoji("🔒");
						button.setStyle(ButtonStyle.Secondary);

						buttons.addComponents(button);
					}
				}

				await channel.send({
					content,
					components: [
						buttons.toJSON()
					],
					flags: new MessageFlagsBitField().add("SuppressNotifications", "Crossposted")
				});
			}
		}

		await interaction.reply({
			content: `Roles updated at <#${channel.id}>`,
			ephemeral: true
		});

		interaction.log("Roles updated");
	}
};