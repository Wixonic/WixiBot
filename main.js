const { ActivityType } = require("discord.js");

const buttons = require("./buttons.js");
const { client } = require("./clients.js");
const commands = require("./commands.js");
const log = require("./log.js");

client.on("ready", async (client) => {
	log(`${client.user.username} online`);

	client.user.setPresence({
		activities: [
			{
				name: "In training",
				type: ActivityType.Custom
			}
		],
		status: "dnd"
	});
});

client.on("interactionCreate", async (interaction) => {
	log(`Interaction "${interaction.id}" started by user "${interaction.user.username}" (${interaction.user.id}), in guild "${interaction.guild.name}" (${interaction.guild.id})`);

	interaction.log = (text) => log(`I-${interaction.id} - ${text}`);

	if (interaction.isButton()) {
		const buttonArgs = interaction.customId.split("_");
		const buttonName = buttonArgs.shift();

		for (const button of buttons.list) {
			if (button.name == buttonName) {
				if (button.args == buttonArgs.length) {
					interaction.log(`Button "${buttonName}" started`);
					await button.execute(interaction, buttonArgs);
					interaction.log(`Button "${buttonName}" ended`);
				} else {
					interaction.log(`Button "${buttonName}" - ${buttonArgs.length > button.args ? "Exceed" : "Missing"} arguments (${buttonArgs.length}/${button.args})`);
					return await interaction.reply({
						content: "This interaction is not available.",
						ephemeral: true
					});
				}
			} else {
				interaction.log(`Button "${buttonName}" not found`);
				return await interaction.reply({
					content: "This interaction is not available.",
					ephemeral: true
				});
			}
		}
	} else if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand() || interaction.isUserContextMenuCommand()) {
		let found = false;
		for (const command of commands.list) {
			if (command.name == interaction.commandName) {
				interaction.log(`Command "${interaction.commandName}" started`);
				await command.execute(interaction);
				interaction.log(`Command "${interaction.commandName}" ended`);
				found = true;
				break;
			}
		}

		if (!found) {
			interaction.log(`Command "${interaction.commandName}" not found`);
			return await interaction.reply({
				content: "This interaction is not available.",
				ephemeral: true
			});
		}
	}

	log(`Interaction "${interaction.id}" ended`);
});