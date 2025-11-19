const { displayInlineActivity } = require("../../lib/utils.js");

/**
 * @type {import("../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/status/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/status]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			const trim = (text) => {
				const maxLength = req.query.length;
				if (!maxLength) return text;

				let visibleLength = 0;
				let trimIndex = 0;
				const targetVisibleLength = maxLength - 3;

				for (let i = 0; i < text.length; i++) {
					const char = text[i];

					if (char == "\x1b") {
						const endAnsi = text.indexOf("m", i);
						if (endAnsi !== -1) {
							i = endAnsi;
							continue;
						}
					}

					if (char != "\n") visibleLength++;

					if (visibleLength == targetVisibleLength) trimIndex = i + 1;
				}

				if (visibleLength <= maxLength) return text;
				else {
					if (targetVisibleLength <= 0) return "...";
					return text.slice(0, trimIndex) + "\x1b[0m...";
				}
			};

			/** @type {[import("discord.js-selfbot-v13").User, import("discord.js-selfbot-v13").Presence][]} */
			const onlineFriends = [];
			rpc.client.relationships.friendCache.forEach((friend) => {
				const presence = rpc.client.presences.resolve(friend.id);
				if (presence && ["online", "idle", "dnd"].includes(presence.status)) onlineFriends.push([friend, presence]);
			});

			const onlineFriendsText = [];
			for (const friend of onlineFriends) onlineFriendsText.push(trim(`- ${await displayInlineActivity(friend[1], friend[0], bot)}`));
			if (onlineFriendsText.length == 0) onlineFriendsText.push(trim("No friends online"));
			else onlineFriendsText.unshift(`${onlineFriendsText.length} friend${onlineFriendsText.length > 1 ? "s" : ""} online:`);

			if (bot.guilds.cache.get(settings.application.guildId).approximatePresenceCount == null) {
				logger.debug("Cache disabled to get presence count on guild");
				await bot.guilds.fetch({
					force: true,
					guild: settings.application.guildId,
					withCounts: true
				});
			}

			const guild = bot.guilds.cache.get(settings.application.guildId);

			const channel = guild.channels.cache.get(settings.rpc.status.channel);
			let channelStatsText = "";
			if (channel && channel.isVoiceBased() && channel.members.size > 0) {
				channelStatsText = trim(`\x1b[1m${channel.members.size} member${channel.members.size > 1 ? "s" : ""}\x1b[0m in ${channel.name}:\n`);

				const channelStatsMembersText = [];
				for (const member of channel.members.values()) channelStatsMembersText.push(trim(`- ${member.displayName}`));
				channelStatsText += channelStatsMembersText.join("\n");
			} else channelStatsText = trim(`Nobody is in ${channel.name}.`);

			const serverStatsText = trim(`\x1b[32;1m${guild.approximatePresenceCount ?? "..."}\x1b[0m \x1b[32monline\x1b[0m \x1b[90m-\x1b[0m \x1b[1m${guild.approximateMemberCount ?? "..."}\x1b[0m members`);

			const text = [];

			text.push(onlineFriendsText.join("\n"));
			text.push(channelStatsText);
			text.push(serverStatsText);

			res.status(200).send(text.join("\n\n"));
		}
	}
};

module.exports = info;