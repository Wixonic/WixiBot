/**
 * @type {import("../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/obs/widgets/discord/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			if (bot.guilds.cache.get(settings.application.guildId).approximatePresenceCount == null) {
				logger.debug("Cache disabled to get presence count on guild");
				await bot.guilds.fetch({
					force: true,
					guild: settings.application.guildId,
					withCounts: true
				});
			}

			const guild = bot.guilds.cache.get(settings.application.guildId);
			res.status(200).send(`<span style="color: #54FF54;"><b>${guild.approximatePresenceCount ?? "..."}</b> online</span>
				<span style="color: #888">-</span>
				<b>${guild.approximateMemberCount ?? "..."}</b> members
				<span style="color: #888">|</span>
				go.wixonic.fr/discord`);
		}
	}
};

module.exports = info;