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
			id: "1355256781768491018",
			description: "Receive notifications about upcoming events.",
			category: "notifications"
		},
		{
			id: "1355256813582553253",
			description: "Stay updated on giveaways and contests.",
			category: "notifications"
		},
		{
			id: "1351231320721723476",
			description: "This is a test, this role is not available here.",
			category: "supporters",
			requirements: "This is a test, this role is not available here."
		}
	],
	recurrentRoles: [
		{
			name: "New Year",
			color: "#B19128",
			from: "01-01T00:00:00",
			to: "01-14T23:59:59"
		},
		{
			name: "Valentine's Day",
			color: "#E06287",
			from: "02-14T00:00:00",
			to: "02-21T23:59:59"
		},
		{
			name: "Easter",
			color: "#98B8A5",
			from: "04-01T00:00:00",
			to: "04-07T23:59:59"
		},
		{
			name: "Summer",
			color: "#47927E",
			from: "08-01T00:00:00",
			to: "08-14T23:59:59"
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
};