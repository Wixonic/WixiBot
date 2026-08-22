import type { Handler } from "../../Server/src/main.ts";
import { config } from "../../Server/src/config.ts";

import { client } from "../../WixiBot/src/lib/client.ts";

export const handler: Handler = {
	domain: config.isDevEnvironment ? "localhost:1201" : "discord.wixonic.fr",
	origin: config.isDevEnvironment ? "localhost:2005" : "wixonic.fr",
	path: "/profile/",
	handle: async (req) => {
		const searchParams = new URL(req.url).searchParams;
		const userId = searchParams.get("id");
		console.log("Profile request for user ID:", userId);
		if (!userId) return new Response("Missing user ID", { status: 400 });

		if (userId !== "1020454688467980308") return new Response("Unauthorized", { status: 403 });

		const user = await client.getUser(userId);
		if (!user) return new Response("User not found", { status: 404 });

		return Response.json({
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			avatar: user.avatar("webp", 256, true),
			avatarDecoration: user.avatarDecoration(true),
			nameplate: user.nameplate(true),
			displayNameStyle: await user.displayNameStyle(),
			presence: {
				/* activities: user.presence?.activities || [], */
				status: user.presence?.status || "offline"
			}
		});
	}
};