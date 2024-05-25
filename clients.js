const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");

const config = require("./config.js");


const client = new Client({
	intents: [
		GatewayIntentBits.Guilds
	]
});

client.login(config.token);


const rest = new REST({
	version: "10"
});

rest.setToken(config.token);


module.exports = {
	client,
	rest,
	Routes
}