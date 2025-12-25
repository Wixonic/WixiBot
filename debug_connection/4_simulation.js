const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3003;
let loopCount = 0;

// Middleware
app.use((req, res, next) => {
	console.log(`[HTTP] ${req.method} ${req.url}`);
	next();
});

app.get('/', (req, res) => {
	res.send('Server is running');
});

// WebSocket
wss.on('connection', (ws) => {
	console.log('[WS] Client connected');
	ws.on('message', msg => console.log(`[WS] Msg: ${msg}`));
});

server.listen(PORT, () => {
	console.log(`[Server] Full Simulation running on port ${PORT}`);
	startBackgoundLoops();
});

// SIMULATION OF THE ISSUE
// We create multiple "loops" to simulate the bot's handlers.

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulated heavy task (blocking simulation if synchronous, or just slow async)
const simulateHeavyWork = (name, duration) => {
	// UNCOMMENT NEXT LINE TO SIMULATE BLOCKING CPU WORK
	// const end = Date.now() + duration; while(Date.now() < end) {} 

	// Non-blocking wait
	return new Promise(resolve => setTimeout(resolve, duration));
};

const loopHandlers = {
	'fast_loop': { delay: 500, process: async () => simulateHeavyWork('fast', 50) },
	'slow_loop': { delay: 1000, process: async () => simulateHeavyWork('slow', 200) },
	'random_hang': {
		delay: 2000, process: async () => {
			// Randomly "hang" like a timeout
			if (Math.random() < 0.2) {
				console.log('[Loop] Random Hang Triggered (2s)');
				await sleep(2000);
			}
			return true;
		}
	}
};

// DECOUPLED LOOP IMPLEMENTATION (The Fix)
const startLoop = (name) => {
	const loop = loopHandlers[name];

	const run = async () => {
		const start = Date.now();
		// console.log(`[Loop:${name}] Starting...`);

		await loop.process();

		loopCount++;
		const elapsed = Date.now() - start;
		const nextDelay = Math.max(10, loop.delay - elapsed);

		// console.log(`[Loop:${name}] Done in ${elapsed}ms, next in ${nextDelay}ms`);
		setTimeout(run, nextDelay);
	};
	run();
};

const startBackgoundLoops = () => {
	console.log('[System] Starting detached loops...');
	for (const name in loopHandlers) {
		startLoop(name);
	}
};

// Log stats every 5s
setInterval(() => {
	console.log(`[Stats] Loops completed in last 5s interval: ${loopCount} (Approx)`);
	loopCount = 0;
}, 5000);
