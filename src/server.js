const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");
const ws = require("ws");

class Server {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("./types.d.ts").ServerSecretsSettings | import("./types.d.ts").MainSettings} config
	 */
	constructor(logger, config) {
		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug("[Server]", ...any),
			error: (...any) => logger.error("[Server]", ...any),
			info: (...any) => logger.info("[Server]", ...any),
			warn: (...any) => logger.warn("[Server]", ...any)
		};

		if (!fs.existsSync(config.cert) || !fs.existsSync(config.key)) throw new Error("SSL certificate or key are missing.");

		this.app = express();

		this.http = https.createServer({
			cert: fs.readFileSync(config.cert),
			key: fs.readFileSync(config.key)
		});

		this.ws = new ws.Server({
			noServer: true
		});

		this.port = config.port;
	};

	/**
	 * @returns {Promise<void>}
	 */
	init() {
		const websitePath = path.join(__dirname, "website");

		return new Promise((resolve) => {
			this.app.use((req, res, next) => {
				this.logger.debug(`Request: ${req.method} ${req.url}`);
				next();
			});

			this.app.use(express.static(websitePath));

			this.app.use((req, res) => {
				this.logger.warn(`404: ${req.method} ${req.url}`);
				res.status(404).sendFile(path.join(websitePath, "404.html"));
			});


			this.http.on("clientError", (e) => this.logger.warn("[HTTP]", "Client error:", e));
			this.http.on("close", () => this.logger.warn("[HTTP]", "Server closed"));
			this.http.on("error", (e) => this.logger.error("[HTTP]", "Server error:", e));
			this.http.on("connection", () => this.logger.debug("[HTTP]", "TCP stream established"));
			this.http.on("request", this.app);

			this.http.on("upgrade", (req, socket, head) => {
				this.logger.debug("Upgrading to WebSocket");
				this.ws.handleUpgrade(req, socket, head, (ws) => this.ws.emit("connection", ws, req));
			});


			this.ws.on("close", () => this.logger.warn("[WebSocket]", "Server closed"));

			this.ws.on("connection", (ws) => {
				this.logger.debug("[WebSocket]", "Connection open")

				ws.on("close", () => this.logger.debug("[WebSocket]", "Connection closed"));
				ws.on("error", (e) => this.logger.warn("[WebSocket]", "Client error:", e));
				ws.once("message", (data) => this.logger.debug("[WebSocket]", "Message received:", data.toString("hex")));
				ws.on("ping", () => this.logger.debug("[WebSocket]", "Connection ping-ed"));
				ws.on("pong", () => this.logger.debug("[WebSocket]", "Connection pong-ed"));
				ws.on("unexpected-response", () => this.logger.debug("[WebSocket]", "Unexpected reponse"));
				ws.on("upgrade", () => this.logger.debug("[WebSocket]", "Connection upgraded"));
			});

			this.ws.on("error", (e) => this.logger.error("[WebSocket]", "Server error:", e));


			this.http.listen(this.port, () => {
				this.logger.info(`Running on :${this.port}`);
				resolve();
			});
		});
	};

	destroy() {
		return new Promise((resolve) => {
			for (const ws of this.ws.clients) ws.close(0x3E9); // Going away

			if (this.http.listening) {
				this.http.close((e) => {
					if (e) this.logger.error("Failed to close server:", e);
					resolve();
				});
			} else resolve();
		});
	};
};

module.exports = Server;