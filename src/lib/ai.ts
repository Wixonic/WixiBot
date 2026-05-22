import { LMStudioClient } from "@lmstudio/sdk";
import { GoogleGenAI } from "@google/genai";
import { getSettings } from "./settings.ts";

export type AIProvider = "gemini" | "lmstudio";

export interface ReplayStats {
	messages: number;
	voiceMinutes: number;
	forumPosts: number;
	reactions: number;
}

export class AIService {
	private geminiClient: GoogleGenAI | null = null;
	private lmstudioClient: LMStudioClient | null = null;
	private initialized = false;
	private provider: AIProvider = "lmstudio";

	private init() {
		if (this.initialized) return;

		const settings = getSettings();
		if (!settings.ai) {
			this.initialized = true;
			return;
		}

		if (settings.ai.provider === "gemini" && settings.ai.gemini?.enabled) {
			this.geminiClient = new GoogleGenAI({ apiKey: settings.ai.gemini.apiKey });
			this.provider = "gemini";
		} else if (settings.ai.provider === "lmstudio" && settings.ai.lmstudio?.enabled) {
			this.lmstudioClient = new LMStudioClient({
				baseUrl: settings.ai.lmstudio.baseUrl
			});
			this.provider = "lmstudio";
		}

		this.initialized = true;
	}

	async generateReplay(username: string, stats: ReplayStats): Promise<string> {
		this.init();

		const prompt = `You are a friendly Discord bot assistant. Write a short, engaging, and personalized monthly recap for the user "${username}".
Here are their stats for the month:
- Messages sent: ${stats.messages}
- Time spent in voice channels: ${stats.voiceMinutes} minutes
- Forum posts created: ${stats.forumPosts}
- Reactions given/received: ${stats.reactions}

Write it in English. Make it enthusiastic, and maximum 3 paragraphs. Use light Discord markdown and don't use emojis.`;

		if (this.provider === "gemini" && this.geminiClient) {
			try {
				const modelName = "gemini-flash-light-latest";
				const response = await this.geminiClient.models.generateContent({
					model: modelName,
					contents: prompt
				});
				if (!response.text) throw new Error("Gemini returned an empty response.");
				return response.text;
			} catch (error) {
				console.error("Gemini Replay Error:", error);
				throw error;
			}
		}

		if (this.provider === "lmstudio" && this.lmstudioClient) {
			try {
				const modelName = getSettings().ai?.lmstudio?.model!;
				const model = await this.lmstudioClient.llm.model(modelName);
				const response = await model.respond([
					{ role: "user", content: prompt }
				]);
				if (!response.content) throw new Error("LM Studio returned an empty response.");
				return response.content;
			} catch (error) {
				console.error("LMStudio Replay Error:", error);
				throw error;
			}
		}

		throw new Error("AI configuration is invalid or disabled.");
	}
}

export const ai = new AIService();