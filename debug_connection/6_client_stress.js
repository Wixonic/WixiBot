const http = require('http');
const fs = require('fs');
const path = require('path');

/*
 * STRESS TEST CLIENT
 * ------------------
 * Run this on your local machine.
 * Usage: node 6_client_stress.js [TARGET_URL]
 * Example: node 6_client_stress.js http://my-vps-ip:3006
 */

// CONFIG
const DEFAULT_URL = 'http://localhost:3006';
const TARGET_URL = process.argv[2] || DEFAULT_URL;

const DURATION_MINUTES = 30; // Run for 30 minutes
const DELAY_BETWEEN_TESTS = 100; // ms
const ITERATIONS = (DURATION_MINUTES * 60 * 1000) / DELAY_BETWEEN_TESTS;

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].slice(0, -1)}] ${msg}`);

// --- CLIENT LOGIC ---

const ping = () => new Promise((resolve) => {
	const start = Date.now();
	const req = http.request(`${TARGET_URL}/ping`, {
		method: 'GET',
		agent: new http.Agent({ keepAlive: true })
	}, (res) => {
		res.on('data', () => { });
		res.on('end', () => resolve({ success: true, latency: Date.now() - start }));
	});

	// Set a timeout to avoid hanging forever on dropped packets
	req.on('socket', (socket) => {
		socket.setTimeout(2000);
		socket.on('timeout', () => {
			req.destroy();
			resolve({ success: false, latency: 2000, error: 'Timeout' });
		});
	});

	req.on('error', (e) => resolve({ success: false, latency: Date.now() - start, error: e.message }));
	req.end();
});

const triggerLoad = (type) => {
	const endpoint = type === 'CPU' ? '/heavy-cpu' : '/heavy-io';
	const req = http.request(`${TARGET_URL}${endpoint}`, { method: 'GET' });
	req.on('error', () => { }); // Fire and forget
	req.end();
};

const run = async () => {
	log(`Target: ${TARGET_URL}`);
	log(`Duration: ${DURATION_MINUTES} mins (~${Math.floor(ITERATIONS)} requests)`);

	// Prepare CSV
	const resultsPath = path.join(__dirname, 'client_results.csv');
	let csvContent = 'Iteration,Phase,Latency(ms),Status,LoadTriggered\n';

	log(`Results file: ${resultsPath}`);

	for (let i = 0; i < ITERATIONS; i++) {
		let phase = 'Baseline';
		let loadTriggered = 'None';
		const progress = i / ITERATIONS;

		// --- PHASES ---
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

		// --- TEST ---
		const res = await ping();

		// --- LOGGING ---
		const row = `${i + 1},${phase},${res.latency},${res.success ? 'OK' : 'FAIL'},${loadTriggered}`;
		csvContent += row + '\n';

		// Log sparingly
		if (i % Math.floor(ITERATIONS / 100) === 0 || res.latency > 150) {
			let status = `[${Math.floor(progress * 100)}%] Iter ${i + 1} [${phase}] Latency: ${res.latency}ms`;
			if (res.latency > 150) status += ' [SLOW/LAG]';
			if (!res.success) status += ` [ERROR: ${res.error}]`;
			log(status);
		}

		await sleep(DELAY_BETWEEN_TESTS);
	}

	fs.writeFileSync(resultsPath, csvContent);
	log('------------------------------------------------');
	log('Test Complete.');
	log(`Saved to ${resultsPath}`);
};

run();
