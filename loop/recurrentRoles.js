const fs = require("fs");
const path = require("path");

const { getChannel, getGuild } = require("../clients.js");
const { hexToIntColor } = require("../utils.js");

const config = require("../config.js");
const settings = require("../settings.js");

const recurrentRolesFile = path.join(config.cache.server, "recurrentRoles.json");
const displayRoles = require("../commands/roles.js").execute;

/**
 * @param {import("../loop.js")} loop 
 */
module.exports = async (loop) => {
	for (const guildId in settings.guilds) {
		const guildSettings = settings.guilds[guildId];
		const rolesSettings = guildSettings?.roles;
		const recurrentSettings = rolesSettings?.recurrentRoles;

		const guild = await getGuild(guildId);

		if (guild && rolesSettings?.active && recurrentSettings?.recurrentRoles?.active) {
			const year = new Date().getFullYear();

			/** @type {import("../types.js").ReccurentRoleList} */
			const currentRecurrentRoles = [];
			/** @type {import("../types.js").RecurrentRolesList} */
			const previousRecurrentRoles = fs.existsSync(recurrentRolesFile) ? JSON.parse(fs.readFileSync(recurrentRolesFile, "utf-8")) : [];

			/**
			 * @param {import("../types.js").ReccurentRole} role
			 * @param {import("../types.js").RecurrentRolesList} list
			 */
			const isIncluded = (role, list) => {
				for (const item of list) {
					if (item.name == role.name) return true;
				}

				return false
			};

			for (const role of recurrentSettings.roles ?? []) {
				const from = new Date(`${year}-${role.from}`);
				const to = new Date(`${year}-${role.to}`);

				const active = Date.now() >= from.getTime() && Date.now() <= to.getTime();

				if (active) currentRecurrentRoles.push(role);
			}

			const newRoles = [];
			const oldRoles = [];

			for (const newRole of currentRecurrentRoles) {
				if (!isIncluded(newRole, previousRecurrentRoles)) {
					const name = `${newRole.name} ${year}`;

					const cosmeticMarkerRole = await guild.roles.fetch(recurrentSettings?.cosmeticMarkerRole);
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
				if (!isIncluded(oldRole, currentRecurrentRoles)) {
					oldRoles.push(oldRole);
					const name = `${oldRole.name} ${year}`;

					const oldMarkerRole = await guild.roles.fetch(recurrentSettings?.oldMarkerRole);
					const role = guild.roles.cache.find((r) => r.name == name);
					if (role) guild.roles.edit(role.id, {
						position: oldMarkerRole.position
					});
				}
			}

			if (newRoles.length > 0) {
				const announcementChannel = await getChannel(recurrentSettings?.announcementChannel);

				if (announcementChannel) {
					for (const newRole of newRoles) {
						const to = new Date(`${year}-${newRole.to}`);
						await announcementChannel.send({
							content: `Claim your <@&${newRole.id}> role now at <#${rolesSettings.channel}>!\nThis role will be available until <t:${Math.floor(to.getTime() / 1000)}:f>.${recurrentSettings?.mentionRole ? `\n<@&${recurrentSettings.mentionRole}>` : ""}`
						});
						loop.log(`Announcing role ${newRole.name} ${year}`);
					}
				}
			}

			if (newRoles.length > 0 || oldRoles.length > 0) {
				loop.log("Updating recurrent roles...");
				await displayRoles(loop.log, guildId);
				fs.writeFileSync(recurrentRolesFile, JSON.stringify(currentRecurrentRoles), "utf-8");
			}
		}
	}
};