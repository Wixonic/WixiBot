const { rest, Routes } = require("./clients.js");
const commands = require("./commands.js");
const log = require("./log.js");

const config = require("./config.js");
const settings = require("./settings.js");

const requests = [];
for (const guildId in settings.guilds) {
	const guildSettings = settings.guilds[guildId] ?? {};
	const guildCommands = [];
	commands.list.filter((command) => guildSettings.allowedCommands.includes(command.name)).forEach((command) => guildCommands.push(command.data.toJSON()));

	log(`Started refreshing ${guildCommands.length} slash command${guildCommands.length > 1 ? "s" : ""}.`);

	const request = rest.put(Routes.applicationGuildCommands(config.clientId, guildId), {
		body: guildCommands
	});
	requests.push(request);
	request.then((data) => log(`Successfully reloaded ${data.length} slash command${data.length > 1 ? "s" : ""} for ${guildId}.`)).catch((reason) => log(`Failed to refresh slash command${guildCommands.length > 1 ? "s" : ""} for ${guildId}: ${reason}.`));
}
Promise.all(requests).finally(() => process.exit(0));