/**
 * @type {import("../../types.d.ts").CommandsSettings}
 */
const commandsSettings = {
	rank: {
		channel: "1333782941095956541",
		defaultTextChannel: "1179535918277865614",
		ignored: [
			"1020454688467980308" // wixonic
		],
		points: {
			messages: 5,
			voice: 3 / 60
		},
		firstOfTheMonthRole: "1352032949360525397",
		roles: {}
	},
	ticket: {
		channel: "1247276648366080144"
	},
	rules: {
		channel: "1020684346098733138"
	}
};

module.exports = commandsSettings;