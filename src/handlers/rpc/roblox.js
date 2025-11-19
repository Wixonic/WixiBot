const request = require("../../lib/request.js");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/roblox/",
	handlers: {},
	loop: {
		delay: 15 * 1000,
		process: async (logger, settings, bot, rpc, sdk) => {
			const response = await request(logger, {
				body: JSON.stringify({
					userIds: [
						settings.secrets.rpc.roblox.id
					]
				}),
				headers: {
					"accept": "application/json",
					"content-type": "application/json",
					"cookie": ".ROBLOSECURITY=" + settings.secrets.rpc.roblox.token
				},
				method: "POST",
				type: "json",
				url: "https://presence.roblox.com/v1/presence/users"
			});

			const presence = response?.userPresences?.at(0) ?? {};

			switch (presence.userPresenceType) {
				case 2: // InGame
					const icon = await request(logger, {
						url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${presence.universeId}&size=512x512&format=Png`,
						type: "json"
					});

					rpc.addActivity("roblox", {
						applicationId: settings.rpc.discord.application.clients.roblox.id,
						assets: {
							large_image: await rpc.getExternalAsset(settings.rpc.discord.application.clients.roblox.id, icon.data[0].imageUrl),
							large_text: presence.lastLocation,
							small_image: settings.rpc.discord.application.clients.roblox.assets.icon,
							small_text: "Roblox"
						},
						buttons: [
							"Open place on Roblox",
							"My profile"
						],
						metadata: {
							button_urls: [
								"https://www.roblox.com/games/" + presence.rootPlaceId,
								"https://www.roblox.com/users/" + settings.secrets.rpc.roblox.id
							]
						},
						timestamps: {
							start: new Date(presence.lastOnline).getTime()
						},
						name: presence.lastLocation,
						details: "Playing on Roblox",
						type: "PLAYING"
					});
					break;

				case 3: // InStudio
					rpc.addActivity("roblox", {
						applicationId: settings.rpc.discord.application.clients.roblox.id,
						assets: {
							large_image: settings.rpc.discord.application.clients.roblox.assets.studio_icon,
							large_text: "Roblox Studio"
						},
						buttons: [
							"My profile"
						],
						metadata: {
							button_urls: [
								"https://www.roblox.com/users/" + settings.secrets.rpc.roblox.id
							]
						},
						timestamps: {
							start: new Date(presence.lastOnline).getTime()
						},
						name: "Roblox Studio",
						details: "Creating in Roblox",
						type: "PLAYING"
					});
					break;

				default:
					rpc.removeActivity("roblox");
					return true;
			};

			return false;
		}
	}
};

module.exports = info;