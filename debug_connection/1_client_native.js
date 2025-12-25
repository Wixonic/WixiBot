const http = require('http');

const options = {
	hostname: 'localhost',
	port: 3000,
	path: '/',
	method: 'GET'
};

console.log('[Client] Sending request...');
const req = http.request(options, (res) => {
	console.log(`[Client] Status Code: ${res.statusCode}`);

	res.on('data', (d) => {
		console.log('[Client] Response data:', d.toString());
	});
});

req.on('error', (e) => {
	console.error(`[Client] Error: ${e.message}`);
});

req.end();
