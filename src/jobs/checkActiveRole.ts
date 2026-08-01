import { client, type Job } from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";

export const syncActiveRoles = async (logger: Logger, targetGuildId?: string) => {
	if (!client.discord) return { checked: 0, added: 0, removed: 0 };

	let checked = 0;
	let added = 0;
	let removed = 0;

	const guilds = targetGuildId ? [client.discord.guilds.cache.get(targetGuildId)].filter(Boolean) : Array.from(client.discord.guilds.cache.values());

	for (const discordGuild of guilds) {
		if (!discordGuild) continue;
		const guild = await client.getGuild(discordGuild.id);
		const activeRoleId = guild?.settings.roles?.active;

		if (!activeRoleId) continue;

		try {
			const members = await discordGuild.members.fetch();
			for (const member of members.values()) {
				if (member.user.bot) continue;
				checked++;

				const user = await client.getUser(member.id);
				if (!user) continue;

				const recentStats = await user.getRecentStats(28);
				const hasThreshold = recentStats.totalMessages >= 100;
				const hasRole = member.roles.cache.has(activeRoleId);

				if (hasThreshold && !hasRole) {
					await member.roles.add(activeRoleId, "Active member threshold reached (28 days)").catch(() => null);
					added++;
				} else if (!hasThreshold && hasRole) {
					await member.roles.remove(activeRoleId, "Inactive in the last 28 days").catch(() => null);
					removed++;
				}
			}
		} catch (error) {
			logger.error(`Failed to sync active roles for guild ${discordGuild.id}`, { cause: error });
		}
	}

	return { checked, added, removed };
};

export const job: Job = {
	cron: "0 1 * * *",
	name: "Check Active Role",
	async execute(logger: Logger) {
		logger.debug("Running daily active member role check...");
		const result = await syncActiveRoles(logger);
		logger.info(`Active member role check complete: ${result.checked} checked, ${result.added} added, ${result.removed} removed.`);
	}
};