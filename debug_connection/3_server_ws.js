const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3002 });

console.log('[Server] WebSocket listening on port 3002');

wss.on('connection', (ws) => {
	console.log('[Server] Client connected');

	ws.on('message', (message) => {
		console.log(`[Server] Received: ${message}`);
		ws.send(`Echo: ${message}`);
	});

	ws.on('close', () => {
		console.log('[Server] Client disconnected');
	});

	// Send a ping every 5 seconds
	setInterval(() => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
		}
	}, 5000);
});
