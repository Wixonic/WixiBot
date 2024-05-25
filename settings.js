module.exports = {
	guilds: {
		"1020663521530351627": {
			allowedCommands: [],
			roles: {
				active: false,
				channel: "1244017962843897936"
			},
			rules: {
				active: false,
				channel: "1020684346098733138"
			}
		},

		"1243943943779909652": {
			allowedCommands: [
				"echo"
			],
			roles: {
				active: true,
				groups: [
					{
						name: "Group A",
						description: "This is the group A",
						roles: {
							"1244016782822346832": {
								description: "You're an A"
							}
						}
					}, {
						name: "Group B",
						description: "This is the group B",
						roles: {
							"1244016807040516289": {
								description: "You're a B"
							}
						}
					}, {
						name: "Group C",
						description: "This is the group C",
						roles: {
							"1244016823683387553": {
								description: "You're a C part 1"
							},
							"1244016841563705345": {
								description: "You're a C part 2"
							}
						}
					}, {
						name: "Group D",
						description: "This is the group D",
						roles: {
							"1244016869887971380": {
								description: "You're a D and D is locked with a modal"
							}
						}
					}
				],
				channel: "1244016413501558815"
			},
			rules: {
				active: true,
				channel: "1243991489575522374"
			}
		}
	}
};