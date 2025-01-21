const http = require("http");

const log = require("../log.js");

const discord = require("./client.js");

const config = require("../config.js");

let overlayData = {
	date: 0
};



const server = http.createServer((req, res) => {

});

server.listen(config.port.overlayServer, () => log(`Overlay server listening on :${config.port.overlayServer}`));