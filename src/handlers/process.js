const childProcess = require("child_process");

/**
 * @type {{audio: string[], video: string[]}}
 */
const deviceList = {
	audio: [],
	video: []
};

/** @param {string} name */
const trimName = (name) => name.split("(")[0].replace(/\s\n\t/, " ").trim();

/** @param {import("@wixonic/logger").Logger} logger */
const updateDeviceList = (logger) => {
	return new Promise((resolve) => {
		try {
			const process = childProcess.spawn("ffmpeg", [
				"-f", "avfoundation",
				"-list_devices", "true",
				"-i", ""
			]);

			let output = "";

			process.stderr.on("data", (data) => output += data.toString());
			process.stdout.on("data", (data) => output += data.toString());

			process.on("close", () => {
				deviceList.audio = [];
				deviceList.video = [];
				const devices = output.split("AVFoundation audio devices");

				if (devices[0]) {
					for (const match of devices[0].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.video[Number(match[1])] = trimName(match[2]);
				}
				if (devices[1]) {
					for (const match of devices[1].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.audio[Number(match[1])] = trimName(match[2]);
				}

				resolve();
			});

			process.on("error", (e) => {
				logger.error("Failed to list devices:", e);
				resolve();
			});
		} catch (e) {
			logger.error("Failed to list devices:", e);
			resolve();
		}
	});
};

/** @typedef {{spawn: () => childProcess.ChildProcess, process: childProcess.ChildProcess?, active: boolean, name: string}} CaptureProcess */

/**
 * @type {{[name: string]: CaptureProcess}}
 */
const captureProcess = {
	broadcast: {
		active: false,
		name: "Broadcast",
		spawn: () => null,
		process: null
	}
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {CaptureProcess} cp
 */
const startProcess = (logger, cp) => {
	const cpLogger = {
		debug: (...args) => logger.debug(`[${cp.name}]`, ...args),
		error: (...args) => logger.error(`[${cp.name}]`, ...args),
		info: (...args) => logger.info(`[${cp.name}]`, ...args),
		warn: (...args) => logger.warn(`[${cp.name}]`, ...args)
	};

	cpLogger.info("Starting");
	cp.process = cp.spawn();

	if (cp.process instanceof childProcess.ChildProcess) {
		cp.process.on("close", () => {
			cpLogger.info("Closed");
			cp.process = null;
		});
		cp.process.on("error", (error) => cpLogger.warn(error));
		cp.process.on("exit", (code, signal) => {
			cpLogger.info("Exited with code", code);
			cp.process = null;
		});
		cp.process.stderr?.on("data", (data) => cpLogger.warn(data.toString().trim()));
		cp.process.stdout?.on("data", (data) => cpLogger.debug(data.toString().trim()));
	}
};

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {CaptureProcess} cp
 */
const stopProcess = (logger, cp) => {
	const cpLogger = {
		debug: (...args) => logger.debug(`[${cp.name}]`, ...args),
		error: (...args) => logger.error(`[${cp.name}]`, ...args),
		info: (...args) => logger.info(`[${cp.name}]`, ...args),
		warn: (...args) => logger.warn(`[${cp.name}]`, ...args)
	};

	if (!cp.process || cp.process.killed) return;
	cpLogger.info("Stopping");

	cp.process.kill("SIGTERM");

	const killTimeout = setTimeout(() => {
		if (!cp.process.killed) {
			cpLogger.warn(`Did not respond to SIGTERM. Forcing kill with SIGKILL.`);
			cp.process.kill("SIGKILL");
		}
	}, 3000);
	cp.process.once("exit", () => clearTimeout(killTimeout));
};

/**
 * @type {import("../types").HandlerInfo}
 */
const info = {
	path: "/process/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[obs/settings]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			const { id } = req.query;

			if (!id || !captureProcess[id]) return res.status(400).json({
				error: "Invalid or missing process ID"
			});

			res.status(200).json({
				id,
				active: captureProcess[id].active
			});
		},
		post: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (req.headers.authorization !== "WixKey " + settings.secrets.wixkey) {
				logger.warn("[obs/settings]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			try {
				const { id } = req.query;
				const { status } = JSON.parse(req.body);

				if (!id || !captureProcess[id]) return res.status(400).json({
					error: "Invalid or missing process ID"
				});
				captureProcess[id].active = status;

				res.status(200).json({
					id,
					active: captureProcess[id].active
				});
			} catch (e) {
				logger.warn("[obs/settings]", e);
				res.status(400).json({
					error: "Invalid status value"
				});
			}
		}
	},
	loop: {
		delay: 0.5 * 1000,
		process: async (logger, settings) => {
			let updated = false;

			for (const cp of Object.values(captureProcess)) {
				if (cp.active && !cp.process) {
					if (!updated) {
						updated = true;
						await updateDeviceList(logger);
					}
					startProcess(logger, cp, settings);

					if (!cp.process && cp.active) {
						logger.warn(`Failed to spawn process for ${cp.name}, disabling.`);
						cp.active = false;
					}
				} else if (!cp.active && cp.process) stopProcess(logger, cp);
			}

			return false;
		}
	}
};

module.exports = info;