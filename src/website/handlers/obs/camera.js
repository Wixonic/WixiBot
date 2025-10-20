const { spawn } = require("child_process");

let captureProcess = null;

const capture = () => {
	captureProcess = spawn("ffmpeg", [
		"-hide_banner",
		"-loglevel", "warning",

		"-f", "mpegts",
		"-i", "udp://localhost:2002",

		"-c", "copy",
		"-f", "mp4",
		"pipe:1"
	]);
};

/**
 * @type {import("../../../types").HandlerInfo}
 */
const info = {
	path: "/obs/camera/",
	handlers: {
		ws: async (logger, settings, ws) => {
			const cleanup = () => {
				if (captureProcess) {
					captureProcess.kill("SIGKILL");
					captureProcess = null;
					logger.debug("Capture process killed");
				}
			};

			cleanup();
			logger.info("Starting stream");
			capture();
			captureProcess.stdout.on("data", (frame) => ws.send(frame));
			captureProcess.stderr.on("data", (e) => logger.warn(`ffmpeg: ${String(e).trim()}`));
			captureProcess.on("error", (e) => logger.error(`ffmpeg error: ${e.message}`));
			captureProcess.on("exit", () => cleanup());

			ws.on("error", (e) => {
				logger.warn(`WebSocket error: ${e.message}`);
				cleanup();
			});

			ws.on("close", () => {
				logger.debug("WebSocket closed");
				cleanup();
			});
		}
	}
};

module.exports = info;