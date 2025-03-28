module.exports = {
	categories: [
		{
			id: "notifications",
			name: "Notifications",
			description: "Notifications for event updates and important alerts."
		},
		{
			id: "supporters",
			name: "Supporters",
			description: "Roles for supporters and patrons with exclusive benefits."
		}
	],
	roles: [
		{
			id: "1307298359651991583",
			description: "Receive notifications about upcoming events.",
			category: "notifications"
		},
		{
			id: "1334918862822576159",
			description: "Stay updated on giveaways and contests.",
			category: "notifications"
		},
		{
			id: "1337540682700558489",
			description: "Tier 2 perks + exclusive voting rights and fan requests.",
			category: "supporters",
			requirements: "To access this role, you must be a Tier 3 subscriber on Patreon.\n[Subscribe now](<https://go.wixonic.fr/patreon>) and make sure your Discord account is linked to your Patreon."
		},
		{
			id: "1337533770273652736",
			description: "Tier 1 perks + early access, sneak peeks and behind the scenes.",
			category: "supporters",
			requirements: "To access this role, you must be a Tier 2 subscriber on Patreon.\n[Subscribe now](<https://go.wixonic.fr/patreon>) and make sure your Discord account is linked to your Patreon."
		},
		{
			id: "1327627362946388030",
			description: "Exclusive events, news, and private chat with other subscribers.",
			category: "supporters",
			requirements: "To access this role, you must be a Tier 1 subscriber on Patreon.\n[Subscribe now](<https://go.wixonic.fr/patreon>) and make sure your Discord account is linked to your Patreon."
		},
		{
			id: "1040743271288295436",
			description: "Boost the server for special privileges, equivalent to a Tier 2 Patreon subscription.",
			category: "supporters",
			requirements: "To get access to this role, you need to [boost this server](<https://support.discord.com/hc/articles/360028038352>)."
		}
	],
	recurrentRoles: {
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
			},
			{
				name: "Valentine's Day",
				color: "#E06287",
				from: "02-14T00:00:00",
				to: "02-21T23:59:59"
			},
			{
				name: "Easter",
				color: "#C5EBD5",
				from: "03-23T00:00:00",
				to: "04-25T23:59:59"
			},
			{
				name: "Summer",
				color: "#47927E",
				from: "06-01T00:00:00",
				to: "08-31T23:59:59"
			},
			{
				name: "Halloween",
				color: "#EB5A1C",
				from: "10-30T00:00:00",
				to: "11-06T23:59:59"
			},
			{
				name: "Christmas",
				color: "#B43B2B",
				from: "12-24T00:00:00",
				to: "12-31T23:59:59"
			}
		]
	}
};