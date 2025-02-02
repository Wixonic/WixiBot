const fs = require("fs");
const path = require("path");

const { client } = require("./clients.js");
const log = require("./log.js");

const list = {};
for (const file of fs.readdirSync("./trackers").filter((file) => file.endsWith(".js"))) list[file.replace(".js", "")] = require(path.join(__dirname, "trackers", file));

const init = () => {
	for (const event of Object.keys(list)) {
		const eventLog = (any) => log(`E-${event}: ${any}`);
		eventLog.error = (any) => log.error(`E-${event}: ${any}`);

		client.on(event, (...args) => {
			try {
				list[event](eventLog, ...args);
			} catch (e) {
				log.error(`E-${event}: ${e}`);
			}
		});

		log(`[Trackers] Tracker for event ${event} initialized.`);
	}
};

module.exports = {
	init,
	list
};