const { ApplicationCommandType, MessageFlags, PermissionFlagsBits } = require("discord.js");
const { exec } = require("child_process");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Update",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "update",
		description: "Pull the latest changes from Git",
		default_member_permissions: PermissionFlagsBits.Administrator.toString()
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		exec("git pull", async (error, stdout, stderr) => {
			if (error) {
				await interaction.followUp(`Error: \`\`\`${error.message}\`\`\``);
				return;
			}

			let message = "";
			if (stdout) message += `**Stdout:**\n\`\`\`${stdout}\`\`\`\n`;
			if (stderr) message += `**Stderr:**\n\`\`\`${stderr}\`\`\`\n`;

			if (message.length > 2000) message = message.substring(0, 1997) + "...";
			if (message.length === 0) message = "No output.";

			await interaction.followUp(message);
		});
	}
};

module.exports = info;