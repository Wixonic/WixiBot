const { MessageFlags, MessageType } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { getRank } = require("./lib/ranks.js");

const components = require("./components.js");
const { client, getChannel, getGuild } = require("./clients.js");
const commands = require("./commands.js");
const log = require("./log.js");
const modals = require("./modals.js");
const server = require("./server.js");
const { hexToIntColor } = require("./utils.js");

const config = require("./config.js");
const settings = require("./settings.js");

server.init();


client.on("ready", async (client) => {
	log(`${client.user.username} online`);

	client.setDefaultActivity();
});

client.on("interactionCreate", async (interaction) => {
	log(`Interaction "${interaction.id}" started by user "${interaction.user.username}" (${interaction.user.id})` + (interaction.inGuild() ? `, in guild "${interaction.guild.name}" (${interaction.guild.id})` : ", outside of a guild"));

	interaction.log = (text) => log(`I - ${interaction.id} - ${text}`);
	interaction.error = (text) => log.error(`I - ${interaction.id} - ${text}`);

	if (interaction.isMessageComponent()) {
		let found = false;

		const componentArgs = interaction.customId.split("_");
		const componentName = componentArgs.shift();

		for (const component of components.list) {
			if (component.name == componentName) {
				if (component.args == componentArgs.length) {
					interaction.log(`Component "${componentName}" started${componentArgs.length > 0 ? ` using arguments ${componentArgs.join(", ")}` : ""}`);
					await component.execute(interaction, componentArgs);
					interaction.log(`Component "${componentName}" ended`);
				} else {
					interaction.error(`Component "${componentName}" - ${componentArgs.length > component.args ? "Exceed" : "Missing"} arguments(${componentArgs.length} / ${component.args})`);
					await interaction.reply({
						content: "This interaction is not available.",
						flags: MessageFlags.Ephemeral
					});
				}

				found = true;
				break;
			}
		}

		if (!found) {
			interaction.error(`Component "${componentName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	} else if (interaction.isModalSubmit()) {
		let found = false;

		const modalName = interaction.customId;

		for (const modal of modals.list) {
			if (modal.name == modalName) {
				interaction.log(`Modal "${modalName}" started`);
				await modal.execute(interaction);
				interaction.log(`Modal "${modalName}" ended`);
				found = true;
				break;
			}
		}

		if (!found) {
			interaction.error(`Modal "${modalName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	} else if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
		let found = false;

		const commandName = interaction.commandName;

		for (const command of commands.list) {
			if (command.name == commandName && command.type == interaction.commandType) {
				interaction.log(`Command "${commandName}" started`);
				await command.execute(interaction);
				interaction.log(`Command "${commandName}" ended`);
				found = true;
				break;
			}
		}

		if (!found) {
			interaction.error(`Command "${commandName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				flags: MessageFlags.Ephemeral
			});
		}
	}

	log(`Interaction "${interaction.id}" ended`);
});

client.on("messageCreate", async (message) => {
	log(`Message "${message.id}" sent by user "${message.author.username}" (${message.author.id})` + (message.inGuild() ? `, in guild "${message.guild.name}" (${message.guild.id}), in channel "${message.channel.name}" (${message.channel.id})` : ", outside of a guild"));

	if (!message.author.bot && message.inGuild() && [MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage].includes(message.type)) {
		const rank = await getRank(message.guild.id, message.author.id);
		await rank.addMessage();
	}
});

client.on("voiceStateUpdate", async (oldState, newState) => {
	if (!oldState.channel && newState.channel) {
		log(`User "${newState.member.user.username}" (${newState.member.user.id}) joined channel "${newState.channel.name}" (${newState.channel.id}), in guild "${newState.guild.name}" (${newState.guild.id})`);

		if (!newState.member.user.bot) {
			const rank = await getRank(newState.guild.id, newState.member.id);
			await rank.joinVoice();
		}
	} else if (oldState.channel && !newState.channel) {
		log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) left channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

		if (!oldState.member.user.bot) {
			const rank = await getRank(oldState.guild.id, oldState.member.id);
			await rank.leaveVoice();

			if (rank.voice.stream.startedAt) {
				log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) stopped streaming in channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

				await rank.stoppedStreaming();
			}
		}
	}

	if (newState.channel && !oldState.streaming && newState.streaming) {
		log(`User "${newState.member.user.username}" (${newState.member.user.id}) started streaming in channel "${newState.channel.name}" (${newState.channel.id}), in guild "${newState.guild.name}" (${newState.guild.id})`);

		if (!newState.member.user.bot) {
			const rank = await getRank(newState.guild.id, newState.member.id);
			await rank.startedStreaming();
		}
	} else if (oldState.channel && oldState.streaming && !newState.streaming) {
		log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) stopped streaming in channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

		if (!oldState.member.user.bot) {
			const rank = await getRank(oldState.guild.id, oldState.member.id);
			await rank.stoppedStreaming();
		}
	}
});


const displayRoles = require("./commands/roles.js").execute;
const recurrentRolesFile = path.join(config.cache.server, "recurrentRoles.json");
const recurrentCycle = async () => {
	const cycleLog = (any) => log(`C-${recurrentCycle.id}: ${any}`);
	const cycleError = (any) => log.error(`C-${recurrentCycle.id}: ${any}`);

	try {
		for (const guildId in settings.guilds) {
			const guildSettings = settings.guilds[guildId];
			const rolesSettings = guildSettings?.roles;
			const recurrentSettings = rolesSettings?.recurrentRoles;

			const guild = await getGuild(guildId);

			if (guild && guildSettings?.roles?.active && guildSettings?.roles?.recurrentRoles?.active) {
				const year = new Date().getFullYear();

				/**
				 * @typedef {{name: string, from: string, to: string, color: string, id: string?}} ReccurentRole
				 */

				/**
				 * @typedef {ReccurentRole[]} RecurrentRolesList
				 */

				/** @type {RecurrentRolesList} */
				const currentRecurrentRoles = [];
				/** @type {RecurrentRolesList} */
				const previousRecurrentRoles = fs.existsSync(recurrentRolesFile) ? JSON.parse(fs.readFileSync(recurrentRolesFile, "utf-8")) : [];

				/**
				 * @param {ReccurentRole} role
				 * @param {RecurrentRolesList} list
				 */
				const isIncluded = (role, list) => {
					for (const item of list) {
						if (item.name == role.name) return true;
					}

					return false
				};

				for (const role of guildSettings.roles.recurrentRoles.roles ?? []) {
					const from = new Date(`${year}-${role.from}`);
					const to = new Date(`${year}-${role.to}`);

					const active = Date.now() >= from.getTime() && Date.now() <= to.getTime();

					if (active) currentRecurrentRoles.push(role);
				}

				const newRoles = [];
				const oldRoles = [];

				for (const newRole of currentRecurrentRoles) {
					if (!isIncluded(newRole, previousRecurrentRoles)) {
						const name = `${newRole.name} ${year}`;

						const cosmeticMarkerRole = await guild.roles.fetch(recurrentSettings?.cosmeticMarkerRole);
						const guildRole = await guild.roles.create({
							color: hexToIntColor(newRole.color),
							name,
							position: cosmeticMarkerRole.position
						});
						newRole.id = guildRole.id;
						newRoles.push(newRole);
					}
				}

				for (const oldRole of previousRecurrentRoles) {
					if (!isIncluded(oldRole, currentRecurrentRoles)) {
						oldRoles.push(oldRole);
						const name = `${oldRole.name} ${year}`;

						const oldMarkerRole = await guild.roles.fetch(recurrentSettings?.oldMarkerRole);
						const role = guild.roles.cache.find((r) => r.name == name);
						guild.roles.edit(role, {
							position: oldMarkerRole.position
						});
					}
				}

				if (newRoles.length > 0) {
					const announcementChannel = await getChannel(recurrentSettings?.announcementChannel);

					if (announcementChannel) {
						for (const newRole of newRoles) {
							const to = new Date(`${year}-${newRole.to}`);
							await announcementChannel.send({
								content: `Claim your <@&${newRole.id}> role now at <#${rolesSettings.channel}>!\nThis role will be available until <t:${Math.floor(to.getTime() / 1000)}:f>.${recurrentSettings?.mentionRole ? `\n<@&${recurrentSettings.mentionRole}>` : ""}`
							});
							cycleLog(`Announcing role ${newRole.name} ${year}`);
						}
					}
				}

				if (newRoles.length > 0 || oldRoles.length > 0) {
					cycleLog("Updating recurrent roles...");
					await displayRoles(cycleLog, guildId);
					fs.writeFileSync(recurrentRolesFile, JSON.stringify(currentRecurrentRoles), "utf-8");
				}
			}
		}
	} catch (e) {
		cycleError(e);
	}

	setTimeout(recurrentCycle, 60000 - (Date.now() % 60000));
	recurrentCycle.id++;
};
recurrentCycle.id = 0;
recurrentCycle();