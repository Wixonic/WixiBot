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
		active: true,
		name: "Microphone capture",
		spawn: (logger) => {
			logger.info("Starting process:", captureProcess.microphone.name);
			return childProcess.spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
				"-hide_banner",
				"-loglevel", "warning",
				"-f", "avfoundation",
				"-framerate", "60",
				"-i", `:${deviceList.audio.indexOf("Wave Link Stream")}`,

				"-vn",

				"-c:a", "aac",
				"-b:a", "320k",
				"-ac", "2",
				"-ar", "48000",

				"-flags", "low_delay",
				"-fflags", "nobuffer",
				"-f", "mpegts",
				`udp://10.0.0.2:2003`
			], { stdio: "inherit" });
		},
		process: null
	}
};

const update = () => {
	updateDeviceList();

	for (const cp of Object.values(captureProcess)) {
		if (!cp.process || cp.process.killed) {
			if (cp.active) {
				cp.process = cp.spawn(log);

				for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
					process.once(signal, async (reason, code) => {
						if (!cp.process.killed) {
							cp.process.removeAllListeners("exit");
							cp.process.kill(signal);
						}
					});
				}
			}
		} else if (!cp.process.killed && !cp.active) cp.process.kill("SIGTERM");
	}

	setTimeout(update, 1000);
};

update();

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/obs/settings/",
	handlers: {
		get: async (logger, settings, req, res) => {
			const { id } = req.query;
			const processId = id;

			if (!processId || !captureProcess[processId]) return res.status(400).send("Invalid or missing process ID");

			res.json({ id: processId, active: captureProcess[processId].active });
		},
		post: (logger, settings, req, res) => {
			let body = "";
			req.on("data", (chunk) => body += chunk.toString());

			req.on("end", async () => {
				try {
					const response = JSON.parse(body);
					const { id } = req.query;
					const { status } = response;

					if (!id || !captureProcess[id]) return res.status(400).send("Invalid or missing process ID");
					captureProcess[id].active = status;

					res.json({ id, active: captureProcess[id].active });
				} catch {
					res.status(400).send("Invalid status value");
				}
			});
		}
	}
};

module.exports = info;