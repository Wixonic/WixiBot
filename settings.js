const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = process.env.DEV == "true" ? {
	guilds: {
		"1243943943779909652": {
			privacy: {
				active: true
			},
			rules: {
				active: true,
				channel: "1243991489575522374"
			}
		}
	}
} : {
	guilds: {
		"1020663521530351627": {
			help: {
				active: true,
				channel: "1037855849944731808"
			},
			privacy: {
				active: true
			},
			radio: {
				active: true
			},
			roles: {
				active: true,
				channel: "1244017962843897936",
				groups: [
					{
						active: true,
						name: "Supporter Roles",
						description: "These roles allow you to get access to exclusive content, early access to videos and more! Both roles give the same advantages.",
						roles: [
							{
								id: "1040743271288295436",
								locked: true,
								message: "To get access to this role, you need to [boost this server](https://support.discord.com/hc/articles/360028038352-Server-Boosting-FAQ)."
							}, {
								id: "1327627362946388030",
								locked: true,
								message: "To get access to this role, you need to be a subscriber on Patreon.\n[Subscribe](https://go.wixonic.fr/patreon), and check if you linked your Discord account to your Patreon account."
							}
						]
					}, {
						active: true,
						name: "Notification Roles",
						description: "These roles allow you to choose to receive notifications and be mentioned when necessary.",
						roles: [
							{
								id: "1307298359651991583"
							}
						]
					}, {
						active: true,
						name: "Color Roles",
						description: "These roles are only cosmetic.",
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
						description: "These roles give exclusive perks and permissions.",
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
				],
				recurrentRoles: {
					active: true,
					announcementChannel: "1243950230899134596",
					cosmeticMarkerRole: "1324669613480349729",
					oldMarkerRole: "1324669679532380190",
					mentionRole: "1307298359651991583",
					roles: [
						{
							name: "New Year",
							color: "#D7B030",
							from: "01-01T00:00:00",
							to: "01-31T23:59:59"
						}, {
							name: "Valentine's Day",
							color: "#E06287",
							from: "02-14T00:00:00",
							to: "02-21T23:59:59"
						}, {
							name: "Easter",
							color: "#C5EBD5",
							from: "03-23T00:00:00",
							to: "04-25T23:59:59"
						}, {
							name: "Summer",
							color: "#47927E",
							from: "06-01T00:00:00",
							to: "08-31T23:59:59"
						}, {
							name: "Halloween",
							color: "#EB5A1C",
							from: "10-30T00:00:00",
							to: "11-06T23:59:59"
						}, {
							name: "Christmas",
							color: "#B43B2B",
							from: "12-24T00:00:00",
							to: "12-31T23:59:59"
						}
					]
				}
			},
			rules: {
				active: true,
				channel: "1020684346098733138"
			},
			ticket: {
				active: true,
				channel: "1247276648366080144",
				queue: "1247276415880138843",
				category: "1328283685253943329"
			},
			customSettings: {
				w47k3r5Role: "1245812981527482378",
				formResultChannel: "1245813497288331338"
			}
		}
	}
};