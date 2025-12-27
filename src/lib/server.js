const { execSync } = require("child_process");
const cors = require("cors");
const express = require("express");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const ws = require("ws");

class Server {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 */
	constructor(logger, settings) {
		/** @type {import("@wixonic/logger").Logger} */
		this.logger = {
			debug: (...any) => logger.debug("[Server]", ...any),
			error: (...any) => logger.error("[Server]", ...any),
			info: (...any) => logger.info("[Server]", ...any),
			warn: (...any) => logger.warn("[Server]", ...any)
		};

		this.settings = settings;

		if (!fs.existsSync(this.settings.secrets.server.cert) || !fs.existsSync(this.settings.secrets.server.key)) throw new Error("SSL certificate or key are missing.");

		this.app = express();

		/** @type {https.Server} */
		this.http = process.env.dev === "true" ? http.createServer() : https.createServer({
			cert: fs.readFileSync(this.settings.secrets.server.cert),
			key: fs.readFileSync(this.settings.secrets.server.key)
		});

		this.ws = new ws.Server({
			noServer: true
		});

		this.wsHandlers = [];
		this.loopHandlers = [];

		this.port = this.settings.port;
	};

	/**
	 * @param {import("./bot.js")} bot
	 * @param {import("./rpc.js")} rpc
	 * @param {import("./sdk.js")} sdk
	 * @returns {Promise<void>}
	 */
	init(bot, rpc, sdk) {
		const handlersPath = path.join(__dirname, "..", "handlers");

		return new Promise(async (resolve) => {
			this.app.use(cors({
				credentials: true,
				origin: (origin, callback) => callback(null, origin ?? true)
			}));

			this.app.use((req, res, next) => {
				const origin = req.headers.origin;
				this.logger.debug(`Request: ${req.method + (origin ? " " + origin : "")} | ${req.url}`);

				const Performance = require("./performance.js");
				if (!Performance.logger) Performance.init(this.logger);

				const start = performance.now();
				res.on("finish", () => {
					Performance.log("HTTP", `${req.method} ${req.url}`, performance.now() - start, `Status: ${res.statusCode}`);
				});

				next();
			});

			this.app.use(express.text({ limit: "1gb", type: "*/*" }));

			const handlers = fs.readdirSync(handlersPath, { recursive: true });
			for (const handlerFile of handlers) {
				if (handlerFile.endsWith(".js")) {
					/** @type {import("../types.d.ts").HandlerInfo} */
					const handler = require(path.join(handlersPath, handlerFile));
					const handlerName = handlerFile.replace(".js", "");

					for (const method in handler.handlers) {
						if (method !== "ws") this.app[method](handler.path, (req, res) => handler.handlers[method](this.logger, this.settings, req, res, bot, rpc, sdk));
						else this.wsHandlers[handler.path] = handler.handlers.ws;
						this.logger.debug("Added handler for", handlerName, "at", handler.path, "with method", method);
					}

					if (handler.loop) {
						this.loopHandlers[handler.path] = {
							delay: handler.loop.delay,
							idle: true,
							lastUpdated: 0,
							name: handlerName,
							process: handler.loop.process
						};

						this.logger.debug("Added loop handler for", handlerName);
					}
				}
			}

			const startLoop = (path) => {
				const loop = this.loopHandlers[path];
				if (typeof loop.process !== "function") return;

				const runLoop = async () => {
					const now = Date.now();
					const delay = loop.idle ? 20 * 1000 : loop.delay;

					if (loop.lastUpdated + delay <= now) {
						this.loopHandlers[path].lastUpdated = now;

						const handlerLogger = {
							debug: (...args) => this.logger.debug(`[${loop.name}]`, ...args),
							error: (...args) => this.logger.error(`[${loop.name}]`, ...args),
							info: (...args) => this.logger.info(`[${loop.name}]`, ...args),
							warn: (...args) => this.logger.warn(`[${loop.name}]`, ...args)
						};

						try {
							const status = await loop.process(handlerLogger, this.settings, bot, rpc, sdk);
							if (status !== loop.idle) {
								handlerLogger.debug(`Now ${status ? "idle" : "active"}`);
								this.loopHandlers[path].idle = status;
							}
						} catch (e) {
							handlerLogger.warn("Failed to process:", e);
							handlerLogger.debug("Now idle");
							this.loopHandlers[path].idle = true;
						}
					}

					setTimeout(runLoop, Math.max(10, (loop.lastUpdated + (this.loopHandlers[path].idle ? 20 * 1000 : loop.delay)) - Date.now()));
				};

				runLoop();
			};

			for (const path in this.loopHandlers) startLoop(path);

			this.http.on("clientError", (e) => this.logger.warn("[HTTP]", "Client error:", e));
			this.http.on("close", () => this.logger.warn("[HTTP]", "Server closed"));
			this.http.on("error", (e) => this.logger.error("[HTTP]", "Server error:", e));
			this.http.on("connection", () => this.logger.debug("[HTTP]", "TCP stream established"));
			this.http.on("request", this.app);

			this.http.on("upgrade", (req, socket, head) => {
				this.logger.debug("Upgrading to WebSocket at:", req.url ?? "unknown URL");
				this.ws.handleUpgrade(req, socket, head, (ws) => {
					this.ws.emit("connection", ws, req);
					const handler = this.wsHandlers[req.url];
					if (handler) handler(this.logger, this, ws, bot, rpc, sdk);
				});
			});


			this.ws.on("close", () => this.logger.warn("[WebSocket]", "Server closed"));

			this.ws.on("connection", (ws) => {
				this.logger.debug("[WebSocket]", "Connection open");

				ws.on("close", () => this.logger.debug("[WebSocket]", "Connection closed"));
				ws.on("error", (e) => this.logger.warn("[WebSocket]", "Client error:", e));
				ws.once("message", (data) => this.logger.debug("[WebSocket]", "Message received:", data.toString("hex")));
				ws.on("ping", () => this.logger.debug("[WebSocket]", "Connection ping-ed"));
				ws.on("pong", () => this.logger.debug("[WebSocket]", "Connection pong-ed"));
				ws.on("unexpected-response", () => this.logger.debug("[WebSocket]", "Unexpected reponse"));
				ws.on("upgrade", () => this.logger.debug("[WebSocket]", "Connection upgraded"));
			});

			this.ws.on("error", (e) => this.logger.error("[WebSocket]", "Server error:", e));

			try {
				execSync(`kill -9 $(lsof -ti :${this.port})`, {
					stdio: "ignore"
				});
			} catch { }

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