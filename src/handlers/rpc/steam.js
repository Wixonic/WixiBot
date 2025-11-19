const request = require("../../lib/request.js");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/steam/",
	handlers: {},
	loop: {
		delay: 15 * 1000,
		process: async (logger, settings, bot, rpc, sdk) => {
			const response = (await request(logger, {
				method: "GET",
				type: "json",
				url: `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002?key=${settings.secrets.rpc.steam.token}&steamids=${settings.secrets.rpc.steam.id}`
			})).response ?? {};

			const player = response?.players?.at(0) ?? {};

			if (player.gameid) {
				const response = (await request(logger, {
					method: "GET",
					type: "json",
					url: `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${settings.secrets.rpc.steam.token}&steamid=${settings.secrets.rpc.steam.id}&include_appinfo=true&include_played_free_games=true&include_free_sub=true`
				})).response ?? {};

				const game = response?.games?.find((game) => game.appid == player.gameid);

				if (game) {
					rpc.addActivity("steam", {
						applicationId: settings.rpc.discord.application.clients.steam.id,
						assets: {
							large_image: await rpc.getExternalAsset(settings.rpc.discord.application.clients.steam.id, `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${player.gameid}/${game.img_icon_url}.jpg`),
							large_text: game.name,
							small_image: settings.rpc.discord.application.clients.steam.assets.icon,
							small_text: "Steam"
						},
						buttons: [
							"Open game on Steam",
							"My profile"
						],
						metadata: {
							button_urls: [
								"https://store.steampowered.com/app/" + player.gameid,
								player.profileurl
							]
						},
						name: game.name,
						details: "Playing on Steam",
						type: "PLAYING"
					});
				} else {
					rpc.addActivity("steam", {
						applicationId: settings.rpc.discord.application.clients.steam.id,
						assets: {
							large_image: settings.rpc.discord.application.clients.steam.assets.icon,
							large_text: "Steam"
						},
						buttons: [
							"Open game on Steam",
							"My profile"
						],
						metadata: {
							button_urls: [
								"https://store.steampowered.com/app/" + player.gameid,
								player.profileurl
							]
						},
						name: player.gameextrainfo,
						details: "Playing on Steam",
						type: "PLAYING"
					});
				}

				return false;
			} else {
				rpc.removeActivity("steam");
				return true;
			}
		}
	}
};

module.exports = info;