import type { Handler } from "../../Server/src/main.ts";
import { config } from "../../Server/src/config.ts";
import type { Logger } from "../lib/logger.ts";

export const handler: Handler = {
	domain: config.isDevEnvironment ? "localhost:1200" : "server.wixonic.fr",
	origin: "*",
	path: "/error",
	handle: async (logger: Logger, request: Request) => {
		if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

		const data = await request.json().catch(() => null);

		if (data?.location) {
			logger.error(`A fatal error occured on the website:\n${data.reason}\n${data.message}\n${data.trace}\n-# Location: <${data.location}>`);
			return new Response(null, { status: 200 });
		} else return new Response(null, { status: 400 });
	}
};