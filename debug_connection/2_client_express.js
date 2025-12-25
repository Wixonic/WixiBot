const http = require('http');

const runTest = () => {
	// GET Request
	http.get('http://localhost:3001', (res) => {
		let data = '';
		res.on('data', chunk => data += chunk);
		res.on('end', () => console.log('[Client] GET Response:', data));
	}).on('error', err => console.error('[Client] GET Error:', err.message));

	// POST Request
	const postData = JSON.stringify({ test: 'value', id: 123 });
	const options = {
		hostname: 'localhost',
		port: 3001,
		path: '/data',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': postData.length
		}
	};

	const req = http.request(options, (res) => {
		let data = '';
		res.on('data', chunk => data += chunk);
		res.on('end', () => console.log('[Client] POST Response:', data));
	});

	req.on('error', err => console.error('[Client] POST Error:', err.message));
	req.write(postData);
	req.end();
};

runTest();
