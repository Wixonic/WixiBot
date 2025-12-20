const { spawn } = require("child_process");
const { log } = require("@wixonic/logger");
const process = require("process");

const { wait } = require("./lib/utils.js");

/**
 * @param {import("@wixonic/logger").Logger} logger
 */
const main = async (logger) => {
	const tries = {
		current: 0,
		max: 10,
		delay: 3,
		get text() {
			return `[TRY ${String(this.current).padStart(String(this.max).length, "0")}/${this.max}]`;
		}
	};

	const restart = async () => {
		logger.warn("-".repeat(tries.text.length), "Restarting");
		if (tries.current < tries.max) await wait(tries.delay * tries.current * 1000);
		else {
			logger.warn("-".repeat(tries.text.length), "Exceeded maximum number of retries. Restarting in 5 minutes.");
			await wait(5 * 60 * 1000);
			tries.current = 0;
		}
		await execute();
	};

	const execute = async () => {
		tries.current++;

		const args = [
			...process.execArgv,
			"./process.js"
		];

		logger.debug(tries.text, "Launching node process with args:", ...args);

		const child = spawn("node", args, {
			env: process.env
		});

		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException", "unhandledRejection", "exit"]) {
			process.once(signal, async (reason, code) => {
				if (!child.killed) {
					child.removeAllListeners("exit");
					child.kill(signal);
					await new Promise((callback) => process.once("exit", callback));
					process.exit(code);
				} else process.exit(code);
			});
		}

		child.on("error", (e) => logger.error(e));

		const processLog = (line) => {
			line = line.replace(/\x1b\[[0-9;]*m/g, "").trim();

			if (line.length > 0) {
				const data = line.split(" ");
				const level = data.shift();
				const message = data.join(" ").replaceAll("<br />", "\n");

				switch (level) {
					case "[DEBUG]":
						logger.debug(tries.text, message);
						break;

					case "[ERROR]":
						logger.error(tries.text, message);
						break;

					case "[INFO]":
						logger.info(tries.text, message);
						break;

					case "[WARN]":
						logger.warn(tries.text, message);
						break;

					default:
						logger.warn(tries.text, "Invalid level:", level);
						logger.debug(tries.text, "Content:", message);
						break;
				};
			}
		};

		let buffer = "";
		let cursor = 0;
		child.stdout.on("data", (data) => {
			buffer += data.toString();

			const lines = buffer.split("\n");
			while (cursor < lines.length) {
				const line = lines[cursor - 1] ?? "";
				processLog(line);
				cursor++;
			}
		});
		child.stderr.on("data", (data) => {
			buffer += data.toString();

			const lines = buffer.split("\n");
			while (cursor < lines.length) {
				const line = lines[cursor - 1] ?? "";
				processLog(line);
				cursor++;
			}
		});

		child.on("exit", (code, signal) => {
			if (code === 0) {
				logger.debug(tries.text, `Exited with code ${code} and signal ${signal}`);
				process.exit(0);
			} else {
				logger.error(tries.text, `Exited with code ${code} and signal ${signal}`);
				const remainingBufferData = buffer.split("\n").slice(cursor).join("\n");
				if (remainingBufferData.length > 0) logger.debug(tries.text, "Remaining buffer data:", remainingBufferData);
				restart();
			}
		});
	};

	await execute();
};

main(log);