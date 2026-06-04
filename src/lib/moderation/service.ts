import { ai } from "../../lib/ai.ts";
import { logger } from "../../lib/logger.ts";
import type { Message } from "discord.js";
import { encodeBase64 } from "std/encoding/base64.ts";
import { moderationCache } from "./cache.ts";

export type ModerationAction =
	| "strictly_forbidden"
	| "strictly_illegal_inappropriate"
	| "urgent_problem"
	| "probably_inappropriate"
	| "safe";

export interface ModerationResult {
	action: ModerationAction;
	reason?: string;
}

const SYSTEM_PROMPT = `You are a strict Discord automated moderator.
Your job is to analyze the user's latest message (including any attached images) in the context of the conversation and classify it.
You MUST output according to the requested JSON schema.

Rules for classification (action):
- "strictly_forbidden": The message or image clearly violates standard Discord rules (e.g., explicit adult content, doxxing, severe hate speech). You are 100% sure.
- "strictly_illegal_inappropriate": The message or image contains illegal content or highly inappropriate material. You are 100% sure.
- "urgent_problem": The message or image is part of an immediate threat, raid, extreme spam, or phishing links.
- "probably_inappropriate": The message or image is borderline, toxic, insulting, or inappropriate, but you are not completely sure (e.g., might be an inside joke or sarcasm).
- "safe": The message and image are completely fine and don't violate any rules.`;

const RESPONSE_SCHEMA = {
	type: "object",
	properties: {
		action: {
			type: "string",
			enum: [
				"strictly_forbidden",
				"strictly_illegal_inappropriate",
				"urgent_problem",
				"probably_inappropriate",
				"safe"
			],
			description: "The classification of the message."
		},
		reason: {
			type: "string",
			description: "A short sentence explaining why you chose this action (in French)."
		}
	},
	required: ["action", "reason"]
};

export async function analyzeMessage(message: Message): Promise<ModerationResult> {
	try {
		const context = await moderationCache.getContext(message.channel, message.id);

		const textPrompt = `Context (previous messages in this channel):\n${context}\n\nAnalyze the latest message from this user.\nUser: ${message.author.username} (${message.author.id})\nMessage: ${message.content}`;

		const attachments = Array.from(message.attachments.values()).filter(a => a.contentType?.startsWith("image/"));
		let prompt: string | Array<{ text: string } | { inlineData: { data: string; mimeType?: string } }> = textPrompt;

		if (attachments.length > 0) {
			const parts: Array<{ text: string } | { inlineData: { data: string; mimeType?: string } }> = [{ text: textPrompt }];
			for (const attachment of attachments) {
				try {
					const res = await fetch(attachment.url);
					if (res.ok) {
						const arrayBuffer = await res.arrayBuffer();
						const base64 = encodeBase64(new Uint8Array(arrayBuffer));
						parts.push({
							inlineData: {
								data: base64,
								mimeType: attachment.contentType
							}
						});
					}
				} catch (error) {
					logger.error(`Failed to fetch attachment ${attachment.url}:`, error);
				}
			}
			prompt = parts;
		}

		const response = await ai.generateCompletion(prompt, SYSTEM_PROMPT, "application/json", RESPONSE_SCHEMA);
		const result = JSON.parse(response.trim()) as ModerationResult;

		const validActions = ["strictly_forbidden", "strictly_illegal_inappropriate", "urgent_problem", "probably_inappropriate", "safe"];
		if (!validActions.includes(result.action)) {
			logger.warn(`AI returned invalid moderation action: ${result.action}`);
			return { action: "safe" };
		}

		return result;
	} catch (error) {
		logger.error("Error during AI moderation analysis:", error);
		return { action: "safe" };
	}
}