const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3002');

ws.on('open', () => {
	console.log('[Client] Connected to server');
	ws.send('Hello Server!');
});

ws.on('message', (data) => {
	console.log(`[Client] Received: ${data}`);
});

ws.on('error', (err) => {
	console.error(`[Client] Error: ${err.message}`);
});

ws.on('close', () => {
	console.log('[Client] Disconnected');
});
