# Connection Debugging

Use these scripts to test the connection latency and stability between your local machine and your remote server.

## 1. On the Remote Server (VPS)
Upload `6_server_stress.js` to your server and run it:
```bash
node 6_server_stress.js
```
*Make sure port 3006 is open (TCP).*

## 2. On your Local Machine (Client)
Run the client script, pointing it to your server's IP address:
```bash
node 6_client_stress.js http://YOUR_SERVER_IP:3006
```

## What happens?
The test runs for 30 minutes:
1.  **0-6 mins**: Baseline (Idle)
2.  **6-12 mins**: I/O Load (Simulates database/network activity - should NOT lag)
3.  **12-18 mins**: CPU Load (Simulates the bug - expect lag if server is small)
4.  **18-30 mins**: Cooldown

Results are saved to `client_results.csv`.
