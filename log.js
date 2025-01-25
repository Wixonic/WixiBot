const request = require("./lib/request.js");

const config = require("./config.js");

const log = (any) => {
	const now = new Date();
	console.log(`[${now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}] ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`);
};

log.error = async (any) => {
	log(any);

	await request({
		url: config.log,
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			content: `\`\`\`\n[ERROR]: ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}\`\`\``
		})
	});
};

module.exports = log;