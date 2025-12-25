const http = require('http');
const WebSocket = require('ws');
/*
 * FULL DIAGNOSTIC TEST
 * --------------------
 * This script starts a local HTTP + WebSocket server and runs a series of automated tests 
 * against it to diagnose network latency, async blocking, and CPU blocking behavior.
 * 
 * Usage: node debug_connection/full_diagnostic.js
 */

const PORT = 3005;

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (tag, msg) => console.log(`[${new Date().toISOString().split('T')[1].slice(0, -1)}] [${tag}] ${msg}`);
const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;

// --- SERVER IMPLEMENTATION ---
const setupServer = () => new Promise((resolve) => {
	const server = http.createServer(async (req, res) => {
		// CORS
		res.setHeader('Access-Control-Allow-Origin', '*');

		const url = new URL(req.url, `http://${req.headers.host}`);

		if (url.pathname === '/ping') {
			res.writeHead(200);
			res.end('pong');
			return;
		}

		if (url.pathname === '/delay-async') {
			// Simulate slow I/O (Database, Network) - Should NOT block other requests
			const ms = parseInt(url.searchParams.get('ms') || '1000');
			await sleep(ms);
			res.writeHead(200);
			res.end('done');
			return;
		}

		if (url.pathname === '/delay-cpu') {
			// Simulate heavy calculation - SHOULD block other requests
			const ms = parseInt(url.searchParams.get('ms') || '1000');
			const start = Date.now();
			while (Date.now() - start < ms) { } // Busy wait
			res.writeHead(200);
			res.end('done');
			return;
		}

		res.writeHead(404);
		res.end();
	});

	const wss = new WebSocket.Server({ server });
	wss.on('connection', (ws) => {
		ws.on('message', (msg) => ws.send(msg)); // Echo
	});

	server.listen(PORT, () => {
		log('SERVER', `Listening on port ${PORT}`);
		resolve({ server, wss });
	});
});

// --- CLIENT TESTS ---

const httpRequest = (path) => new Promise((resolve, reject) => {
	const start = Date.now();
	const req = http.request({
		hostname: 'localhost',
		port: PORT,
		path: path,
		method: 'GET',
		headers: { 'Connection': 'keep-alive' } // Reuse connection
	}, (res) => {
		res.on('data', () => { });
		res.on('end', () => resolve(Date.now() - start));
	});
	req.on('error', reject);
	req.end();
});

const runDiagnostics = async () => {
	log('TEST', 'Starting Full Diagnostics...');

	// 1. BASELINE LATENCY
	log('TEST', '--- Phase 1: Baseline Http Latency (10 samples) ---');
	const samples = [];
	for (let i = 0; i < 10; i++) {
		samples.push(await httpRequest('/ping'));
	}
	const avgLatency = average(samples);
	log('TEST', `Avg Latency: ${avgLatency.toFixed(2)}ms`);
	if (avgLatency > 50) log('WARN', 'High local latency detected!');

	// 2. WEB SOCKET SOCKET STABILITY
	log('TEST', '--- Phase 2: WebSocket Stability ---');
	const ws = new WebSocket(`ws://localhost:${PORT}`);
	await new Promise(r => ws.on('open', r));

	let echoed = 0;
	ws.on('message', () => echoed++);

	// Send 50 messages rapidly
	const startWs = Date.now();
	for (let i = 0; i < 50; i++) ws.send('ping');

	// Wait for all echoes
	while (echoed < 50) {
		if (Date.now() - startWs > 2000) {
			log('FAIL', 'WebSocket timeout: dropped packets?');
			break;
		}
		await sleep(10);
	}
	log('TEST', `WebSocket: Received ${echoed}/50 echos in ${Date.now() - startWs}ms`);
	ws.terminate();

	// 3. ASYNC BLOCKING TEST
	log('TEST', '--- Phase 3: Async "Delay" Test ---');
	log('INFO', 'Sending Request A (2000ms async delay) and Request B (Ping) concurrently.');
	log('INFO', 'Expectation: Request B should finish almost immediately, NOT waiting for A.');

	const startAsync = Date.now();
	const p1 = httpRequest('/delay-async?ms=2000').then(t => ({ name: 'Slow', time: t }));
	// Wait 100ms to ensure p1 reaches server first
	await sleep(200);
	const p2 = httpRequest('/ping').then(t => ({ name: 'Ping', time: t }));

	const resultsAsync = await Promise.all([p1, p2]);
	const pingTimeAsync = resultsAsync.find(r => r.name === 'Ping').time;

	log('TEST', `Results: SlowReq=${resultsAsync.find(r => r.name === 'Slow').time}ms, PingReq=${pingTimeAsync}ms`);

	if (pingTimeAsync < 500) {
		log('PASS', 'Server handled requests in parallel (Non-blocking I/O working).');
	} else {
		log('FAIL', 'Server blocked! Ping took too long.');
	}

	// 4. CPU BLOCKING TEST
	log('TEST', '--- Phase 4: CPU "Blocking" Test ---');
	log('INFO', 'Sending Request A (2000ms CPU busy-wait) and Request B (Ping) concurrently.');
	log('INFO', 'Expectation: Request B WILL be blocked until A finishes (Node.js single thread).');

	const startCpu = Date.now();
	// Fire the blocking request
	const p3 = httpRequest('/delay-cpu?ms=2000').then(t => ({ name: 'Block', time: t }));
	await sleep(200); // Ensure it hits server and starts blocking
	// Try to ping while server is crunching numbers
	const p4 = httpRequest('/ping').then(t => ({ name: 'Ping', time: t }));

	const resultsCpu = await Promise.all([p3, p4]);
	const pingTimeCpu = resultsCpu.find(r => r.name === 'Ping').time;

	log('TEST', `Results: BlockReq=${resultsCpu.find(r => r.name === 'Block').time}ms, PingReq=${pingTimeCpu}ms`);

	if (pingTimeCpu > 1500) {
		log('INFO', 'Confirmed: Heavy CPU usage blocked the Ping request (Expected behavior).');
	} else {
		log('WARN', 'Unexpected: Ping finished fast? (Did simulation fail?)');
	}

	log('TEST', '--- Diagnostics Complete ---');
	process.exit(0);
};

// Start
setupServer().then(runDiagnostics);
