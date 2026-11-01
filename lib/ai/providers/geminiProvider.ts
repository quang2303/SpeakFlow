import type { AIProvider } from "./base";
import type {
  AIReplyResult,
  AITutorChatRequest,
  AITutorSummaryRequest,
  SessionSummary,
} from "../types";
import {
  buildSessionSummaryPrompt,
  buildTutorSystemPrompt,
} from "../prompts";

export class GeminiAIProvider implements AIProvider {
  name = "Google Gemini 1.5 Flash";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, model: string = "gemini-1.5-flash", timeoutMs = 15000) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generateReply(request: AITutorChatRequest): Promise<AIReplyResult> {
    const {
      userMessage,
      scenarioTitle,
      scenarioContext,
      userRole,
      aiRole,
      level,
      correctionMode,
      history = [],
    } = request;

    const systemPrompt = buildTutorSystemPrompt({
      scenarioTitle,
      scenarioContext,
      userRole,
      aiRole,
      level,
      correctionMode,
    });

    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      ...history.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `Learner message: "${userMessage}". Please analyze and respond in character according to your pedagogical guidelines. Respond STRICTLY in valid JSON.`,
          },
        ],
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini API HTTP ${response.status}: ${errorText.slice(0, 300)}`
        );
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText) as Partial<AIReplyResult>;

      const usage = data.usageMetadata;
      const tokensUsed = usage
        ? {
            prompt: usage.promptTokenCount || 0,
            completion: usage.candidatesTokenCount || 0,
            total: usage.totalTokenCount || 0,
          }
        : undefined;

      return {
        replyEn: parsed.replyEn || "I understand. Let us continue practicing!",
        replyVi: parsed.replyVi || "Tôi hiểu rồi. Chúng ta hãy tiếp tục luyện tập nhé!",
        tutorCorrection: parsed.tutorCorrection || null,
        suggestedReplies: Array.isArray(parsed.suggestedReplies)
          ? parsed.suggestedReplies
          : [],
        followUpQuestionEn: parsed.followUpQuestionEn,
        followUpQuestionVi: parsed.followUpQuestionVi,
        source: "gemini",
        isMock: false,
        tokensUsed,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Gemini API request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  async generateSummary(request: AITutorSummaryRequest): Promise<SessionSummary> {
    const { scenarioTitle, cefrLevel, durationSeconds, history } = request;

    const transcriptText = history
      .map(
        (h, idx) =>
          `[Turn ${idx + 1}] ${h.role === "assistant" ? "AI Tutor" : "Learner"}: ${
            h.content
          }`
      )
      .join("\n");

    const prompt = buildSessionSummaryPrompt({
      scenarioTitle,
      cefrLevel,
      durationSeconds,
      historyText: transcriptText,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.5,
              responseMimeType: "application/json",
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API summary HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsed = JSON.parse(rawText) as SessionSummary;

      return {
        topic: parsed.topic || scenarioTitle,
        cefrLevel: parsed.cefrLevel || cefrLevel,
        turnsCount: parsed.turnsCount || history.filter((h) => h.role === "user").length,
        durationSeconds: parsed.durationSeconds || durationSeconds,
        completionStatus: "completed",
        accomplishmentScore: parsed.accomplishmentScore || 85,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        areasForImprovement: Array.isArray(parsed.areasForImprovement)
          ? parsed.areasForImprovement
          : [],
        grammarFeedback: Array.isArray(parsed.grammarFeedback)
          ? parsed.grammarFeedback
          : [],
        vocabularyFeedback: parsed.vocabularyFeedback || {
          usedWell: [],
          recommended: [],
        },
        nextRecommendations: Array.isArray(parsed.nextRecommendations)
          ? parsed.nextRecommendations
          : [],
        keyTakeawayCards: Array.isArray(parsed.keyTakeawayCards)
          ? parsed.keyTakeawayCards
          : [],
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Gemini summary request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }
}
