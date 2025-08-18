const { displayInlineActivity } = require("../../../lib/utils.js");

/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/rpc/status/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc) => {
			if (req.headers.authorization != "WixKey " + settings.secrets.wixkey) {
				logger.warn("[rpc/warthunder]", "Unauthorized access attempt");
				return res.status(401).json({
					error: "Unauthorized"
				});
			}

			/** @type {[import("discord.js-selfbot-v13").User, import("discord.js-selfbot-v13").Presence][]} */
			const onlineFriends = [];
			rpc.client.relationships.friendCache.forEach((friend) => {
				const presence = rpc.client.presences.resolve(friend.id);
				if (presence && ["online", "dnd"].includes(presence.status)) onlineFriends.push([friend, presence]);
			});

			let onlineFriendsText = [];

			for (const friend of onlineFriends) {
				let text = await displayInlineActivity(friend[1], friend[0], bot);
				if (text.length > req.query.length - 3) text = text.slice(0, req.query.length - 3) + "...";
				onlineFriendsText.push(text);
			}

			if (onlineFriends.length == 0) {
				let text = "No friends online";
				if (text.length > req.query.length - 3) text = text.slice(0, req.query.length - 3) + "...";
				onlineFriendsText.push(text);
			}

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
				channelStatsText = `\x1b[1m${channel.members.size} ${channel.members.size > 1 ? "people" : "person"}\x1b[0m in ${channel.name}:\n`;
				const channelStatsMembersText = [];
				for (const member of channel.members.values()) channelStatsMembersText.push(`- ${member.displayName}`);
				channelStatsText += channelStatsMembersText.join("\n");
			} else channelStatsText = `Nobody is in ${channel.name}.`;
			if (channelStatsText.length > req.query.length - 3) channelStatsText = channelStatsText.slice(0, req.query.length - 3) + "...";

			let serverStatsText = `\x1b[32;1m${guild.approximatePresenceCount ?? "..."}\x1b[0m \x1b[32monline\x1b[0m \x1b[90m-\x1b[0m \x1b[1m${guild.approximateMemberCount ?? "..."}\x1b[0m members`;
			if (serverStatsText.length > req.query.length - 3) serverStatsText = serverStatsText.slice(0, req.query.length - 3) + "...";

			const text = [];

			text.push(onlineFriendsText.join("\n"));
			text.push(channelStatsText);
			text.push(serverStatsText);

			res.status(200).send(text.join("\n\n"));
		}
	}
};

module.exports = info;