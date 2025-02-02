const { getRank } = require("../lib/ranks.js");

module.exports = async (log, oldState, newState) => {
	if (!oldState.channel && newState.channel) {
		log(`User "${newState.member.user.username}" (${newState.member.user.id}) joined channel "${newState.channel.name}" (${newState.channel.id}), in guild "${newState.guild.name}" (${newState.guild.id})`);

		if (!newState.member.user.bot) {
			const rank = await getRank(newState.guild.id, newState.member.id);
			await rank.joinedVoice();
		}
	} else if (oldState.channel && !newState.channel) {
		log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) left channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

		if (!oldState.member.user.bot) {
			const rank = await getRank(oldState.guild.id, oldState.member.id);
			await rank.leftVoice();

			if (rank.voice.stream.startedAt) {
				log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) stopped streaming in channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

				await rank.stoppedStreaming();
			}
		}
	}

	if (newState.channel && !oldState.streaming && newState.streaming) {
		log(`User "${newState.member.user.username}" (${newState.member.user.id}) started streaming in channel "${newState.channel.name}" (${newState.channel.id}), in guild "${newState.guild.name}" (${newState.guild.id})`);

		if (!newState.member.user.bot) {
			const rank = await getRank(newState.guild.id, newState.member.id);
			await rank.startedStreaming();
		}
	} else if (oldState.channel && oldState.streaming && !newState.streaming) {
		log(`User "${oldState.member.user.username}" (${oldState.member.user.id}) stopped streaming in channel "${oldState.channel.name}" (${oldState.channel.id}), in guild "${oldState.guild.name}" (${oldState.guild.id})`);

		if (!oldState.member.user.bot) {
			const rank = await getRank(oldState.guild.id, oldState.member.id);
			await rank.stoppedStreaming();
		}
	}
};