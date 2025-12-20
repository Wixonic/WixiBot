const { MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const Roles = require("../lib/roles.js");
const { hexToIntColor } = require("../lib/utils.js");

/**
 * @type {import("../types.d.ts").CronInfo}
 */
const cron = {
	name: "Recurrent Roles",
	priority: 0,
	condition: (minutes, now) => minutes % 30 === 0, // Every 30 minutes
	run: async (logger, bot, minutes, now) => {
		const recurrentRolesFile = bot.settings.paths.recurrentRoles(bot.settings.application.guildId);
		const guild = await bot.guilds.fetch(bot.settings.application.guildId);

		const previousRecurrentRoles = fs.existsSync(recurrentRolesFile) ? JSON.parse(fs.readFileSync(recurrentRolesFile, "utf-8")) : [];

		const list = Roles.list(logger, bot);

		const isIncluded = (role, list) => {
			for (const item of list) {
				if (item.name === role.name) return true;
			}

			return false;
		};

		const newRoles = [];
		const oldRoles = [];

		for (const newRole of list.recurrentRoles.active) {
			if (!isIncluded(newRole, previousRecurrentRoles)) {
				const name = `${newRole.name} ${now.getUTCFullYear()}`;

				const cosmeticMarkerRole = await guild.roles.fetch(bot.settings.application.commands.roles.cosmeticMarkerRole);
				const guildRole = await guild.roles.create({
					color: hexToIntColor(newRole.color),
					name,
					position: cosmeticMarkerRole.position
				});
				newRole.id = guildRole.id;
				newRoles.push(newRole);
			}
		}

		for (const oldRole of previousRecurrentRoles) {
			if (!isIncluded(oldRole, list.recurrentRoles.active)) {
				oldRoles.push(oldRole);
				const name = `${oldRole.name} ${now.getUTCFullYear()}`;

				const oldMarkerRole = await guild.roles.fetch(bot.settings.application.commands.roles.oldMarkerRole);
				const role = guild.roles.cache.find((r) => r.name === name);
				if (role) guild.roles.edit(role.id, {
					position: oldMarkerRole.position
				});
			}
		}

		if (newRoles.length > 0) {
			const settings = bot.settings.application.commands.roles;
			const channel = await guild.channels.fetch(settings.mentionChannel);

			if (channel && channel.isSendable()) {
				for (const newRole of newRoles) {
					const to = new Date(`${now.getUTCFullYear()}-${newRole.to}`);
					await channel.send({
						allowedMentions: settings.mentionRole ? {
							roles: [settings.mentionRole]
						} : {},
						content: `Claim your <@&${newRole.id}> role now at <#${settings.channel}>!\nThis role will be available until <t:${Math.floor(to.getTime() / 1000)}:f>.${settings.mentionRole ? `\n<@&${settings.mentionRole}>` : ""}`,
						flags: process.env.silent === "true" ? MessageFlags.SuppressNotifications : null
					});

					logger.debug(`Announcing role ${newRole.name} ${now.getUTCFullYear()}`);
				}
			}
		}

		if (newRoles.length > 0 || oldRoles.length > 0) {
			logger.debug("Updating recurrent roles...");

			await Roles.update(logger, bot);
			if (!fs.existsSync(path.dirname(recurrentRolesFile))) fs.mkdirSync(path.dirname(recurrentRolesFile), { recursive: true });
			fs.writeFileSync(recurrentRolesFile, JSON.stringify(list.recurrentRoles.active), "utf-8");
		}
	}
};

module.exports = cron;