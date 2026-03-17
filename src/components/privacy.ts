import { AttachmentBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, MessageFlags, SeparatorSpacingSize, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { Buffer } from "node:buffer";

import type { Component } from "../lib/client.ts";
import type { User } from "../lib/user.ts";

const createUserStorageArchive = async (user: User): Promise<Uint8Array> => {
	try {
		await Deno.stat(user.path);
	} catch (error) {
		throw error;
	}

	const directory = await Deno.makeTempDir();
	const archivePath = `${directory}/U-${user.id}.zip`;

	try {
		const result = await new Deno.Command("zip", {
			args: ["-r", "-q", archivePath, "."],
			cwd: user.path,
			stdout: "piped",
			stderr: "piped"
		}).output();

		if (!result.success) throw new Error(new TextDecoder().decode(result.stderr) || new TextDecoder().decode(result.stdout) || "Failed to create ZIP archive");

		return await Deno.readFile(archivePath);
	} finally {
		await Deno.remove(directory, { recursive: true }).catch(() => { });
	}
};

export const component = {
	customId: "privacy",
	async execute(_logger, client, interaction, ...options) {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral
		});

		const stop = async (error: Error) => {
			await interaction.deleteReply();
			throw error;
		};

		switch (options[0]) {
			case "request": {
				if (!interaction.isButton()) return await stop(new Error("Expected a button interaction"));

				const user = client.getUser(interaction.user.id)!;

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
									.setURL(`attachment://U-${interaction.user.id}.zip`)
								)
								.addSeparatorComponents((component) => component
									.setSpacing(SeparatorSpacingSize.Large)
								)
								.addTextDisplayComponents((component) => component
									.setContent(`
If you only want to request or delete your data saved by the Application, use the button below.`)
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
								name: `U-${interaction.user.id}.zip`
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
				break;
			}

			case "delete": {
				const user = client.getUser(interaction.user.id)!;

				switch (options[1]) {
					case "confirmation": {
						if (!interaction.isStringSelectMenu()) return await stop(new Error("Expected a string select menu interaction"));

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

							await interaction.editReply({
								components: [
									new ContainerBuilder()
										.addTextDisplayComponents((component) => component
											.setContent(`Your data deletion has been cancelled.
If you change your mind, you can request data deletion again running the </privacy:${privacyCommandId}> command.`)
										)
								],
								flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
							});
						}
						break;
					}

					default: {
						if (!interaction.isButton()) return await stop(new Error("Expected a button interaction"));

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
						break;
					}
				}
				break;
			}

			default: {
				await stop(new Error("Unknown privacy action"));
				break;
			}
		}
	}
} satisfies Component;