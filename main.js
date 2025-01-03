const components = require("./components.js");
const { client } = require("./clients.js");
const commands = require("./commands.js");
const log = require("./log.js");
const modals = require("./modals.js");
const server = require("./server.js");
const { hexToIntColor } = require("./utils.js");

const settings = require("./settings.js");

server.init();

client.on("ready", async (client) => {
	log(`${client.user.username} online`);

	client.setDefaultActivity();
});

client.on("interactionCreate", async (interaction) => {
	log(`Interaction "${interaction.id}" started by user "${interaction.user.username}" (${interaction.user.id})` + (interaction.inGuild() ? `, in guild "${interaction.guild.name}"(${interaction.guild.id})` : ", outside of a guild"));

	interaction.log = (text) => log(`I - ${interaction.id} - ${text}`);

	if (interaction.isMessageComponent()) {
		let found = false;

		const componentArgs = interaction.customId.split("_");
		const componentName = componentArgs.shift();

		for (const component of components.list) {
			if (component.name == componentName) {
				if (component.args == componentArgs.length) {
					interaction.log(`Component "${componentName}" started`);
					await component.execute(interaction, componentArgs);
					interaction.log(`Component "${componentName}" ended`);
				} else {
					interaction.log(`Component "${componentName}" - ${componentArgs.length > component.args ? "Exceed" : "Missing"} arguments(${componentArgs.length} / ${component.args})`);
					await interaction.reply({
						content: "This interaction is not available.",
						ephemeral: true
					});
				}

				found = true;
				break;
			}
		}

		if (!found) {
			interaction.log(`Component "${componentName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
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
			interaction.log(`Modal "${modalName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
			});
		}
	} else if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
		let found = false;

		const commandName = interaction.commandName;

		for (const command of commands.list) {
			if (command.name == commandName) {
				interaction.log(`Command "${commandName}" started`);
				await command.execute(interaction);
				interaction.log(`Command "${commandName}" ended`);
				found = true;
				break;
			}
		}

		if (!found) {
			interaction.log(`Command "${commandName}" not found`);
			await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
			});
		}
	}

	log(`Interaction "${interaction.id}" ended`);
});

const displayRoles = require("./commands/roles.js").execute;
let previousRecurrentRoles = [];

const recurrentCycle = async () => {
	const cycleLog = (any) => log(`C-${recurrentCycle.id}: ${any}`);

	for (const guildId in settings.guilds) {
		const guildSettings = settings.guilds[guildId];
		const rolesSettings = guildSettings?.roles;
		const recurrentSettings = rolesSettings?.recurrentRoles;

		const guild = await client.guilds.fetch(guildId);

		if (guildSettings?.roles?.active && guildSettings?.roles?.recurrentRoles?.active) {
			const year = new Date().getFullYear();
			const currentRecurrentRoles = [];

			for (const role of guildSettings.roles.recurrentRoles.roles ?? []) {
				const from = new Date(`${year}-${role.from}`);
				const to = new Date(`${year}-${role.to}`);

				const active = Date.now() >= from.getTime() && Date.now() <= to.getTime();

				if (active) currentRecurrentRoles.push(role);
			}

			const newRoles = [];
			const oldRoles = [];

			for (const newRole of currentRecurrentRoles) {
				if (!previousRecurrentRoles.includes(newRole)) {
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
				if (!currentRecurrentRoles.includes(oldRole)) {
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
				const announcementChannel = await guild.channels.fetch(recurrentSettings?.announcementChannel);

				for (const newRole of newRoles) {
					const to = new Date(`${year}-${newRole.to}`);
					await announcementChannel.send({
						content: `Claim your <@&${newRole.id}> role now at <#${rolesSettings.channel}>!\nThis role will be available until <t:${Math.floor(to.getTime() / 1000)}:f>.\n<@&1307298359651991583>`
					});
					cycleLog(`Announcing role ${newRole.name} ${year}`);
				}
			}

			if (newRoles.length > 0 || oldRoles.length > 0) {
				cycleLog("Updating recurrent roles...");
				await displayRoles(cycleLog, guildId);
				previousRecurrentRoles = currentRecurrentRoles;
			}
		}
	}

	setTimeout(recurrentCycle, 60000 - (Date.now() % 60000));
	recurrentCycle.id++;
};

recurrentCycle.id = 0;
recurrentCycle();