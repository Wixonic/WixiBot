const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = process.env.DEV == "true" ? {
	guilds: {
		"1243943943779909652": {
			giveaways: {
				active: false,
				channel: "1332713470193434635",
				role: "1331689026821951639"
			},
			privacy: {
				active: true
			},
			rank: {
				active: true
			},
			ranks: {
				active: true,
				channel: "1243943943779909655",
				points: {
					messages: 2,
					voice: 1 / 60,
					stream: 2 / 60
				},
				roles: {
					"1335646024508899449": 15000,
					"1335646021988126722": 7500,
					"1335646007672963195": 3000,
					"1335646000408170546": 1000,
					"1335645993550483606": 500,
					"1335645920464736346": 1
				}
			},
			roles: {
				active: false,
				channel: "1332713470193434635",
				groups: [],
				recurrentRoles: {
					active: true,
					announcementChannel: "1332713470193434635",
					cosmeticMarkerRole: "1324676103473860679",
					oldMarkerRole: "1324676172537135145",
					mentionRole: "1245769279102517341",
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
				channel: "1243991489575522374"
			}
		}
	}
} : {
	guilds: {
		"1020663521530351627": {
			giveaways: {
				active: true,
				channel: "1333864397931675740",
				role: "1334918862822576159"
			},
			help: {
				active: true,
				channel: "1037855849944731808"
			},
			"message-as": {
				active: true
			},
			privacy: {
				active: true
			},
			pronote: {
				active: true
			},
			radio: {
				active: true
			},
			rank: {
				active: true
			},
			ranks: {
				active: true,
				channel: "1333782941095956541",
				points: {
					messages: 2,
					voice: 1 / 60,
					stream: 2 / 60
				},
				roles: {
					"1332696028989755464": 15000,
					"1332682737034854431": 7500,
					"1332692565761331293": 3000,
					"1332692463298543677": 1000,
					"1332692360332705925": 500,
					"1332680481036042240": 1
				}
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
						description: "These roles allow you to get notified when something happens.",
						roles: [
							{
								id: "1307298359651991583"
							}, {
								id: "1334918862822576159"
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
				formResultChannel: "1245813497288331338",
				w47k3r5Role: "1245812981527482378"
			}
		}
	},
	log: {
		active: true,
		url: "https://discord.com/api/webhooks/1332435148289085522/kfk0oZtoxPbEZDBeUw61Fxhw2ucIKr_kKk9fA2N9zqAzebkt1ocZasU7Sv6VQpKYndw_"
	}
};