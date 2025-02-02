const fs = require("fs");
const path = require("path");

const log = require("./log.js");

const list = [];
for (const file of fs.readdirSync("./loop").filter((file) => file.endsWith(".js"))) list.push(require(path.join(__dirname, "loop", file)));

const loop = async () => {
	for (const el of list) {
		try {
			await el(loop);
		} catch (e) {
			loop.error(e);
		}
	}

	setTimeout(loop, 60000 - (Date.now() % 60000));
	loop.id++;
};
loop.id = 0;
loop.log = (any) => log(`C-${loop.id}: ${any}`);
loop.error = (any) => log.error(`C-${loop.id}: ${any}`);

const init = () => loop();

module.exports = {
	init
};