let members = [];

/**
 * @param {import("@wixonic/logger").Logger} logger
 * @param {import("../../../../types.d.ts").MainSettings} settings
 * @param {import("../../../../lib/bot.js")} bot
 * @param {import("../../../../lib/rpc.js")} rpc
 * @param {import("../../../../lib/sdk.js")} sdk
 */
let init = async (logger, settings, bot, rpc, sdk) => {
	/**
	 * 
	 * @param {import("discord.js-selfbot-v13").VoiceState} state
	 */
	const processState = async (state) => {
		if (state) {
			members = [];

			/** @type {import("discord.js-selfbot-v13").VoiceBasedChannel?} */
			const channel = state.channel;

			if (channel) {
				// await sdk.subscribeTo(state.channel.id);

				for (const member of channel.members.values()) {
					if (member.user.id != rpc.client.user.id) {
						members.push({
							displayName: member.user.displayName
						});
					}
				}
			}
		}
	};

	await processState(rpc.client.user.voice);

	rpc.client.on("voiceStateUpdate", async (_, state) => await processState());
};

/**
 * @type {import("../../../../types.d.ts").HandlerInfo}
 */
const info = {
	path: "/obs/widgets/voice/",
	handlers: {
		get: async (logger, settings, req, res, bot, rpc, sdk) => {
			const text = [];

			for (const member of members) text.push(`- <span style="color: #888;">${member.deaf ? "" : (member.mute ? "" : "")}</span> <span${member.talking ? ` style="color: #54FF54;"` : ""}>${member.displayName}</span>`);

			res.status(200).send(text.join("-"));
		}
	},
	loop: {
		delay: 1 * 1000,
		process: async (logger, settings, bot, rpc, sdk) => {
			if (init) {
				await init(logger, settings, bot, rpc, sdk);
				init = null;
			}
		}
	}
};

module.exports = info;