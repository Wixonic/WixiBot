const { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, MessageFlags, MessageFlagsBitField, SlashCommandBuilder } = require("discord.js");

const { getGuild } = require("../clients.js");
const log = require("../log.js");
const { hexToIntColor } = require("../utils.js");

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
	/**
	 * @param {import("discord.js").ChatInputCommandInteraction | Function} interaction
	 * @param {string?} guildId 
	 * @returns 
	 */
	execute: async (interaction, guildId) => {
		if (typeof interaction == "function") {
			interaction = {
				log: interaction,
				guildId,
				guild: await getGuild(guildId),
				fake: true
			};
		} else interaction.fake = false;

		if (!interaction.fake) {
			await interaction.deferReply({
				flags: MessageFlags.Ephemeral
			});
		}

		const rolesSettings = settings.guilds?.[interaction.guildId]?.roles;
		const recurrentSettings = rolesSettings?.recurrentRoles;

		if (!rolesSettings?.active) {
			interaction.log("Roles automation disabled");
			if (!interaction.fake) {
				return await interaction.editReply({
					content: "Roles automation is currently disabled",
					flags: MessageFlags.Ephemeral
				});
			} else return false;
		}

		if (!rolesSettings?.channel) {
			interaction.log("Roles channel not set");
			if (!interaction.fake) {
				return await interaction.editReply({
					content: "Roles channel is not set",
					flags: MessageFlags.Ephemeral
				});
			}
		}

		/**
		 * @type {import("discord.js").TextChannel}
		 */
		const channel = await interaction.guild.channels.fetch(rolesSettings?.channel);

		if (!channel) {
			interaction.log(`Roles channel "${rolesSettings?.channel}" not found`);

			if (!interaction.fake) {
				return await interaction.editReply({
					content: "Roles channel not found",
					flags: MessageFlags.Ephemeral
				});
			} else return false;
		}

		if (!channel.isTextBased()) {
			interaction.log(`Roles channel "${channel.name}" (${channel.id}) is not text-based`);

			if (!interaction.fake) {
				return await interaction.editReply({
					content: "Roles channel is not a text-based channel",
					flags: MessageFlags.Ephemeral
				});
			} else return false;
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
					/**
					 * @type {import("discord.js").Role}
					 */
					const guildRole = await interaction.guild.roles.fetch(role.id);

					if (guildRole) {
						interaction.log(`Role added: ${guildRole.name} (${guildRole.id})`);
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

		if (recurrentSettings?.active) {
			let content = `## Event Roles\n> These roles are only available during the event.`;
			const buttons = new ActionRowBuilder();

			for (const role of recurrentSettings?.roles ?? {}) {
				const year = new Date().getFullYear();

				const from = new Date(`${year}-${role.from}`);
				const to = new Date(`${year}-${role.to}`);

				if (Date.now() >= from.getTime() && Date.now() <= to.getTime()) {
					const name = `${role.name} ${year}`;
					interaction.log(`Recurrent role active: ${name}`);

					const guildRole = interaction.guild.roles.cache.find((r) => r.name === name);

					if (guildRole) {
						content += `\n- <@&${guildRole.id}> - Available until <t:${Math.floor(to.getTime() / 1000)}:f>`;

						const button = new ButtonBuilder();
						button.setCustomId(`addRole_${guildRole.id}_unlocked`);
						button.setLabel(name);
						button.setStyle(ButtonStyle.Secondary);

						buttons.addComponents(button);
					}
				}
			}

			if (buttons.length > 0) await channel.send({
				content,
				components: [buttons],
				flags: new MessageFlagsBitField().add("SuppressNotifications", "Crossposted")
			});
		}

		if (!interaction.fake) {
			await interaction.editReply({
				content: `Roles updated at <#${channel.id}>`,
				flags: MessageFlags.Ephemeral
			});
		}

		interaction.log("Roles updated");
	}
};