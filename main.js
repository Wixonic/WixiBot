const { ActivityType } = require("discord.js");

const components = require("./components.js");
const { client } = require("./clients.js");
const commands = require("./commands.js");
const log = require("./log.js");
const modals = require("./modals.js");

client.on("ready", async (client) => {
	log(`${client.user.username} online`);

	client.user.setPresence({
		activities: [
			{
				name: process.env.DEV == "true" ? "In training" : "/help",
				type: ActivityType.Custom
			}
		],
		status: process.env.DEV == "true" ? "dnd" : "online"
	});
});

client.on("interactionCreate", async (interaction) => {
	log(`Interaction "${interaction.id}" started by user "${interaction.user.username}" (${interaction.user.id}), in guild "${interaction.guild.name}" (${interaction.guild.id})`);

	interaction.log = (text) => log(`I-${interaction.id} - ${text}`);

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
					interaction.log(`Component "${componentName}" - ${componentArgs.length > component.args ? "Exceed" : "Missing"} arguments (${componentArgs.length}/${component.args})`);
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