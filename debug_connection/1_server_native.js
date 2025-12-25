const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
	console.log(`[Server] Received request: ${req.method} ${req.url}`);
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('Hello from Server');
});

server.listen(PORT, () => {
	console.log(`[Server] Listening on port ${PORT}`);
});
