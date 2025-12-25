const http = require('http');
const fs = require('fs');
const path = require('path');

/*
 * LONG TERM STRESS TEST
 * ---------------------
 * Runs 1000 iterations of connectivity tests.
 * Simulates different load conditions to demonstrate how they affect latency.
 * Results are saved to 'test_results.csv'.
 * 
 * Phases:
 * 1. Warmup / Baseline (0-200)
 * 2. Async I/O Load (200-400) - Should allow pings to pass freely.
 * 3. CPU Blocking Load (400-600) - Should cause huge ping spikes.
 * 4. Cooldown (600-1000)
 */

const PORT = 3006;
const DURATION_MINUTES = 30;
const DELAY_BETWEEN_TESTS = 100; // Increased to 100ms to keep log size reasonable (approx 18k requests)
const ITERATIONS = (DURATION_MINUTES * 60 * 1000) / DELAY_BETWEEN_TESTS;

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].slice(0, -1)}] ${msg}`);

// --- SERVER ---
const setupServer = () => new Promise((resolve) => {
	const server = http.createServer(async (req, res) => {
		const url = new URL(req.url, `http://${req.headers.host}`);

		if (url.pathname === '/ping') {
			res.writeHead(200);
			res.end('pong');
			return;
		}
		if (url.pathname === '/heavy-cpu') {
			// Simulate blocking
			const start = Date.now();
			while (Date.now() - start < 100) { } // 100ms block
			res.writeHead(200);
			res.end('done');
			return;
		}
		if (url.pathname === '/heavy-io') {
			// Simulate network/db wait
			await sleep(100);
			res.writeHead(200);
			res.end('done');
			return;
		}
		res.writeHead(404);
		res.end();
	});

	server.listen(PORT, () => resolve(server));
});

// --- CLIENT ---
const ping = () => new Promise((resolve) => {
	const start = Date.now();
	const req = http.request({
		hostname: 'localhost',
		port: PORT,
		path: '/ping',
		method: 'GET',
		agent: new http.Agent({ keepAlive: true })
	}, (res) => {
		res.on('data', () => { });
		res.on('end', () => resolve({ success: true, latency: Date.now() - start }));
	});
	req.on('error', (e) => resolve({ success: false, latency: Date.now() - start, error: e.message }));
	req.end();
});

const triggerLoad = (type) => {
	// Fire and forget - we just want to load the server
	const path = type === 'CPU' ? '/heavy-cpu' : '/heavy-io';
	const req = http.request({
		hostname: 'localhost',
		port: PORT,
		path: path,
		method: 'GET'
	});
	req.on('error', () => { });
	req.end();
};

const run = async () => {
	const server = await setupServer();
	const results = [];
	const resultsPath = path.join(__dirname, 'test_results.csv');

	// Header
	let csvContent = 'Iteration,Phase,Latency(ms),Status,LoadTriggered\n';

	log(`Starting ${DURATION_MINUTES} minutes stress test (approx ${ITERATIONS} iterations) on port ${PORT}...`);
	log(`Results will be saved to: ${resultsPath}`);

	for (let i = 0; i < ITERATIONS; i++) {
		let phase = 'Baseline';
		let loadTriggered = 'None';

		// DYNAMIC PHASES (Based on % of total progress)
		const progress = i / ITERATIONS;

		if (progress >= 0.2 && progress < 0.4) {
			phase = 'Async_IO_Load';
			if (Math.random() > 0.5) {
				triggerLoad('IO');
				loadTriggered = 'AsyncIO';
			}
		} else if (progress >= 0.4 && progress < 0.6) {
			phase = 'CPU_Blocking_Load';
			if (Math.random() > 0.5) {
				triggerLoad('CPU');
				loadTriggered = 'CPU';
			}
		} else if (progress >= 0.6) {
			phase = 'Cooldown';
		}

		// MEASURE
		const res = await ping();

		// RECORD
		const row = `${i + 1},${phase},${res.latency},${res.success ? 'OK' : 'FAIL'},${loadTriggered}`;
		csvContent += row + '\n';
		results.push(res.latency);

		// LOGGING (Reduced to avoid spam, show every 1% progress or if slow)
		if (i % Math.floor(ITERATIONS / 100) === 0 || res.latency > 100) {
			let status = `[${Math.floor(progress * 100)}%] Iter ${i + 1}/${ITERATIONS} [${phase}] Latency: ${res.latency}ms`;
			if (res.latency > 100) status += ' [SLOW]';
			log(status);
		}

		await sleep(DELAY_BETWEEN_TESTS);
	}

	// SAVE
	fs.writeFileSync(resultsPath, csvContent);

	// STATS
	const avg = results.reduce((a, b) => a + b, 0) / results.length;
	const max = Math.max(...results);
	log('------------------------------------------------');
	log(`Test Complete.`);
	log(`Total Requests: ${ITERATIONS}`);
	log(`Average Latency: ${avg.toFixed(2)}ms`);
	log(`Max Latency: ${max}ms`);
	log(`Results saved to ${resultsPath}`);

	server.close();
	process.exit(0);
};

run();
