const { client } = require("./clients.js");
const settings = require("./settings.js");

const log = (any) => {
	const now = new Date();
	console.log(`[${now.toLocaleDateString("fr", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}] ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}`);
};

log.error = async (any) => {
	log(any);

	if (settings.log.active) {
		const guild = (client.guilds.cache.get(settings.log.guild) ?? await client.guilds.fetch(settings.log.guild));
		await (guild.channels.cache.get(settings.log.channel) ?? await guild.channels.fetch(settings.log.channel)).send({
			content: `\`\`\`\n[ERROR]: ${typeof any == "string" ? any : JSON.stringify(any, null, 2)}\`\`\``
		});
	}
};

module.exports = log;