const tls = require("tls");
const net = require("net");

const relayEmail = (logger, host, port, account, password, rawMessage, originalFrom, targetUser, onionHostname) => {
	return new Promise((resolve, reject) => {
		const isSecure = port === 465;
		const socket = isSecure
			? tls.connect(port, host, onConnect)
			: net.connect(port, host, onConnect);

		function onConnect() {
			let state = "INIT";
			let dataBuffer = "";

			socket.on("data", (chunk) => {
				dataBuffer += chunk.toString();
				const lines = dataBuffer.split("\n");

				if (!dataBuffer.endsWith("\n")) {
					dataBuffer = lines.pop();
				} else {
					if (lines[lines.length - 1] === "") lines.pop();
					dataBuffer = "";
				}

				for (let line of lines) {
					line = line.trim();
					if (line.length === 0) continue;

					const code = line.substring(0, 3);

					if (line.charAt(3) === "-") continue;

					logger.debug("[Client SMTP] <-", line);

					if (state === "INIT" && code === "220") {
						socket.write(`EHLO ${onionHostname}\r\n`);
						logger.debug(`[Client SMTP] -> EHLO ${onionHostname}`);
						state = "EHLO";
					} else if (state === "EHLO" && code === "250") {
						socket.write("AUTH LOGIN\r\n");
						logger.debug("[Client SMTP] -> AUTH LOGIN");
						state = "AUTH_LOGIN";
					} else if (state === "AUTH_LOGIN" && code === "334") {
						const userB64 = Buffer.from(account).toString("base64");
						socket.write(`${userB64}\r\n`);
						logger.debug("[Client SMTP] -> (nom d'utilisateur)");
						state = "AUTH_USER";
					} else if (state === "AUTH_USER" && code === "334") {
						const passB64 = Buffer.from(password).toString("base64");
						socket.write(`${passB64}\r\n`);
						logger.debug("[Client SMTP] -> (mot de passe)");
						state = "AUTH_PASS";
					} else if (state === "AUTH_PASS" && code === "235") {
						socket.write(`MAIL FROM:<${account}>\r\n`);
						logger.debug(`[Client SMTP] -> MAIL FROM:<${account}>`);
						state = "MAIL";
					} else if (state === "MAIL" && code === "250") {
						socket.write(`RCPT TO:<${targetUser}>\r\n`);
						logger.debug(`[Client SMTP] -> RCPT TO:<${targetUser}>`);
						state = "RCPT";
					} else if (state === "RCPT" && code === "250") {
						socket.write("DATA\r\n");
						logger.debug("[Client SMTP] -> DATA");
						state = "DATA";
					} else if (state === "DATA" && code === "354") {
						socket.write(rawMessage);
						socket.write("\r\n.\r\n");
						logger.debug("[Client SMTP] -> (Données du message) + .");
						state = "QUIT";
					} else if (state === "QUIT" && code === "250") {
						socket.write("QUIT\r\n");
						logger.debug("[Client SMTP] -> QUIT");
						resolve();
					} else if (code.startsWith("4") || code.startsWith("5")) {
						logger.error("[Client SMTP] Erreur :", line);
						socket.end();
						reject(new Error(line));
					}
				}
			});

			socket.on("error", (e) => {
				logger.error("[Client SMTP] Erreur de socket", e);
				reject(e);
			});

			socket.on("end", () => {
				logger.debug("[Client SMTP] Connexion fermée");
			});
		}
	});
};

module.exports = { relayEmail };