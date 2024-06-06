const { ApplicationCommandType, SlashCommandBuilder } = require("discord.js");

const settings = require("../settings.js");

/**
 * @type {import("../commands.js").ChatCommand}
 */
module.exports = {
	name: "help",
	type: ApplicationCommandType.ChatInput,
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Do you need help with something?"),
	execute: async (interaction) => {
		const guildSettings = settings?.guilds?.[interaction.guildId];

		if (!guildSettings?.help?.active) {
			interaction.log("Help disabled");
			return await interaction.reply({
				content: "Help is currently disabled",
				ephemeral: true
			});
		}

		await interaction.reply({
			content: `If you have a question, please open a ticket at <#${guildSettings?.ticket?.channel}>.\nIf you want to customize your roles, please follow instructions at <#${guildSettings?.roles?.channel}>.\nIf you want to see all available [commands](<https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord#h_01HRQSA6C85Z6CA9CF10DPRX1Q>), start your message with \`/\` and search for <@${interaction.client.user.id}>. You can also right-click a message/member to display [user and message commands](<https://support.discord.com/hc/en-us/articles/21334461140375-Using-Apps-on-Discord#h_01HRQSA6C8MGJ2F3G3GEQTQ36P>).`,
			ephemeral: true
		});

		interaction.log("Help sent");
	}
};