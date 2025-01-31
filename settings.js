const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

module.exports = process.env.DEV == "true" ? {
	guilds: {
		"1243943943779909652": {
			giveaways: {
				active: true
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
				achievements: [{
					id: "first-message",
					name: "First!",
					description: "You sent your first message!",
					points: 10,
					condition: (userRank) => userRank.messages > 0
				}, {
					id: "10-messages",
					name: "Tenfold improvement",
					description: "You sent 10 messages!",
					points: 20,
					condition: (userRank) => userRank.messages >= 10
				}, {
					id: "25-messages",
					name: "Talking 25/8",
					description: "You sent 25 messages!",
					points: 70,
					condition: (userRank) => userRank.messages >= 25
				}, {
					id: "100-messages",
					name: "Keeping it 100",
					description: "You sent 100 messages!",
					points: 100,
					condition: (userRank) => userRank.messages >= 100
				}, {
					id: "500-messages",
					name: "500 shades of speech!",
					description: "You sent 500 messages!",
					points: 300,
					condition: (userRank) => userRank.messages >= 500
				}, {
					id: "1000-messages",
					name: "Words worth a thousand pictures",
					description: "You sent 1000 messages!",
					points: 500,
					condition: (userRank) => userRank.messages >= 1000
				}, {
					id: "5000-messages",
					name: "Why?",
					description: "You sent 5000 messages!",
					points: 1500,
					condition: (userRank) => userRank.messages >= 5000
				}, {
					id: "first-vocal",
					name: "First! - Season 2",
					description: "Join a voice channel for the first time!",
					points: 20,
					condition: (userRank) => userRank.voice.count > 0
				}, {
					id: "30min-vocal",
					name: "Voice Module Activated",
					description: "You spent 30 minutes in a voice channel!",
					points: 30,
					condition: (userRank) => userRank.voice.time > 30 * 60
				}, {
					id: "1h-vocal",
					name: "One-Minute Wonder",
					description: "You spent an hour in a voice channel!",
					points: 50,
					condition: (userRank) => userRank.voice.time > 60 * 60
				}, {
					id: "5h-vocal",
					name: "5-Hour Circuit",
					description: "You spent 5 hours in a voice channel!",
					points: 100,
					condition: (userRank) => userRank.voice.time > 5 * 60 * 60
				}, {
					id: "1d-vocal",
					name: "24-Hour Relay",
					description: "You spent an entire day in a voice channel!",
					points: 300,
					condition: (userRank) => userRank.voice.time > 24 * 60 * 60
				}, {
					id: "7d-vocal",
					name: "Non-Stop Frequency",
					description: "You spent an entire week in a voice channel!",
					points: 500,
					condition: (userRank) => userRank.voice.time > 7 * 24 * 60 * 60
				}, {
					id: "30d-vocal",
					name: "Why? - Season 2",
					description: "You spent an entire month in a voice channel!",
					points: 1000,
					condition: (userRank) => userRank.voice.time > 30 * 24 * 60 * 60
				}, {
					id: "first-stream",
					name: "First! - Season 3",
					description: "You streamed for the first time!",
					points: 25,
					condition: (userRank) => userRank.voice.stream.count > 0
				}, {
					id: "30min-stream",
					name: "Waveform Pioneer",
					description: "You streamed 30 minutes in a voice channel!",
					points: 75,
					condition: (userRank) => userRank.voice.stream.time > 30 * 60
				}, {
					id: "1h-stream",
					name: "One Hour in the Spotlight",
					description: "You streamed an hour in a voice channel!",
					points: 100,
					condition: (userRank) => userRank.voice.stream.time > 60 * 60
				}, {
					id: "5h-stream",
					name: "Endless Broadcast",
					description: "You streamed 5 hours in a voice channel!",
					points: 300,
					condition: (userRank) => userRank.voice.stream.time > 5 * 60 * 60
				}, {
					id: "1d-stream",
					name: "Live Channel",
					description: "You streamed an entire day in a voice channel!",
					points: 500,
					condition: (userRank) => userRank.voice.stream.time > 24 * 60 * 60
				}, {
					id: "7d-stream",
					name: "Global Signal",
					description: "You streamed an entire week in a voice channel!",
					points: 1000,
					condition: (userRank) => userRank.voice.stream.time > 7 * 24 * 60 * 60
				}],
				roles: []
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
				achievements: [{
					id: "first-message",
					name: "First!",
					description: "You sent your first message!",
					points: 10,
					condition: (userRank) => userRank.messages > 0
				}, {
					id: "10-messages",
					name: "Tenfold improvement",
					description: "You sent 10 messages!",
					points: 20,
					condition: (userRank) => userRank.messages >= 10
				}, {
					id: "25-messages",
					name: "Talking 25/8",
					description: "You sent 25 messages!",
					points: 70,
					condition: (userRank) => userRank.messages >= 25
				}, {
					id: "100-messages",
					name: "Keeping it 100",
					description: "You sent 100 messages!",
					points: 100,
					condition: (userRank) => userRank.messages >= 100
				}, {
					id: "500-messages",
					name: "500 shades of speech!",
					description: "You sent 500 messages!",
					points: 300,
					condition: (userRank) => userRank.messages >= 500
				}, {
					id: "1000-messages",
					name: "Words worth a thousand pictures",
					description: "You sent 1000 messages!",
					points: 500,
					condition: (userRank) => userRank.messages >= 1000
				}, {
					id: "5000-messages",
					name: "Why?",
					description: "You sent 5000 messages!",
					points: 1500,
					condition: (userRank) => userRank.messages >= 5000
				}, {
					id: "first-vocal",
					name: "First! - Season 2",
					description: "Join a voice channel for the first time!",
					points: 20,
					condition: (userRank) => userRank.voice.count > 0
				}, {
					id: "30min-vocal",
					name: "Voice Module Activated",
					description: "You spent 30 minutes in a voice channel!",
					points: 30,
					condition: (userRank) => userRank.voice.time > 30 * 60
				}, {
					id: "1h-vocal",
					name: "One-Minute Wonder",
					description: "You spent an hour in a voice channel!",
					points: 50,
					condition: (userRank) => userRank.voice.time > 60 * 60
				}, {
					id: "5h-vocal",
					name: "5-Hour Circuit",
					description: "You spent 5 hours in a voice channel!",
					points: 100,
					condition: (userRank) => userRank.voice.time > 5 * 60 * 60
				}, {
					id: "1d-vocal",
					name: "24-Hour Relay",
					description: "You spent an entire day in a voice channel!",
					points: 300,
					condition: (userRank) => userRank.voice.time > 24 * 60 * 60
				}, {
					id: "7d-vocal",
					name: "Non-Stop Frequency",
					description: "You spent an entire week in a voice channel!",
					points: 500,
					condition: (userRank) => userRank.voice.time > 7 * 24 * 60 * 60
				}, {
					id: "30d-vocal",
					name: "Why? - Season 2",
					description: "You spent an entire month in a voice channel!",
					points: 1000,
					condition: (userRank) => userRank.voice.time > 30 * 24 * 60 * 60
				}, {
					id: "first-stream",
					name: "First! - Season 3",
					description: "You streamed for the first time!",
					points: 25,
					condition: (userRank) => userRank.voice.stream.count > 0
				}, {
					id: "30min-stream",
					name: "Waveform Pioneer",
					description: "You streamed 30 minutes in a voice channel!",
					points: 75,
					condition: (userRank) => userRank.voice.stream.time > 30 * 60
				}, {
					id: "1h-stream",
					name: "One Hour in the Spotlight",
					description: "You streamed an hour in a voice channel!",
					points: 100,
					condition: (userRank) => userRank.voice.stream.time > 60 * 60
				}, {
					id: "5h-stream",
					name: "Endless Broadcast",
					description: "You streamed 5 hours in a voice channel!",
					points: 300,
					condition: (userRank) => userRank.voice.stream.time > 5 * 60 * 60
				}, {
					id: "1d-stream",
					name: "Live Channel",
					description: "You streamed an entire day in a voice channel!",
					points: 500,
					condition: (userRank) => userRank.voice.stream.time > 24 * 60 * 60
				}, {
					id: "7d-stream",
					name: "Global Signal",
					description: "You streamed an entire week in a voice channel!",
					points: 1000,
					condition: (userRank) => userRank.voice.stream.time > 7 * 24 * 60 * 60
				}],
				roles: [{
					id: "1332680481036042240",
					description: "Won at least a point.",
					condition: (userRank) => userRank.points > 0 && userRank.points < 100
				}, {
					id: "1332692360332705925",
					description: "Won at least 100 points.",
					condition: (userRank) => userRank.points >= 100 && userRank.points < 500
				}, {
					id: "1332692463298543677",
					description: "Won at least 500 points.",
					condition: (userRank) => userRank.points >= 500 && userRank.points < 1000
				}, {
					id: "1332692565761331293",
					description: "Won at least 1000 points.",
					condition: (userRank) => userRank.points >= 1000 && userRank.points < 3000
				}, {
					id: "1332682737034854431",
					description: "Won at least 5000 points.",
					condition: (userRank) => userRank.points >= 5000 && userRank.points < 10000
				}, {
					id: "1332696028989755464",
					description: "Won at least 10000 points.",
					condition: (userRank) => userRank.points >= 10000
				}]
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