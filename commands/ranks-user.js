const { ApplicationCommandType, ContextMenuCommandBuilder, MessageFlags } = require("discord.js");

const { Rank, getRank } = require("../lib/ranks.js");

const { displayTime } = require("../utils.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").UserCommand}
 */
module.exports = {
	name: "rank",
	type: ApplicationCommandType.User,
	data: new ContextMenuCommandBuilder()
		.setName("rank")
		.setType(ApplicationCommandType.User),
	execute: async (interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const rankSettings = settings.guilds?.[interaction.guildId]?.ranks;

		if (!rankSettings?.active) {
			interaction.log("Ranks disabled");
			return await interaction.reply({
				content: "Ranks are currently disabled",
				flags: MessageFlags.Ephemeral
			});
		}

		const rank = await getRank(interaction.guildId, interaction.targetId);
		await interaction.editReply({
			content: `Rank: ${rank.rankText}\n<@${interaction.targetId}> has ${rank.achievements.length == 0 ? "no" : (rank.achievements.length == 1 ? "one" : rank.achievements.length)} achievement${rank.achievements.length > 1 ? "s" : ""}, and ${rank.points == 0 ? "no" : (rank.points == 1 ? "one" : rank.points)} point${rank.points > 1 ? "s" : ""}.\n### Stats\n- Messages sent: ${rank.messages}\n- Time spent in voice channels: ${displayTime(rank.voice.time)}, in ${rank.voice.count} times\n- Time spent streaming in voice channels: ${displayTime(rank.voice.stream.time)}, in ${rank.voice.stream.count} times`,
			flags: MessageFlags.Ephemeral
		});
	}
};