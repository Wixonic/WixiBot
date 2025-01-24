const { Client } = require("discord.js-selfbot-v13");

const { clone, wait } = require("../utils.js");

const { BaseObject } = require("./base.js");

const config = require("../config.js");

let ready = false;

/**
 * @typedef {(import("discord.js-selfbot-v13").ActivitiesOptions | import("discord.js-selfbot-v13").RichPresence | import("discord.js-selfbot-v13").SpotifyRPC | import("discord.js-selfbot-v13").CustomStatus) | {level: number}} Activity
 */

class ClientManager extends BaseObject {
	/**
	 * @type {Object<string, Activity>}
	 */
	activities = {};

	/**
	 * @type {Client?}
	 */
	client = null;

	async ready() {
		while (!ready) {
			await wait(0.1);
		}

		return true;
	};

	/**
	 * @param {string} id
	 * @param {Activity} activity
	 */
	addActivity(id, activity) {
		clearTimeout(this.activities[id]?.keepAliveId);

		if (this.activities[id] != activity) {
			this.activities[id] = activity;
			this.updateActivity();
		}
	};

	/**
	 * @param {string} id
	 * @param {boolean?} fromKeepAlive
	 */
	removeActivity(id, fromKeepAlive = false) {
		clearTimeout(this.activities[id]?.keepAliveId);

		delete this.activities[id];
		this.updateActivity();
		if (fromKeepAlive) this.log(`${id} deleted by Keep-Alive.`);
	};

	async updateActivity() {
		/**
		* @type {Activity[]}
		*/
		const activities = Object.values(clone(this.activities));
		activities.sort((activityA, activityB) => (activityB.level ?? 0) - (activityA.level ?? 0));

		while (!this.client.isReady()) await wait(0.1);

		this.client.user.setPresence({
			activities,
			afk: true,
			status: Object.values(this.activities).length > 0 ? "idle" : "invisible"
		});
	};

	constructor() {
		super();

		this.activities = {};

		this.client = new Client({
			presence: {
				afk: true,
				status: "idle"
			}
		});

		this.client.on("ready", () => {
			this.log(`Logged in as ${this.client.user?.username ?? "unknown"}.`);
			this.updateActivity();

			ready = true;
		});

		this.client.on("error", (error) => this.log(`An error occured: ${error}`));

		this.client.login(config.discord.token);

		process.on("SIGINT", async () => {
			this.client.destroy();
			this.log("Logged out.");
			process.exit(0);
		});
	};
};

module.exports = new ClientManager();