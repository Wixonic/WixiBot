const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

app.get('/', (req, res) => {
	console.log('[Server] GET / received');
	res.json({ message: 'Hello from Express', status: 'ok' });
});

app.post('/data', (req, res) => {
	console.log('[Server] POST /data received', req.body);
	res.json({ received: req.body, timestamp: Date.now() });
});

app.listen(PORT, () => {
	console.log(`[Server] Express listening on port ${PORT}`);
});
