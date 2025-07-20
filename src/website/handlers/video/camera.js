const { spawn } = require("child_process");

let captureProcess = null;

const capture = () => {
	captureProcess = spawn("/usr/local/ffmpeg-4.1/bin/ffmpeg", [
		"-hide_banner",
		"-loglevel", "warning",

		"-probesize", "10M",
		"-analyzeduration", "10M",

		"-fflags", "nobuffer+genpts+discardcorrupt",
		"-flags", "low_delay",

		"-f", "mpegts",
		"-i", "udp://@:2002",

		"-bsf:v", "h264_mp4toannexb",
		"-fflags", "+genpts",

		"-c", "copy",

		"-f", "mpegts",
		"pipe:1"
	]);
};

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/video/camera/",
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

			captureProcess.stdout.on("data", (data) => ws.send(data));
			captureProcess.stderr.on("data", (data) => logger.warn(`ffmpeg: ${data.toString().trim()}`));
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