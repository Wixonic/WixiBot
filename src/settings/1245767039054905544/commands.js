/**
 * @type {import("../../types.d.ts").CommandsSettings}
 */
const commandsSettings = {
	giveaways: {
		channel: "1332713470193434635",
		role: "1355256813582553253"
	},
	privateChannels: {
		channels: {
			"1390664190137733142": "1389710654923079720"
		}
	},
	ranks: {
		channel: "1332713470193434635",
		ignored: [
			"1020454688467980308" // wixonic
		],
		points: {
			messages: 5,
			voice: 3 / 60
		},
		eliteOfTheMonthRole: "1351231320721723476",
		roles: {
			"1351232031790469276": 1
		}
	},
	roles: {
		channel: "1352217400379969576",
		cosmeticMarkerRole: "1324676103473860679",
		oldMarkerRole: "1324676172537135145",
		mentionChannel: "1243943943779909655",
		mentionRole: "1355256781768491018"
	},
	rules: {
		channel: "1243991489575522374"
	},
	tickets: {
		buttonChannel: "1340598588270579712",
		category: "1248343045062135899",
		channel: "1243991489575522375"
	}
};

module.exports = commandsSettings;