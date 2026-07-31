import { createCanvas, GlobalFonts, loadImage, type CanvasRenderingContext2D } from "@napi-rs/canvas";

try {
	GlobalFonts.registerFromPath("/Users/wix/Documents/GitHub/Website/websites/assets/raw/font/OpenSans/regular.woff2", "OpenSans");
	GlobalFonts.registerFromPath("/Users/wix/Documents/GitHub/Website/websites/assets/raw/font/RamettoOne/regular.woff2", "RamettoOne");
} catch {
	// Fallback to system fonts
}

export enum RichPictureType {
	Profile = "Profile",
	Leaderboard = "Leaderboard",
	LevelUp = "LevelUp",
	Achievement = "Achievement",
	WelcomeMember = "WelcomeMember",
	Boost = "Boost",
	Supporter = "Supporter",
	Warn = "Warn",
	ReportMessage = "ReportMessage",
	ReportUser = "ReportUser",
	TicketHeader = "TicketHeader"
};

export interface ProfileCardData {
	username: string;
	avatarUrl?: string;
	level: number;
	xp: number;
	streak?: number;
	bestStreak?: number;
	messages: number;
	stageEvents: number;
	forumPosts: number;
	reactions: number;
	achievementsCount: number;
};

export interface LeaderboardEntry {
	rank: number;
	username: string;
	level: number;
	xp: number;
	streak?: number;
	avatarUrl?: string;
};

export interface LeaderboardCardData {
	entries: LeaderboardEntry[];
};

export interface LevelUpCardData {
	username: string;
	avatarUrl?: string;
	oldLevel: number;
	newLevel: number;
};

export interface AchievementCardData {
	username: string;
	avatarUrl?: string;
	achievementName: string;
	achievementDescription: string;
};

export interface WelcomeMemberCardData {
	username: string;
	avatarUrl?: string;
	serverName: string;
	memberCount?: number;
};

export interface SupporterCardData {
	username: string;
	avatarUrl?: string;
	type: "Boost" | "Supporter";
};

export interface WarnCardData {
	targetUsername: string;
	targetAvatarUrl?: string;
	moderatorUsername?: string;
	reason: string;
};

export interface ReportCardData {
	targetUsername: string;
	targetAvatarUrl?: string;
	reporterUsername?: string;
	reportType: "Message" | "User";
	reason: string;
	contentSnippet?: string;
};

export interface TicketHeaderCardData {
	ticketId: string;
	creatorUsername: string;
	creatorAvatarUrl?: string;
	reason: string;
	state: "Waiting" | "Claimed" | "Resolved" | "Closed";
	claimedByUsername?: string;
	createdAtFormatted: string;
};

export type RichPictureOptions =
	| { type: RichPictureType.Profile; data: ProfileCardData }
	| { type: RichPictureType.Leaderboard; data: LeaderboardCardData }
	| { type: RichPictureType.LevelUp; data: LevelUpCardData }
	| { type: RichPictureType.Achievement; data: AchievementCardData }
	| { type: RichPictureType.WelcomeMember; data: WelcomeMemberCardData }
	| { type: RichPictureType.Boost; data: SupporterCardData }
	| { type: RichPictureType.Supporter; data: SupporterCardData }
	| { type: RichPictureType.Warn; data: WarnCardData }
	| { type: RichPictureType.ReportMessage; data: ReportCardData }
	| { type: RichPictureType.ReportUser; data: ReportCardData }
	| { type: RichPictureType.TicketHeader; data: TicketHeaderCardData };

const AccentColors: Record<RichPictureType, string> = {
	[RichPictureType.Profile]: "#FFA200",
	[RichPictureType.Leaderboard]: "#FFA200",
	[RichPictureType.LevelUp]: "#FFA200",
	[RichPictureType.Achievement]: "#FFD700",
	[RichPictureType.WelcomeMember]: "#00A2FF",
	[RichPictureType.Boost]: "#F472B6",
	[RichPictureType.Supporter]: "#F472B6",
	[RichPictureType.Warn]: "#FFA200",
	[RichPictureType.ReportMessage]: "#FF3B30",
	[RichPictureType.ReportUser]: "#FF3B30",
	[RichPictureType.TicketHeader]: "#34C759"
};

const FONT_MAIN = '"OpenSans", sans-serif';
const FONT_ACCENT = '"RamettoOne", "OpenSans", sans-serif';

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.arcTo(x + width, y, x + width, y + radius, radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
	ctx.lineTo(x + radius, y + height);
	ctx.arcTo(x, y + height, x, y + height - radius, radius);
	ctx.lineTo(x, y + radius);
	ctx.arcTo(x, y, x + radius, y, radius);
	ctx.closePath();
};

const drawCircularAvatar = async (ctx: CanvasRenderingContext2D, url: string | undefined, x: number, y: number, size: number, fallbackLetter = "?") => {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();

	if (url) {
		try {
			const image = await loadImage(url);
			(ctx as any).drawImage(image, x, y, size, size);
			ctx.restore();
			return;
		} catch {
			// Ignore image load error
		}
	}

	ctx.fillStyle = "#2C2C2E";
	ctx.fillRect(x, y, size, size);
	ctx.fillStyle = "#FFFFFF";
	ctx.font = `bold ${Math.floor(size * 0.52)}px ${FONT_ACCENT}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(fallbackLetter.toUpperCase(), Math.floor(x + size / 2), Math.floor(y + size / 2 + Math.floor(size * 0.05)));
	ctx.restore();
};

const drawSvgIcon = async (ctx: CanvasRenderingContext2D, iconName: string, color: string, x: number, y: number, size: number) => {
	try {
		let svg = await Deno.readTextFile(`./src/assets/icons/${iconName}.svg`);
		svg = svg.replace(/<rect[^>]*\/>/g, "");
		svg = svg.replace(/<svg /, `<svg width="${size}" height="${size}" `);
		svg = svg.replace(/path /g, `path fill="${color}" `);
		const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
		const image = await loadImage(dataUrl);
		(ctx as any).drawImage(image, x, y, size, size);
	} catch {
		// Ignore SVG load error
	}
};

const drawTextPatternIconWatermark = async (
	ctx: CanvasRenderingContext2D,
	iconName: string,
	patternText: string,
	accentColor: string,
	cardX: number,
	cardY: number,
	cardW: number,
	cardH: number,
	size = 175,
	customY?: number
) => {
	const x = cardX + cardW - size - 35;
	const y = customY !== undefined ? customY : cardY + (cardH - size) / 2;

	try {
		let svg = await Deno.readTextFile(`./src/assets/icons/${iconName}.svg`);
		svg = svg.replace(/<rect[^>]*\/>/g, "");
		svg = svg.replace(/<svg /, `<svg width="${size}" height="${size}" `);
		svg = svg.replace(/path /g, `path fill="${accentColor}" `);
		const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
		const image = await loadImage(dataUrl);

		ctx.save();
		ctx.globalAlpha = 0.05;
		(ctx as any).drawImage(image, x, y, size, size);
		ctx.restore();

		const padding = size;
		const offscreen = createCanvas(size + padding * 2, size + padding * 2);
		const offscreenContext = offscreen.getContext("2d");

		offscreenContext.fillStyle = accentColor;
		offscreenContext.font = `bold 8px ${FONT_ACCENT}`;
		offscreenContext.save();
		offscreenContext.translate(padding + size / 2, padding + size / 2);
		offscreenContext.rotate(-Math.PI / 12);

		const unit = patternText.toUpperCase() + "  •  ";
		const lineText = unit.repeat(30);
		let lineIndex = 0;

		for (let linePosition = -size * 2; linePosition < size * 2; linePosition += 10) {
			const staggerOffset = lineIndex % 2 === 0 ? 0 : 25;
			offscreenContext.fillText(lineText, -size * 2 + staggerOffset, linePosition);
			lineIndex++;
		}
		offscreenContext.restore();

		offscreenContext.globalCompositeOperation = "destination-in";
		(offscreenContext as any).drawImage(image, padding, padding, size, size);

		ctx.save();
		ctx.globalAlpha = 0.1;
		(ctx as any).drawImage(offscreen, x - padding, y - padding, size + padding * 2, size + padding * 2);
		ctx.restore();
	} catch {
		// Ignore watermark error
	}
};

export const generateRichPicture = async (options: RichPictureOptions): Promise<Buffer> => {
	const type = options.type;
	const accentColor = AccentColors[type];

	const scale = 2;
	const baseWidth = 1000;
	let baseHeight = 260;

	if (type === RichPictureType.Profile) baseHeight = 440;
	else if (type === RichPictureType.Leaderboard) {
		const count = (options.data as LeaderboardCardData).entries.length;
		baseHeight = 160 + count * 68;
	} else if (type === RichPictureType.LevelUp || type === RichPictureType.WelcomeMember || type === RichPictureType.Boost || type === RichPictureType.Supporter) baseHeight = 240;
	else if (type === RichPictureType.Achievement) baseHeight = 260;
	else if (type === RichPictureType.TicketHeader || type === RichPictureType.Warn || type === RichPictureType.ReportMessage || type === RichPictureType.ReportUser) baseHeight = 340;

	const canvas = createCanvas(baseWidth * scale, baseHeight * scale);
	const ctx = canvas.getContext("2d");
	ctx.scale(scale, scale);

	const cardX = 24;
	const cardY = 24;
	const cardW = baseWidth - 48;
	const cardH = baseHeight - 48;
	const radius = 32;

	ctx.clearRect(0, 0, baseWidth, baseHeight);

	ctx.save();
	drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
	ctx.clip();

	ctx.fillStyle = "#0A0A0C";
	ctx.fillRect(cardX, cardY, cardW, cardH);

	const grad = ctx.createRadialGradient(cardX + cardW / 2, cardY, 10, cardX + cardW / 2, cardY, cardW * 0.7);
	grad.addColorStop(0, accentColor + "22");
	grad.addColorStop(1, "transparent");
	ctx.fillStyle = grad;
	ctx.fillRect(cardX, cardY, cardW, cardH);

	switch (type) {
		case RichPictureType.LevelUp:
			await drawTextPatternIconWatermark(ctx, "flame", "LEVEL UP", accentColor, cardX, cardY, cardW, cardH, 180);
			break;
		case RichPictureType.Achievement:
			await drawTextPatternIconWatermark(ctx, "medal-military", "ACHIEVEMENT", accentColor, cardX, cardY, cardW, cardH, 180);
			break;
		case RichPictureType.WelcomeMember:
			await drawTextPatternIconWatermark(ctx, "hand-waving", "WELCOME", accentColor, cardX, cardY, cardW, cardH, 180);
			break;
		case RichPictureType.Boost:
			await drawTextPatternIconWatermark(ctx, "rocket-launch", "SERVER BOOST", accentColor, cardX, cardY, cardW, cardH, 180);
			break;
		case RichPictureType.Supporter:
			await drawTextPatternIconWatermark(ctx, "hand-heart", "SUPPORTER", accentColor, cardX, cardY, cardW, cardH, 180);
			break;
		case RichPictureType.Warn:
			await drawTextPatternIconWatermark(ctx, "shield-warning", "WARNING", accentColor, cardX, cardY, cardW, cardH, 130, cardY + 15);
			break;
		case RichPictureType.ReportMessage:
		case RichPictureType.ReportUser:
			await drawTextPatternIconWatermark(ctx, "shield-warning", "REPORT", accentColor, cardX, cardY, cardW, cardH, 130, cardY + 15);
			break;
		case RichPictureType.TicketHeader:
			await drawTextPatternIconWatermark(ctx, "chats-teardrop", "TICKET", accentColor, cardX, cardY, cardW, cardH, 130, cardY + 15);
			break;
	}

	ctx.restore();

	drawRoundedRect(ctx, cardX, cardY, cardW, cardH, radius);
	ctx.lineWidth = 2;
	ctx.strokeStyle = accentColor;
	ctx.stroke();

	ctx.save();

	switch (type) {
		case RichPictureType.Profile: {
			const data = options.data as ProfileCardData;
			await drawCircularAvatar(ctx, data.avatarUrl, cardX + 45, cardY + 40, 115, data.username[0]);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 38px ${FONT_MAIN}`;
			ctx.textAlign = "left";
			ctx.fillText(data.username, cardX + 185, cardY + 85);

			ctx.fillStyle = accentColor;
			ctx.font = `20px ${FONT_ACCENT}`;
			ctx.fillText(`LEVEL ${data.level}`, cardX + 185, cardY + 124);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `18px ${FONT_MAIN}`;
			ctx.fillText(`Total XP: ${data.xp.toLocaleString()}`, cardX + 340, cardY + 124);

			if (data.streak) {
				const streakText = `${data.streak} day streak` + (data.bestStreak ? ` (Best: ${data.bestStreak})` : "");
				ctx.font = `bold 18px ${FONT_MAIN}`;
				ctx.textAlign = "right";
				const streakTextWidth = ctx.measureText(streakText).width;

				const flameIconSize = 22;
				const flameX = cardX + cardW - 45 - streakTextWidth - flameIconSize - 8;
				const flameY = cardY + 85 - 17;
				await drawSvgIcon(ctx, "flame", "#FF9500", flameX, flameY, flameIconSize);

				ctx.fillStyle = "#FF9500";
				ctx.fillText(streakText, cardX + cardW - 45, cardY + 85);
			}

			ctx.strokeStyle = "#242428";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(cardX + 45, cardY + 185);
			ctx.lineTo(cardX + cardW - 45, cardY + 185);
			ctx.stroke();

			const stats = [
				{ label: "Messages", value: data.messages.toLocaleString() },
				{ label: "Stage Events", value: data.stageEvents.toLocaleString() },
				{ label: "Forum Posts", value: data.forumPosts.toLocaleString() },
				{ label: "Reactions", value: data.reactions.toLocaleString() },
				{ label: "Achievements", value: data.achievementsCount.toLocaleString() }
			];

			const colWidth = (cardW - 90) / 5;
			stats.forEach((stat, i) => {
				const sx = cardX + 45 + i * colWidth;
				const sy = cardY + 235;

				ctx.fillStyle = "#A1A1A6";
				ctx.font = `15px ${FONT_MAIN}`;
				ctx.textAlign = "left";
				ctx.fillText(stat.label.toUpperCase(), sx, sy);

				ctx.fillStyle = "#FFFFFF";
				ctx.font = `bold 36px ${FONT_MAIN}`;
				ctx.fillText(stat.value, sx, sy + 44);
			});

			const currentLevelBaseXp = Math.pow(data.level, 2) * 50;
			const nextLevelBaseXp = Math.pow(data.level + 1, 2) * 50;
			const levelProgress = Math.min(1, Math.max(0, (data.xp - currentLevelBaseXp) / Math.max(1, nextLevelBaseXp - currentLevelBaseXp)));

			const barY = cardY + 360;
			const barWidth = cardW - 90;
			const barHeight = 12;

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `15px ${FONT_MAIN}`;
			ctx.textAlign = "left";
			ctx.fillText(`PROGRESS TO LEVEL ${data.level + 1}`, cardX + 45, barY - 12);

			ctx.textAlign = "right";
			ctx.fillText(`${Math.floor(levelProgress * 100)}%`, cardX + cardW - 45, barY - 12);

			drawRoundedRect(ctx, cardX + 45, barY, barWidth, barHeight, 6);
			ctx.fillStyle = "#1F1F24";
			ctx.fill();

			if (levelProgress > 0) {
				drawRoundedRect(ctx, cardX + 45, barY, Math.max(12, barWidth * levelProgress), barHeight, 6);
				ctx.fillStyle = accentColor;
				ctx.fill();
			}

			break;
		}

		case RichPictureType.Leaderboard: {
			const data = options.data as LeaderboardCardData;

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `28px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText("GLOBAL LEADERBOARD", cardX + 45, cardY + 58);

			ctx.fillStyle = accentColor;
			ctx.font = `18px ${FONT_ACCENT}`;
			ctx.textAlign = "right";
			ctx.fillText("TOP MEMBERS BY XP", cardX + cardW - 45, cardY + 58);

			ctx.strokeStyle = "#242428";
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(cardX + 45, cardY + 85);
			ctx.lineTo(cardX + cardW - 45, cardY + 85);
			ctx.stroke();

			let y = cardY + 138;
			for (const entry of data.entries) {
				let rankColor = "#A1A1A6";
				if (entry.rank === 1) rankColor = "#FFD700";
				else if (entry.rank === 2) rankColor = "#C0C0C0";
				else if (entry.rank === 3) rankColor = "#CD7F32";

				ctx.fillStyle = rankColor;
				ctx.font = `22px ${FONT_ACCENT}`;
				ctx.textAlign = "left";
				ctx.fillText(`#${entry.rank}`, cardX + 45, y);

				await drawCircularAvatar(ctx, entry.avatarUrl, cardX + 110, y - 26, 42, entry.username[0]);

				ctx.fillStyle = "#FFFFFF";
				ctx.font = `bold 22px ${FONT_MAIN}`;
				ctx.fillText(entry.username, cardX + 168, y);

				ctx.fillStyle = "#A1A1A6";
				ctx.font = `18px ${FONT_MAIN}`;
				ctx.textAlign = "right";
				ctx.fillText(`Lvl ${entry.level}  •  ${entry.xp.toLocaleString()} XP`, cardX + cardW - 45, y);

				y += 68;
			}
			break;
		}

		case RichPictureType.LevelUp: {
			const data = options.data as LevelUpCardData;

			await drawCircularAvatar(ctx, data.avatarUrl, cardX + 45, cardY + 40, 110, data.username[0]);

			await drawSvgIcon(ctx, "flame", accentColor, cardX + 180, cardY + 49, 22);
			ctx.fillStyle = accentColor;
			ctx.font = `20px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText("LEVEL UP!", cardX + 210, cardY + 68);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 38px ${FONT_MAIN}`;
			ctx.fillText(data.username, cardX + 180, cardY + 116);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `20px ${FONT_MAIN}`;
			ctx.fillText(`Reached Level ${data.newLevel} (from Lvl ${data.oldLevel})`, cardX + 180, cardY + 156);

			break;
		}

		case RichPictureType.Achievement: {
			const data = options.data as AchievementCardData;

			await drawCircularAvatar(ctx, data.avatarUrl, cardX + 45, cardY + 45, 110, data.username[0]);

			await drawSvgIcon(ctx, "medal-military", accentColor, cardX + 180, cardY + 46, 22);
			ctx.fillStyle = accentColor;
			ctx.font = `18px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText("ACHIEVEMENT UNLOCKED", cardX + 210, cardY + 64);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 34px ${FONT_MAIN}`;
			ctx.fillText(data.achievementName, cardX + 180, cardY + 112);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `19px ${FONT_MAIN}`;
			ctx.fillText(data.achievementDescription, cardX + 180, cardY + 150);

			ctx.fillStyle = "#7C7C80";
			ctx.font = `15px ${FONT_MAIN}`;
			ctx.fillText(`Unlocked by ${data.username}`, cardX + 180, cardY + 184);

			break;
		}

		case RichPictureType.WelcomeMember: {
			const data = options.data as WelcomeMemberCardData;

			await drawCircularAvatar(ctx, data.avatarUrl, cardX + 45, cardY + 40, 110, data.username[0]);

			await drawSvgIcon(ctx, "hand-waving", accentColor, cardX + 180, cardY + 49, 22);
			ctx.fillStyle = accentColor;
			ctx.font = `18px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText("WELCOME TO THE SERVER", cardX + 210, cardY + 67);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 38px ${FONT_MAIN}`;
			ctx.fillText(data.username, cardX + 180, cardY + 116);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `20px ${FONT_MAIN}`;
			const countText = data.memberCount ? ` • Member #${data.memberCount}` : "";
			ctx.fillText(`Joined ${data.serverName}${countText}`, cardX + 180, cardY + 156);

			break;
		}

		case RichPictureType.Boost:
		case RichPictureType.Supporter: {
			const data = options.data as SupporterCardData;
			const iconName = data.type === "Boost" ? "rocket-launch" : "hand-heart";

			await drawCircularAvatar(ctx, data.avatarUrl, cardX + 45, cardY + 40, 110, data.username[0]);

			const badgeText = data.type === "Boost" ? "SERVER BOOST" : "NEW SUPPORTER";
			await drawSvgIcon(ctx, iconName, accentColor, cardX + 180, cardY + 49, 22);

			ctx.fillStyle = accentColor;
			ctx.font = `18px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText(badgeText, cardX + 210, cardY + 67);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 38px ${FONT_MAIN}`;
			ctx.fillText(data.username, cardX + 180, cardY + 116);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `20px ${FONT_MAIN}`;
			const descText = data.type === "Boost"
				? "Just boosted the server! Thank you for the support!"
				: "Is now a server supporter! Thank you for keeping the server alive!";
			ctx.fillText(descText, cardX + 180, cardY + 156);
			break;
		}

		case RichPictureType.Warn: {
			const data = options.data as WarnCardData;

			await drawCircularAvatar(ctx, data.targetAvatarUrl, cardX + 45, cardY + 35, 95, data.targetUsername[0]);

			await drawSvgIcon(ctx, "shield-warning", accentColor, cardX + 160, cardY + 43, 20);
			ctx.fillStyle = accentColor;
			ctx.font = `17px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText("MEMBER WARNING", cardX + 188, cardY + 60);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 30px ${FONT_MAIN}`;
			ctx.fillText(data.targetUsername, cardX + 160, cardY + 98);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `17px ${FONT_MAIN}`;
			if (data.moderatorUsername) ctx.fillText(`Issued by @${data.moderatorUsername}`, cardX + 160, cardY + 132);

			ctx.fillStyle = "#151518";
			drawRoundedRect(ctx, cardX + 45, cardY + 165, cardW - 90, 105, 18);
			ctx.fill();

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `14px ${FONT_MAIN}`;
			ctx.fillText("REASON", cardX + 70, cardY + 198);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `18px ${FONT_MAIN}`;
			ctx.fillText(data.reason, cardX + 70, cardY + 236);
			break;
		}

		case RichPictureType.ReportMessage:
		case RichPictureType.ReportUser: {
			const data = options.data as ReportCardData;

			await drawCircularAvatar(ctx, data.targetAvatarUrl, cardX + 45, cardY + 35, 95, data.targetUsername[0]);

			const reportTitle = data.reportType === "Message" ? "MESSAGE REPORT" : "USER REPORT";
			await drawSvgIcon(ctx, "shield-warning", accentColor, cardX + 160, cardY + 43, 20);

			ctx.fillStyle = accentColor;
			ctx.font = `17px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText(reportTitle, cardX + 188, cardY + 60);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 30px ${FONT_MAIN}`;
			ctx.fillText(`Target: @${data.targetUsername}`, cardX + 160, cardY + 98);

			if (data.reporterUsername) {
				ctx.fillStyle = "#A1A1A6";
				ctx.font = `17px ${FONT_MAIN}`;
				ctx.fillText(`Reported by @${data.reporterUsername}`, cardX + 160, cardY + 132);
			}

			ctx.fillStyle = "#151518";
			drawRoundedRect(ctx, cardX + 45, cardY + 165, cardW - 90, 105, 18);
			ctx.fill();

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `14px ${FONT_MAIN}`;
			ctx.fillText("REASON", cardX + 70, cardY + 198);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `18px ${FONT_MAIN}`;
			ctx.fillText(data.reason, cardX + 70, cardY + 236);
			break;
		}

		case RichPictureType.TicketHeader: {
			const data = options.data as TicketHeaderCardData;

			await drawCircularAvatar(ctx, data.creatorAvatarUrl, cardX + 45, cardY + 35, 95, data.creatorUsername[0]);

			await drawSvgIcon(ctx, "chats-teardrop", accentColor, cardX + 160, cardY + 43, 20);
			ctx.fillStyle = accentColor;
			ctx.font = `17px ${FONT_ACCENT}`;
			ctx.textAlign = "left";
			ctx.fillText(`SUPPORT TICKET #${data.ticketId}`, cardX + 188, cardY + 60);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `bold 30px ${FONT_MAIN}`;
			ctx.fillText(`Opened by @${data.creatorUsername}`, cardX + 160, cardY + 98);

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `17px ${FONT_MAIN}`;
			const claimStatus = data.claimedByUsername ? `Claimed by @${data.claimedByUsername}` : "Unclaimed";
			ctx.fillText(`Status: ${data.state}  •  ${claimStatus}`, cardX + 160, cardY + 132);

			ctx.fillStyle = "#151518";
			drawRoundedRect(ctx, cardX + 45, cardY + 165, cardW - 90, 105, 18);
			ctx.fill();

			ctx.fillStyle = "#A1A1A6";
			ctx.font = `14px ${FONT_MAIN}`;
			ctx.fillText("SUBJECT / REASON", cardX + 70, cardY + 198);

			ctx.fillStyle = "#FFFFFF";
			ctx.font = `18px ${FONT_MAIN}`;
			ctx.fillText(data.reason, cardX + 70, cardY + 236);
			break;
		}
	}

	ctx.restore();

	return canvas.toBuffer("image/png");
};