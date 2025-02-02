const { client } = require("./clients.js");
const log = require("./log.js");
const loop = require("./loop.js");
const server = require("./server.js");
const trackers = require("./trackers.js");

client.on("ready", async (client) => {
	log(`${client.user.username} online`);

	client.setDefaultActivity();

	server.init();
	loop.init()
	trackers.init();
});