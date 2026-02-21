const { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getStorage } = require("../lib/storage.js");

/**
 * @type {import("../types.d.ts").CommandInfo}
 */
const info = {
	name: "Storage",
	deploy: {
		type: ApplicationCommandType.ChatInput,
		name: "storage",
		description: "Ephemeral storage management",
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "space",
				description: "Displays available disk space"
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "new",
				description: "Generates a unique link to upload a file",
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "delete",
				description: "Manually deletes a storage link",
				options: [
					{
						type: ApplicationCommandOptionType.String,
						name: "id",
						description: "The storage ID",
						required: true
					}
				]
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "list",
				description: "Lists all active ephemeral storages"
			}
		]
	},

	/**
	 * @param {import("discord.js").CommandInteraction} interaction
	 */
	run: async (logger, bot, server, interaction) => {
		const subcommand = interaction.options.getSubcommand();
		const api = getStorage(bot.settings);

		if (subcommand === "space") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			try {
				const output = execSync("df -hl /").toString();
				const lines = output.split("\n");
				const dataLine = lines[1].replace(/\s+/g, " ").split(" ");

				const avail = dataLine[3];

				const content = (avail.includes("G") && parseInt(avail) < 50)
					? `Disk Space Available: **${avail}**\nWarning: Less than 50 GB remaining.`
					: `Disk Space Available: **${avail}**`;

				await interaction.followUp({ content });
			} catch (err) {
				logger.error("Failed to check disk space", err);
				await interaction.followUp({ content: "Unable to verify disk space." });
			}
		}

		else if (subcommand === "new") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const id = crypto.randomBytes(4).toString("hex");
			const db = api.read();

			db[id] = {
				id,
				author: interaction.user.id,
				createdAt: Date.now(),
				expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
				filename: null,
				uploaded: false
			};

			api.write(db);

			const url = `${server.settings.website.storage}/${id}/`;

			const content = `**Ephemeral Storage Link**\nHere is your unique link to send a file. It will remain **valid for 1 hour** after upload.\n\n-# ID: \`${id}\``;

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setLabel("Access page")
					.setStyle(ButtonStyle.Link)
					.setURL(url),
				new ButtonBuilder()
					.setCustomId(`deleteStorage_${id}`)
					.setLabel("Delete completely")
					.setStyle(ButtonStyle.Danger)
			);

			await interaction.followUp({ content, components: [row] });
		}

		else if (subcommand === "delete") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const id = interaction.options.getString("id");
			const db = api.read();

			if (!db[id]) {
				return await interaction.followUp({ content: `This ID does not exist or the file has already been deleted. If this is an issue, contact the staff via the <#${server.settings.application.ticketChannel}> channel.` });
			}

			const isAuthor = db[id].author === interaction.user.id;
			const isMod = interaction.member.roles.cache.has(server.settings.application.ticketChannel) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

			if (!isAuthor && !isMod) {
				return await interaction.followUp({ content: `You do not have permission to delete this file. If this is an issue, contact the staff via the <#${server.settings.application.ticketChannel}> channel.` });
			}

			if (db[id].filename) {
				const filePath = path.join(api.storagePath, id);
				if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
			}

			delete db[id];
			api.write(db);

			await interaction.followUp({ content: `Storage \`${id}\` has been deleted successfully.` });
		}

		else if (subcommand === "list") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const isMod = interaction.member.roles.cache.has(server.settings.application.ticketChannel) || interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

			const db = api.read();
			const activeIds = isMod ? Object.keys(db) : Object.keys(db).filter((id) => db[id].author === interaction.user.id);

			if (activeIds.length === 0) {
				return await interaction.followUp({ content: "No active ephemeral storage found." });
			}

			let description = isMod ? "**All Active Ephemeral Storages**\n" : "**Your Active Ephemeral Storages**\n";
			for (const id of activeIds) {
				const entry = db[id];
				const timeLeft = Math.max(0, Math.floor((entry.expiresAt - Date.now()) / 1000 / 60));
				description += `\`${id}\` - ${isMod ? `<@${entry.author}> - ` : ""}Uploaded: ${entry.uploaded ? "Yes" : "No"} - Expires in ${timeLeft}m\n`;
			}

			await interaction.followUp({ content: description });
		}
	}
};

module.exports = info;