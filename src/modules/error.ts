import type { Handler } from "../../Server/src/main.ts";
import { config } from "../../Server/src/config.ts";

import { getSettings } from "../lib/settings.ts";

export const handler: Handler = {
	domain: config.isDevEnvironment ? "localhost:1200" : "server.wixonic.fr",
	origin: "*",
	path: "/error",
	handle: async (req) => {
		if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

		const data = await req.json().catch(() => null);

		if (data?.location) {
			try {
				const settings = getSettings();
				await fetch(settings.discord.webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						username: "Website Error",
						content: `@everyone A fatal error occured on the website:\n\`\`\`${data.reason}\n${data.message}\n${data.trace}\`\`\`\n-# Location: <${data.location}>`,
						allowed_mentions: { parse: ["everyone"] }
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