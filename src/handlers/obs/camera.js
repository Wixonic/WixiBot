const { spawn } = require("child_process");

let captureProcess = null;

const capture = () => {
	captureProcess = spawn("ffmpeg", [
		"-hide_banner",
		"-loglevel", "repeat+level+warning",

		"-analyzeduration", "5000000",
		"-probesize", "5000000",

		"-fflags", "nobuffer",
		"-flags", "low_delay",

		"-f", "mpegts",
		"-i", "udp://localhost:2002?fifo_size=1000000&overrun_nonfatal=1",

		"-c", "copy",
		"-f", "mpegts",

		"-bsf:v", "h264_mp4toannexb",
		"-mpegts_flags", "resend_headers",

		"pipe:1"
	]);
};

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
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