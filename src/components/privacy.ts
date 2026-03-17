import {
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	type MessageComponentInteraction,
	MessageFlags,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from "discord.js";
import { Buffer } from "node:buffer";

import {
	client,
	type Component
} from "../lib/client.ts";
import type { Logger } from "../lib/logger.ts";
import type { User } from "../lib/user.ts";

const createUserStorageArchive = async (user: User): Promise<Uint8Array> => {
	await Deno.stat(user.path);

	const directory = await Deno.makeTempDir();
	const archivePath = `${directory}/U-${user.id}.zip`;

	try {
		const result = await new Deno.Command("zip", {
			args: ["-r", "-q", archivePath, "."],
			cwd: user.path,
			stdout: "piped",
			stderr: "piped"
		}).output();

		if (result.success) return await Deno.readFile(archivePath);

		throw new Error(
			new TextDecoder().decode(result.stderr)
			|| new TextDecoder().decode(result.stdout)
			|| "Failed to create ZIP archive"
		);
	} finally {
		await Deno.remove(directory, { recursive: true }).catch(() => { });
	}
};

export const component = {
	customId: "privacy",
	async execute(_logger: Logger, interaction: MessageComponentInteraction, ...options: string[]) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		switch (options[0]) {
			case "request": {
				if (interaction.isButton()) {
					const user = client.getUser(interaction.user.id)!;
					const attachmentName = `U-${interaction.user.id}.zip`;

					try {
						const archive = await createUserStorageArchive(user);

						await interaction.editReply({
							components: [
								new ContainerBuilder()
									.addTextDisplayComponents((component) => component
										.setContent(`# Data Request
You requested an archive of all the data we have stored about you.
Please find the archive attached below.`)
									)
									.addFileComponents((component) => component
										.setURL(`attachment://${attachmentName}`)
									)
									.addSeparatorComponents((component) => component
										.setSpacing(SeparatorSpacingSize.Large)
									)
									.addTextDisplayComponents((component) => component
										.setContent("If you only want to request or delete your data saved by the Application, use the button below.")
									)
									.addActionRowComponents((component) => component
										.addComponents([
											new ButtonBuilder()
												.setCustomId("privacy:request")
												.setLabel("Request my data")
												.setStyle(ButtonStyle.Primary),
											new ButtonBuilder()
												.setCustomId("privacy:delete")
												.setLabel("Delete my data")
												.setStyle(ButtonStyle.Danger)
										])
									)
									.addSeparatorComponents((component) => component
										.setSpacing(SeparatorSpacingSize.Large)
									)
									.addTextDisplayComponents((component) => component
										.setContent(`If you want to **delete** or **request all your data**, contact us at <privacy@wixonic.fr>.
We will process your request as soon as possible.
Please note that we may need to verify your identity before processing your request, and that we may need to keep some data for legal purposes.`)
									)
							],
							files: [
								new AttachmentBuilder(Buffer.from(archive), {
									name: attachmentName
								})
							],
							flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
						});
					} catch (error) {
						user.reportError("Failed to create user data archive", error);
						await interaction.editReply({
							content: "An error occurred while creating your data archive. Please try again later."
						});
					}
				} else {
					await interaction.deleteReply();
					throw new Error("Expected a button interaction");
				}
				break;
			}

			case "delete": {
				const user = client.getUser(interaction.user.id)!;

				switch (options[1]) {
					case "confirmation": {
						if (interaction.isStringSelectMenu()) {
							if (interaction.values.includes("delete")) {
								try {
									await user.delete();
									await interaction.editReply({
										components: [
											new ContainerBuilder()
												.addTextDisplayComponents((component) => component
													.setContent("Your data has been successfully deleted.")
												)
												.addSeparatorComponents((component) => component
													.setSpacing(SeparatorSpacingSize.Large)
												)
												.addTextDisplayComponents((component) => component
													.setContent("Keep in mind that interacting with the Application later will collect new data.")
												)
										],
										flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
									});
								} catch (error) {
									user.reportError("Failed to delete user data", error);
									await interaction.editReply({
										content: "An error occurred while deleting your data. Please try again later."
									});
								}
							} else {
								const privacyCommandId = await client.getCommandId("privacy");
								const privacyCommandText = privacyCommandId ? `</privacy:${privacyCommandId}>` : "`/privacy`";

								await interaction.editReply({
									components: [
										new ContainerBuilder()
											.addTextDisplayComponents((component) => component
												.setContent(`Your data deletion has been cancelled.
If you change your mind, you can request data deletion again running the ${privacyCommandText} command.`)
											)
									],
									flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
								});
							}
						} else {
							await interaction.deleteReply();
							throw new Error("Expected a string select menu interaction");
						}
						break;
					}

					default: {
						if (interaction.isButton()) {
							try {
								await interaction.editReply({
									components: [
										new ContainerBuilder()
											.addTextDisplayComponents((component) => component
												.setContent(`# Do you really want to delete your data?
This action is irreversible and will delete all the data we have stored about you.`)
											)
											.addSeparatorComponents((component) => component
												.setSpacing(SeparatorSpacingSize.Large)
											)
											.addTextDisplayComponents((component) => component
												.setContent("If you are sure about this action, please confirm by choosing an option in the dropdown below.")
											)
											.addActionRowComponents((component) => component
												.addComponents([
													new StringSelectMenuBuilder()
														.setCustomId("privacy:delete:confirmation")
														.setPlaceholder("Select an option")
														.setOptions(
															new StringSelectMenuOptionBuilder()
																.setLabel("Yes, DELETE my data forever")
																.setValue("delete"),
															new StringSelectMenuOptionBuilder()
																.setLabel("No, DO NOT delete my data")
																.setValue("cancel")
														)
												])
											)
									],
									flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
								});
							} catch (error) {
								user.reportError("Failed to send deletion confirmation", {
									cause: error
								});
								await interaction.editReply({
									content: "An error occurred while confirming your data deletion. Please try again later."
								});
							}
						} else {
							await interaction.deleteReply();
							throw new Error("Expected a button interaction");
						}
						break;
					}
				}

				break;
			}

			default: {
				await interaction.deleteReply();
				throw new Error("Unknown privacy action");
			}
		}
	}
} satisfies Component;