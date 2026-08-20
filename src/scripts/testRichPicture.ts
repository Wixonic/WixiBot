import path from "node:path";
import { generateRichPicture, RichPictureType } from "../lib/richPicture.ts";

const outputDir = "./storage/test_richpicture/";
await Deno.mkdir(outputDir, { recursive: true });

console.log("Generating RichPicture test samples...");

const samples = [
	{
		filename: "01_profile.png",
		options: {
			type: RichPictureType.Profile,
			data: {
				username: "Wixonic",
				level: 42,
				xp: 88450,
				streak: 14,
				bestStreak: 28,
				messages: 3420,
				stageEvents: 12,
				forumPosts: 45,
				reactions: 1280,
				achievementsCount: 9
			}
		}
	},
	{
		filename: "02_leaderboard.png",
		options: {
			type: RichPictureType.Leaderboard,
			data: {
				entries: [
					{ rank: 1, username: "Wixonic", level: 42, xp: 88450, streak: 14 },
					{ rank: 2, username: "AlexPro", level: 38, xp: 72100, streak: 8 },
					{ rank: 3, username: "CyberSam", level: 31, xp: 54300 },
					{ rank: 4, username: "LunarStar", level: 25, xp: 39800, streak: 3 },
					{ rank: 5, username: "PixelCraft", level: 19, xp: 21500 }
				]
			}
		}
	},
	{
		filename: "03_levelup.png",
		options: {
			type: RichPictureType.LevelUp,
			data: {
				username: "Wixonic",
				oldLevel: 41,
				newLevel: 42
			}
		}
	},
	{
		filename: "04_achievement.png",
		options: {
			type: RichPictureType.Achievement,
			data: {
				username: "Wixonic",
				achievementName: "Community Voice",
				achievementDescription: "Participated in 10 stage events!"
			}
		}
	},
	{
		filename: "05_welcome.png",
		options: {
			type: RichPictureType.WelcomeMember,
			data: {
				username: "NewMember_99",
				serverName: "Wixiland",
				memberCount: 1542
			}
		}
	},
	{
		filename: "06_boost.png",
		options: {
			type: RichPictureType.Boost,
			data: {
				username: "SuperBooster",
				type: "Boost" as const
			}
		}
	},
	{
		filename: "07_supporter.png",
		options: {
			type: RichPictureType.Supporter,
			data: {
				username: "GenerousFriend",
				type: "Supporter" as const
			}
		}
	},
	{
		filename: "08_warn.png",
		options: {
			type: RichPictureType.Warn,
			data: {
				targetUsername: "Spammer_123",
				moderatorUsername: "WixiBot",
				reason: "Repeated inappropriate messages in general channel."
			}
		}
	},
	{
		filename: "09_report_message.png",
		options: {
			type: RichPictureType.ReportMessage,
			data: {
				targetUsername: "BadActor",
				reporterUsername: "VigilantUser",
				reportType: "Message" as const,
				reason: "Suspicious link posted in announcements."
			}
		}
	},
	{
		filename: "10_report_user.png",
		options: {
			type: RichPictureType.ReportUser,
			data: {
				targetUsername: "TrollUser",
				reporterUsername: "ModTeam",
				reportType: "User" as const,
				reason: "Harassment and offensive behavior."
			}
		}
	},
	{
		filename: "11_ticket_header.png",
		options: {
			type: RichPictureType.TicketHeader,
			data: {
				ticketId: "A8B9C2",
				creatorUsername: "Wixonic",
				reason: "Need assistance setting up server permissions.",
				state: "Waiting" as const,
				createdAtFormatted: "31/07/2026 23:45"
			}
		}
	},
	{
		filename: "12_birthday.webp",
		options: {
			type: RichPictureType.Birthday,
			data: {
				username: "Wixonic"
			}
		}
	},
	{
		filename: "13_storage_file.webp",
		options: {
			type: RichPictureType.StorageFile,
			data: {
				name: "archive_backup_2026.tar.gz",
				mimeType: "application/gzip",
				size: 14582912,
				fifoPosition: 1
			}
		}
	},
	{
		filename: "14_storage_stats.webp",
		options: {
			type: RichPictureType.StorageStats,
			data: {
				usedSize: 48500000000,
				maxCapacity: 214748364800,
				totalFiles: 142
			}
		}
	}
];

for (const sample of samples) {
	try {
		// @ts-ignore
		const buffer = await generateRichPicture(sample.options);
		const filename = sample.filename.endsWith(".png") ? sample.filename.replace(/\.png$/, ".webp") : sample.filename;
		const filePath = path.join(outputDir, filename);
		await Deno.writeFile(filePath, buffer);
		console.log(`Saved ${filename}`);
	} catch (err) {
		console.error(`Failed ${sample.filename}:`, err);
	}
}

console.log("\nAll sample RichPictures generated successfully in ./storage/test_richpicture/");