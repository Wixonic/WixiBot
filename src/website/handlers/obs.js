const childProcess = require("child_process");
const { log } = require("@wixonic/logger");

/**
 * @type {{audio: string[], video: string[]}}
 */
const deviceList = {
	audio: [],
	video: []
};

const trimName = (name) => name.split("(")[0].replace(/\s\n\t/, " ").trim();

const updateDeviceList = () => {
	const result = childProcess.spawnSync("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-f", "avfoundation",
		"-list_devices", "true",
		"-i", ""
	], { encoding: "utf8" });

	deviceList.audio = [];
	deviceList.video = [];
	const output = (result.stderr || result.stdout).split("AVFoundation audio devices");

	for (const match of output[0].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.video[Number(match[1])] = trimName(match[2]);
	for (const match of output[1].matchAll(/\.*\] \[(\d+)\] (.+)/g)) deviceList.audio[Number(match[1])] = trimName(match[2]);
};

/**
 * @type {{[name: string]: {spawn: (logger: import("@wixonic/logger").Logger) => childProcess.ChildProcess, process: childProcess.ChildProcess?, active: boolean, name: string}}}
 */
const captureProcess = {
	microphone: {
		active: false,
		name: "Microphone capture",
		spawn: (logger) => {
			logger.info("Starting process:", captureProcess.microphone.name);
			return childProcess.spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
				"-hide_banner",
				"-loglevel", "warning",
				"-f", "avfoundation",
				"-framerate", "60",
				"-i", `:${deviceList.audio.indexOf("Elgato Wave:3")}`,

				"-vn",

				"-c:a", "aac",
				"-b:a", "320k",
				"-ac", "1",
				"-ar", "48000",

				"-tune", "zerolatency",
				"-flags", "low_delay",
				"-fflags", "nobuffer",
				"-f", "mpegts",
				`udp://10.0.0.2:2003`
			], { stdio: "inherit" });
		},
		process: null
	},
	audio: {
		active: false,
		name: "Audio",
		spawn: (logger) => {
			logger.info("Starting process:", captureProcess.audio.name);
			return childProcess.spawn("ffplay", [
				"-hide_banner",
				"-loglevel", "warning",

				"-flags", "low_delay",
				"-fflags", "nobuffer",

				"-nodisp",
				"-vn",

				"-f", "mpegts",
				"udp://10.0.0.2:2000"
			], { stdio: "inherit" });
		},
		process: null
	},
	broadcast: {
		active: false,
		name: "Broadcast",
		spawn: (logger, settings) => {
			logger.info("Starting process:", captureProcess.broadcast.name);
			return null;
		},
		process: null
	}
};

/**
 * @type {import("../../types").HandlerInfo}
 */
const info = {
	path: "/obs/settings/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
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
		post: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
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
		delay: 2 * 1000,
		process: async (logger, settings, bot, rpc) => {
			updateDeviceList();

			for (const cp of Object.values(captureProcess)) {
				if (!cp.process || cp.process.killed) {
					if (cp.active) {
						cp.process = cp.spawn(log);

						for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
							cp.process.once(signal, async (reason, code) => {
								if (!cp.process.killed) {
									cp.process.removeAllListeners("exit");
									cp.process.kill("SIGTERM");
								}
							});
						}
					}
				} else if (!cp.process.killed && !cp.active) cp.process.kill("SIGTERM");
			}

			return false;
		}
	}
};

module.exports = info;