/**
 * @type {import("../../types.d.ts").CommandsSettings}
 */
const commandsSettings = {
	giveaways: {
		channel: "1332713470193434635"
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
		firstOfTheMonthRole: "1351231320721723476",
		roles: {
			"1351231617045233704": 25000,
			"1351231916560355523": 15000,
			"1351231941403344947": 10000,
			"1351231959938109460": 5000,
			"1351232031790469276": 1
		}
	},
	roles: {
		channel: "1352217400379969576"
	},
	rules: {
		channel: "1243991489575522374"
	},
	tickets: {
		channel: "1340598588270579712"
	}
};

module.exports = commandsSettings;