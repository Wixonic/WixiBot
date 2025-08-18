const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const ws = require("ws");

const request = require("./request.js");

class SDK extends EventTarget {
	/**
	 * @param {import("@wixonic/logger").Logger} logger
	 * @param {import("../types.d.ts").MainSettings} settings
	 */
	constructor(logger, settings) {
		super();

		/**
		 * @type {import("@wixonic/logger").Logger}
		 */
		this.logger = {
			debug: (...any) => logger.debug("[SDK]", ...any),
			error: (...any) => logger.error("[SDK]", ...any),
			info: (...any) => logger.info("[SDK]", ...any),
			warn: (...any) => logger.warn("[SDK]", ...any)
		};

		this.settings = settings;

		this.tokenPath = path.join(settings.paths.cache, "/sdk.json");
	};

	async login() {
		/* this.client = new ws.WebSocket(`ws://127.0.0.1:6463?v=1&client_id=905987126099836938&encoding=json`, {
			origin: "https://api.overlayed.dev"
		});

		this.client.addEventListener("close", (event) => this.logger.error("Closed:", event.reason));
		this.client.addEventListener("error", (event) => this.logger.error("Error:", event.error));

		this.client.addEventListener("message", async (event) => {
			try {
				const payload = JSON.parse(event.data);

				switch (payload.cmd) {
					case "DISPATCH":
						{
							switch (payload.evt) {
								case "READY":
									if (fs.existsSync(this.tokenPath)) {
										const token = JSON.parse(fs.readFileSync(this.tokenPath, "utf-8"));
										await this.send("AUTHENTICATE", {
											access_token: token.access_token
										});
									} else await this.authorize();
									break;

								default:
									this.logger.debug(event.data);
									break;
							}
						}
						break;

					case "AUTHENTICATE":
						{
							switch (payload.evt) {
								case "ERROR":
									await this.authorize();
									break;

								default:
									this.logger.debug(event.data);
									break;
							}
						}
						break;

					case "AUTHORIZE":
						console.log(payload.data);

						const token = await request(this.logger, {
							type: "json",
							method: "POST",
							url: new URL(`/token`, "https://api.overlayed.dev"),
							body: JSON.stringify({
								code: payload.data.code
							})
						});

						console.log(token);

						if (!fs.existsSync(path.dirname(this.tokenPath))) fs.mkdirSync(path.dirname(this.tokenPath), { recursive: true });
						fs.writeFileSync(this.tokenPath, token, "utf-8");

						await this.send("AUTHENTICATE", {
							access_token: token.access_token
						});
						break;

					default:
						this.logger.debug(event.data);
						break;
				}
			} catch (e) {
				this.logger.error(e);
			}
		});

		await new Promise((resolve) => this.addEventListener("ready", resolve)); */
	};

	async authorize() {
		await this.send("AUTHORIZE", {
			client_id: "905987126099836938",
			scopes: [
				"identify",
				"rpc"
			]
		});
	};

	/**
	 * @param {string} channel_id
	 */
	async subscribeTo(channel_id) {
		await this.send("SUBSCRIBE", {
			channel_id
		}, {
			evt: "SPEAKING_START"
		});

		await this.send("SUBSCRIBE", {
			channel_id
		}, {
			evt: "SPEAKING_STOP"
		});
	};

	/**
	 * @param {string} cmd
	 * @param {object} args
	 * @param {object?} payload
	 * @returns {Promise<string>}
	 */
	async send(cmd, args, payload) {
		const nonce = uuidv4();

		this.client.send(JSON.stringify({
			cmd,
			args,
			nonce,
			...payload
		}));

		return nonce;
	};
};

module.exports = SDK;