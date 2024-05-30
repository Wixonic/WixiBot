const settings = require("./settings.js");

module.exports = {
	getRoleSettingsForGuild: (guildId, roleId) => {
		const guild = settings.guilds[guildId];
		if (!guild) return null;

		const roleGroups = guild.roles.groups;
		for (const group of roleGroups) {
			if (group.active) {
				for (const role of group.roles) {
					if (role.id === roleId) return role;
				}
			}
		}

		return null;
	}
};