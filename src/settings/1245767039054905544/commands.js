/**
 * @type {import("../../types.d.ts").CommandsSettings}
 */
const commandsSettings = {
	rank: {
		channel: "1332713470193434635",
		defaultTextChannel: "1243943943779909655",
		ignored: [
			"1020454688467980308" // wixonic
		],
		points: {
			messages: 5,
			voice: 3 / 60
		},
		firstOfTheMonthRole: "1351231320721723476",
		roles: {
			"1351231617045233704": 10000,
			"1351231916560355523": 5000,
			"1351231941403344947": 3000,
			"1351231959938109460": 2000,
			"1351231980393594940": 1000,
			"1351232031790469276": 500
		}
	},
	ticket: {
		channel: "1340598588270579712"
	},
	rules: {
		channel: "1243991489575522374"
	}
};

module.exports = commandsSettings;