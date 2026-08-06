import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder
} from "discord.js";

import type { Command } from "../lib/client.ts";
import { client } from "../lib/client.ts";

const getMonthName = (month: number) => new Date(0, month - 1, 1).toLocaleString("en-US", { month: "long" });

export const command = {
	data: new SlashCommandBuilder()
		.setName("birthday")
		.setDescription("Manage and view member birthdays.")
		.addSubcommand((subcommand) => subcommand
			.setName("set")
			.setDescription("Set your birthday.")
			.addIntegerOption((option) => option
				.setName("day")
				.setDescription("The day of your birthday (1-31).")
				.setMinValue(1)
				.setMaxValue(31)
				.setRequired(true)
			)
			.addIntegerOption((option) => option
				.setName("month")
				.setDescription("The month of your birthday (1-12).")
				.setMinValue(1)
				.setMaxValue(12)
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("show")
			.setDescription("Show a member's birthday date.")
			.addUserOption((option) => option
				.setName("user")
				.setDescription("The user whose birthday date to view.")
				.setRequired(false)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName("remove")
			.setDescription("Remove your birthday.")
		)
		.addSubcommand((subcommand) => subcommand
			.setName("upcoming")
			.setDescription("List upcoming birthdays in this server.")
		)
		.setIntegrationTypes([
			ApplicationIntegrationType.GuildInstall,
			ApplicationIntegrationType.UserInstall
		])
		.setContexts([
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		]),

	async execute(_logger, interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === "set") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const day = interaction.options.getInteger("day", true);
			const month = interaction.options.getInteger("month", true);

			const dateCheck = new Date(0, month - 1, day);
			if (dateCheck.getMonth() !== month - 1 || dateCheck.getDate() !== day) {
				await interaction.followUp(`Invalid date! Please enter a valid day and month.`);
				return;
			}

			const user = await client.getUser(interaction.user.id);
			if (!user) {
				await interaction.followUp("Unable to load your profile.");
				return;
			}

			user.data.birthday = { day, month };
			await user.saveData();

			await interaction.followUp(`Your birthday has been set to **${getMonthName(month)} ${day}**!`);
			return;
		}

		if (subcommand === "remove") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const user = await client.getUser(interaction.user.id);
			if (!user || !user.data.birthday) {
				await interaction.followUp("You don't have a birthday registered.");
				return;
			}

			delete user.data.birthday;
			await user.saveData();

			await interaction.followUp("Your birthday has been removed.");
			return;
		}

		if (subcommand === "show") {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const targetUser = interaction.options.getUser("user") ?? interaction.user;
			if (targetUser.bot) {
				await interaction.followUp("Bots do not have birthdays! Well.. maybe but let's not get into that..");
				return;
			}

			const user = await client.getUser(targetUser.id);
			const displayName = user ? await user.getGuildDisplayName(interaction.guildId ?? undefined) : (targetUser.globalName ?? targetUser.username);
			if (!user || !user.data.birthday) await interaction.followUp(targetUser.id === interaction.user.id ? "You haven't set your birthday yet! Use `/birthday set` to set it." : `${displayName} has not set their birthday yet.`);
			else await interaction.followUp(`<@${user.id}>${displayName.endsWith("s") ? "'" : "'s"} birthday is on ${getMonthName(user.data.birthday.month)} ${user.data.birthday.day}.`);
			return;
		}

		if (subcommand === "upcoming") {
			if (interaction.guild) await interaction.deferReply();
			else await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const usersWithBirthdays: { displayName: string; day: number; month: number; timestamp: number }[] = [];
			const now = new Date();
			const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			try {
				for await (const dirEntry of Deno.readDir("./storage/users/")) {
					if (!dirEntry.isDirectory) continue;
					const user = await client.getUser(dirEntry.name);
					if (!user || !user.data.birthday) continue;

					if (interaction.guild) {
						try {
							const member = await interaction.guild.members.fetch(user.id);
							if (!member) continue;
						} catch {
							continue;
						}
					}

					const { day, month } = user.data.birthday;
					let targetDate = new Date(now.getFullYear(), month - 1, day);
					if (targetDate < todayMidnight) targetDate = new Date(now.getFullYear() + 1, month - 1, day);

					usersWithBirthdays.push({
						displayName: await user.getGuildDisplayName(interaction.guild?.id),
						day,
						month,
						timestamp: targetDate.getTime()
					});
				}
			} catch {
				await interaction.followUp("Error reading birthday data.");
				return;
			}

			if (usersWithBirthdays.length === 0) {
				await interaction.followUp("No upcoming birthdays registered in this server!\nRegister yours with `/birthday set`!");
				return;
			}

			usersWithBirthdays.sort((a, b) => a.timestamp - b.timestamp);
			const topUpcoming = usersWithBirthdays.slice(0, 10);

			const listFormatted = topUpcoming.map((user) => `- **${user.displayName}** - <t:${Math.floor(user.timestamp / 1000)}:D> (<t:${Math.floor(user.timestamp / 1000)}:R>)`).join("\n");
			await interaction.followUp(`## Upcoming Birthdays:\n\n${listFormatted}`);
		}
	}
} satisfies Command<ChatInputCommandInteraction>;