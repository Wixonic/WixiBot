import path from "node:path";

const migrate = async () => {
	console.log("Starting activity storage migration...");
	const usersDir = "./storage/users/";
	let usersProcessed = 0;
	let filesCleaned = 0;

	try {
		for await (const userEntry of Deno.readDir(usersDir)) {
			if (!userEntry.isDirectory) continue;
			const userId = userEntry.name;
			const userPath = path.join(usersDir, userId);
			const activityPath = path.join(userPath, "activity");

			try {
				const monthlyData: Record<string, any> = {};
				const totalStats = {
					totalMessages: 0,
					totalStageEvents: 0,
					totalForumPosts: 0,
					totalReactions: 0
				};

				const oldFiles: string[] = [];

				for await (const actEntry of Deno.readDir(activityPath)) {
					if (!actEntry.isFile || !actEntry.name.endsWith(".json")) continue;

					const filename = actEntry.name;
					if (/^\d+\.json$/.test(filename)) {
						oldFiles.push(filename);
						const filePath = path.join(activityPath, filename);
						const content = await Deno.readTextFile(filePath);
						const activity = JSON.parse(content);

						const timestamp = typeof activity.date === "number" && activity.date < 2000000000000 && activity.date < 3000000000 ? activity.date * 1000 : Number(activity.date) || Date.now();
						const date = new Date(timestamp);
						const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

						monthlyData[yearMonth] ??= { yearMonth, guilds: {} };

						for (const guildId in activity.guilds) {
							const guild = activity.guilds[guildId];
							const targetGuild = monthlyData[yearMonth].guilds[guildId] ??= {
								achievements: [],
								messages: { sent: 0, mentions: 0, reactions: { added: 0, received: 0 } },
								stageEvents: { attended: 0 },
								forum: { posts: 0 }
							};

							const sent = guild.messages?.sent || 0;
							const mentions = guild.messages?.mentions || 0;
							const added = guild.messages?.reactions?.added || 0;
							const received = guild.messages?.reactions?.received || 0;
							const posts = guild.forum?.posts || 0;
							const attended = guild.stageEvents?.attended || 0;

							targetGuild.messages.sent += sent;
							targetGuild.messages.mentions += mentions;
							targetGuild.messages.reactions.added += added;
							targetGuild.messages.reactions.received += received;
							targetGuild.forum.posts += posts;
							targetGuild.stageEvents.attended += attended;

							totalStats.totalMessages += sent;
							totalStats.totalForumPosts += posts;
							totalStats.totalStageEvents += attended;
							totalStats.totalReactions += (added + received);

							if (guild.achievements) targetGuild.achievements.push(...guild.achievements);
						}
					}
				}

				for (const ym in monthlyData) {
					await Deno.writeTextFile(path.join(activityPath, `${ym}.json`), JSON.stringify(monthlyData[ym], null, "\t"));
				}

				for (const oldFile of oldFiles) {
					await Deno.remove(path.join(activityPath, oldFile));
					filesCleaned++;
				}

				const dataPath = path.join(userPath, "data.json");
				let userData: any = {};
				try {
					const dataContent = await Deno.readTextFile(dataPath);
					userData = JSON.parse(dataContent);
				} catch {
					// create new
				}

				userData.stats = totalStats;
				await Deno.writeTextFile(dataPath, JSON.stringify(userData, null, "\t"));
				usersProcessed++;
			} catch (_error) {
				// Ignore if user has no activity directory
			}
		}
	} catch (error) {
		console.error("Migration error:", error);
	}

	console.log(`Activity storage migration finished. Processed ${usersProcessed} users, cleaned ${filesCleaned} old files.`);
};

migrate();