import type { Handler } from "../../Server/src/main.ts";
import { config } from "../../Server/src/config.ts";

import { getSettings } from "../../WixiBot/src/lib/settings.ts";

export const handler: Handler = {
	domain: config.isDevEnvironment ? "localhost:1200" : "server.wixonic.fr",
	origin: "*",
	path: "/error/",
	handle: async (req) => {
		const settings = getSettings();
		const data = await req.json();

		if (data?.location) {
			try {
				await fetch(settings.discord.webhookUrl, {
					body: JSON.stringify({
						username: "Website Error",
						content: `A fatal error occured on the website:\n\`\`\`${data.reason}\n${data.message}\n${data.trace}\`\`\`\n-# Location: <${data.location}>`
					})
				});

				return new Response(null, { status: 200 });
			} catch (error) {
				console.error("Failed to send error report to Discord:", error);
				return new Response(null, { status: 500 });
			}
		} else return new Response(null, { status: 400 });
	}
};