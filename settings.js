const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = process.env.DEV == "true" ? {
	guilds: {
		"1243943943779909652": {

		}
	}
} : {
	guilds: {
		"1020663521530351627": {
			help: {
				active: true,
				channel: "1037855849944731808"
			},
			roles: {
				active: true,
				channel: "1244017962843897936",
				groups: [
					{
						active: true,
						name: "Colors",
						description: "These roles are just cosmetics.",
						roles: [
							{
								id: "1244218105979469824"
							}, {
								id: "1244217985602814013"
							}, {
								id: "1244218162094932029"
							}, {
								id: "1244218253513851041"
							}, {
								id: "1244227290674626582"
							}
						]
					}, {
						active: true,
						name: "Special Roles",
						description: "These roles give exclusive perks and authorization.",
						roles: [
							{
								id: "1245812981527482378",
								locked: true,
								modal: new ModalBuilder()
									.setCustomId("w47k3r5Verification")
									.setTitle("W47K3R5 Verification Form")
									.setComponents(
										new ActionRowBuilder()
											.setComponents(
												new TextInputBuilder()
													.setCustomId("walkerId")
													.setLabel("Walker ID")
													.setMinLength(4)
													.setMaxLength(7)
													.setPlaceholder("#000000")
													.setRequired(true)
													.setStyle(TextInputStyle.Short)
											)
									)
							}
						]
					}
				]
			},
			rules: {
				active: true,
				channel: "1020684346098733138"
			},
			session: {
				active: true
			},
			ticket: {
				active: true,
				channel: "1247276648366080144",
				queue: "1247276415880138843"
			},
			customSettings: {
				formResultChannel: "1245813497288331338"
			}
		}
	}
};