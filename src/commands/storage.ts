import {
	ActionRowBuilder,
	ApplicationIntegrationType,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
	Role,
	SlashCommandBuilder
} from "discord.js";

import { client, type Command } from "../lib/client.ts";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";
import {
	canUserDownload,
	createSlot,
	deleteFile,
	type FileRestriction,
	generateDownloadToken,
	getDeletionQueuePosition,
	getFile,
	getStorageConfig,
	getStorageStats,
	listUserAccessibleFiles
} from "../lib/storage.ts";
import { parseDuration } from "../lib/utils.ts";

export const command = {
	data: new SlashCommandBuilder()
		.setName("storage")
		.setDescription("Manage temporary file storage.")
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel
		])
		.addSubcommand((subcommand) => subcommand
			.setName("upload")
			.setDescription("Create a temporary file upload slot and get links.")
			.addStringOption((option) => option
				.setName("description")
				.setDescription("Optional description for the file.")
				.setRequired(false)
			)
			.addStringOption((option) => option
				.setName("expires_in")
				.setDescription("Expiration duration (e.g. 1d, 2h, 30m).")
				.setRequired(false)
			)
			.addIntegerOption((option) => option
				.setName("max_downloads")
				.setDescription("Maximum number of downloads allowed.")
				.setMinValue(1)
				.setRequired(false)
			)
			.addMentionableOption((option) => option
				.setName("restricted_to")
				.setDescription("Restrict access to a specific user or role.")
				.setRequired(false)
			)
			.addStringOption((option) => option
				.setName("key")
				.setDescription("Secret key required to download.")
				.setRequired(false)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("download")
			.setDescription("Get the download link for a file.")
			.addStringOption((option) => option
				.setName("file")
				.setDescription("The file ID to download.")
				.setRequired(true)
			)
			.addStringOption((option) => option
				.setName("key")
				.setDescription("Access key if the file is protected.")
				.setRequired(false)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("list")
			.setDescription("List files accessible to you with storage stats.")
		)
		.addSubcommand((subcommand) => subcommand
			.setName("delete")
			.setDescription("Delete a file you uploaded.")
			.addStringOption((option) => option
				.setName("file")
				.setDescription("The file ID to delete.")
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("stats")
			.setDescription("Display total storage occupancy and statistics.")
		),

	async execute(_logger, interaction) {
		const subcommand = interaction.options.getSubcommand(true);
		const { baseUrl, apiUrl } = getStorageConfig();

		if (subcommand === "upload") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const description = interaction.options.getString("description");
			const expiresInInput = interaction.options.getString("expires_in");
			const maxDownloads = interaction.options.getInteger("max_downloads");
			const mentionable = interaction.options.getMentionable("restricted_to");
			const secretKey = interaction.options.getString("key");

			let expiresIn: number | null = null;
			if (expiresInInput) {
				expiresIn = parseDuration(expiresInInput);
				if (!expiresIn) {
					await interaction.editReply({ content: "Invalid duration format. Use values like `1d`, `2h`, `30m`." });
					return;
				}
			}

			let restrictedTo: FileRestriction = null;
			if (mentionable) {
				if (mentionable instanceof Role) restrictedTo = { type: "role", id: mentionable.id };
				else if ("user" in mentionable && mentionable.user) restrictedTo = { type: "user", id: mentionable.user.id };
				else if ("id" in mentionable) restrictedTo = { type: "user", id: (mentionable as { id: string }).id };
			} else if (secretKey) restrictedTo = { type: "key", key: secretKey };

			const { file, uploadKey } = await createSlot({
				uploader: interaction.user.id,
				description,
				expiresIn,
				maxDownloads,
				restrictedTo
			});

			const uploadUrl = `${baseUrl}/files/upload/${file.id}?key=${uploadKey}`;
			const downloadUrl = `${baseUrl}/files/${file.id}`;

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Upload File")
					.setURL(uploadUrl),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Download Page")
					.setURL(downloadUrl)
			);

			const details: string[] = [
				`### Temporary File Slot Created`,
				`- **File ID**: \`${file.id}\``,
				`- **Access**: ${restrictedTo ? (restrictedTo.type === "key" ? "Protected by secret key" : restrictedTo.type === "role" ? `Restricted to <@&${restrictedTo.id}>` : `Restricted to <@${restrictedTo.id}>`) : "Public"}`
			];

			if (file.expiresAt) details.push(`- **Expires**: <t:${Math.floor(new Date(file.expiresAt).getTime() / 1000)}:R>`);
			if (file.maxDownloads) details.push(`- **Max Downloads**: ${file.maxDownloads}`);

			await interaction.editReply({ content: details.join("\n"), components: [row] });
			return;
		}

		if (subcommand === "download") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const fileId = interaction.options.getString("file", true).trim();
			const providedKey = interaction.options.getString("key") || undefined;

			const file = await getFile(fileId);
			if (!file) {
				await interaction.editReply({ content: "File not found, expired, or not yet uploaded." });
				return;
			}

			let memberRoleIds: string[] = [];
			if (interaction.guild && interaction.member && "roles" in interaction.member) {
				const roles = interaction.member.roles;
				if (Array.isArray(roles)) memberRoleIds = roles;
				else if ("cache" in roles) memberRoleIds = Array.from(roles.cache.keys());
			}

			if (!canUserDownload(file, interaction.user.id, memberRoleIds, providedKey)) {
				await interaction.editReply({ content: "You do not have permission to download this file, or the access key is incorrect." });
				return;
			}

			let downloadUrl = `${baseUrl}/files/download/${file.id}`;
			let directApiUrl = `${apiUrl}/${file.id}/download`;

			if (file.restrictedTo !== null) {
				if (file.restrictedTo.type === "key") {
					if (providedKey) {
						downloadUrl = `${baseUrl}/files/download/${file.id}?key=${providedKey}`;
						directApiUrl = `${apiUrl}/${file.id}/download?key=${providedKey}`;
					}
				} else {
					const token = await generateDownloadToken(file.id);
					if (token) {
						downloadUrl = `${baseUrl}/files/download/${file.id}?key=${token}`;
						directApiUrl = `${apiUrl}/${file.id}/download?key=${token}`;
					}
				}
			}

			const fifoPosition = await getDeletionQueuePosition(file.id);
			const uploaderUser = await client.getUser(file.uploader);

			const cardBuffer = await generateRichPicture({
				type: RichPictureType.StorageFile,
				data: {
					name: file.name,
					mimeType: file.mimeType,
					size: file.size,
					fifoPosition,
					uploader: uploaderUser ? {
						username: uploaderUser.username,
						displayName: uploaderUser.displayName,
						avatarUrl: uploaderUser.avatar("webp", 256, false),
						avatarDecorationUrl: uploaderUser.avatarDecoration(false) ?? undefined,
						displayNameStyle: await uploaderUser.displayNameStyle()
					} : undefined
				}
			});

			const attachment = new AttachmentBuilder(cardBuffer, { name: "storage-file.webp" });

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Download Page")
					.setURL(downloadUrl),
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Direct Download")
					.setURL(directApiUrl)
			);

			await interaction.editReply({
				content: "-# This file has been uploaded by a user and has not been verified.",
				files: [attachment],
				components: [row]
			});
			return;
		}

		if (subcommand === "list") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			let memberRoleIds: string[] = [];
			if (interaction.guild && interaction.member && "roles" in interaction.member) {
				const roles = interaction.member.roles;
				if (Array.isArray(roles)) memberRoleIds = roles;
				else if ("cache" in roles) memberRoleIds = Array.from(roles.cache.keys());
			}

			const files = await listUserAccessibleFiles(interaction.user.id, memberRoleIds);
			const stats = await getStorageStats();

			const statsBuffer = await generateRichPicture({
				type: RichPictureType.StorageStats,
				data: {
					usedSize: stats.usedSize,
					maxCapacity: stats.maxCapacity,
					totalFiles: stats.totalFiles
				}
			});

			const attachment = new AttachmentBuilder(statsBuffer, { name: "storage-stats.webp" });
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Open Storage")
					.setURL(baseUrl)
			);

			let content: string | undefined = undefined;

			if (files.length > 0) {
				const lines = files.slice(0, 15).map((f) => `- \`${f.id}\`: [${f.name}](<${baseUrl}/files/${f.id}>)\n-# ${f.mimeType}${f.description ? ` • ${f.description}` : ""}`);
				if (files.length > 15) lines.push(`*...and ${files.length - 15} more files.*`);
				content = lines.join("\n");
			}

			await interaction.editReply({ content, files: [attachment], components: [row] });
			return;
		}

		if (subcommand === "delete") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const fileId = interaction.options.getString("file", true).trim();
			const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;

			const success = await deleteFile(fileId, interaction.user.id, isAdmin);
			if (success) await interaction.editReply({ content: `File \`${fileId}\` has been deleted.` });
			else await interaction.editReply({ content: "Failed to delete file. It might not exist or you lack permission to delete it." });
			return;
		}

		if (subcommand === "stats") {
			await interaction.deferReply();

			const stats = await getStorageStats();

			const statsBuffer = await generateRichPicture({
				type: RichPictureType.StorageStats,
				data: {
					usedSize: stats.usedSize,
					maxCapacity: stats.maxCapacity,
					totalFiles: stats.totalFiles
				}
			});

			const attachment = new AttachmentBuilder(statsBuffer, { name: "storage-stats.webp" });
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Open Storage")
					.setURL(baseUrl)
			);

			await interaction.editReply({ files: [attachment], components: [row] });
			return;
		}
	}
} satisfies Command<ChatInputCommandInteraction>;