const { SMTPServer } = require("smtp-server");
const simpleParser = require("mailparser").simpleParser;

const createSMTPServer = (logger, hostname, onMessage) => {
	const server = new SMTPServer({
		secure: false,
		disabledCommands: ["STARTTLS", "AUTH"],

		onRcptTo(address, session, callback) {
			const to = address.address.toLowerCase();
			if (!to.endsWith(`@${hostname}`)) {
				return callback(new Error(`Only @${hostname} addresses are accepted`));
			}
			callback();
		},

		onData(stream, session, callback) {
			let buffer = Buffer.alloc(0);
			stream.on('data', chunk => {
				buffer = Buffer.concat([buffer, chunk]);
			});
			stream.on('end', () => {
				const from = session.envelope.mailFrom ? session.envelope.mailFrom.address : `unknown@${hostname}`;
				const to = session.envelope.rcptTo[0] ? session.envelope.rcptTo[0].address : `unknown@${hostname}`;

				try {
					onMessage(from, to, buffer);
				} catch (e) {
					logger.error("Error processing email", e);
				}

				callback(null, "Message delivered successfully");
			});
		}
	});

	server.on("error", (e) => {
		logger.warn("[SMTP Server] Error:", e.message);
	});

	server.listen(2525, () => {
		logger.info("[SMTP Server] Listening on port 2525");
	});

	return server;
};

module.exports = {
	createSMTPServer
};