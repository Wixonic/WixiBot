const { ActivityType } = require("discord.js");

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

client.on("interactionCreate", (interaction) => {
	log(`Interaction: "${interaction.id}" - Command "${interaction.commandName}" started`);

	for (const command of commands.list) {
		if (command.name == interaction.commandName) {
			command.execute(interaction);
			log(`Interaction: ${interaction.id} - Command "${interaction.commandName}" ended`);
			return;
		}
	}

	log(`Interaction: ${interaction.id} - Command "${interaction.commandName}" not found`);
});