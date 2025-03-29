/**
 * @type {import("../../types.d.ts").CommandsSettings}
 */
const commandsSettings = {
	giveaways: {
		channel: "1333864397931675740"
	},
	ranks: {
		channel: "1333782941095956541",
		ignored: [
			"1020454688467980308" // wixonic
		],
		points: {
			messages: 5,
			voice: 3 / 60
		},
		firstOfTheMonthRole: "1352032949360525397",
		roles: {
			"1352048096485310525": 25000,
			"1352048564972294236": 15000,
			"1352048605933994055": 10000,
			"1352048583746256947": 5000,
			"1352048580025913435": 1
		}
	},
	roles: {
		channel: "1244017962843897936",
		cosmeticMarkerRole: "1324669613480349729",
		oldMarkerRole: "1324669679532380190",
		mentionRole: "1307298359651991583"
	},
	rules: {
		channel: "1020684346098733138"
	},
	tickets: {
		channel: "1247276648366080144"
	}
};

module.exports = commandsSettings;