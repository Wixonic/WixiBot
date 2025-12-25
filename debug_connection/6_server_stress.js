const http = require('http');

/*
 * STRESS TEST SERVER
 * ------------------
 * Run this on your remote server (VPS/Host).
 * It listens on port 3006 and simulates behavior when requested.
 * 
 * Usage: node 6_server_stress.js
 */

const PORT = 3006;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const server = http.createServer(async (req, res) => {
	// Basic CORS
	res.setHeader('Access-Control-Allow-Origin', '*');

	const url = new URL(req.url, `http://${req.headers.host}`);

	// 1. PING (Latency Check)
	if (url.pathname === '/ping') {
		res.writeHead(200);
		res.end('pong');
		return;
	}

	// 2. CPU LOAD (Simulates the blocking bug)
	if (url.pathname === '/heavy-cpu') {
		console.log(`[${new Date().toISOString()}] Triggering CPU Block (100ms)`);
		const start = Date.now();
		while (Date.now() - start < 100) { } // Busy wait
		res.writeHead(200);
		res.end('done');
		return;
	}

	// 3. I/O LOAD (Simulates network/db wait - Should be non-blocking)
	if (url.pathname === '/heavy-io') {
		console.log(`[${new Date().toISOString()}] Triggering I/O Wait (100ms)`);
		await sleep(100);
		res.writeHead(200);
		res.end('done');
		return;
	}

	res.writeHead(404);
	res.end();
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`[StressServer] Listening on 0.0.0.0:${PORT}`);
	console.log(`Ensure port ${PORT} is open in your firewall.`);
});
