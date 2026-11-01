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

export class OpenAIProvider implements AIProvider {
  name = "OpenAI GPT-4o mini";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, model: string = "gpt-4o-mini", timeoutMs = 15000) {
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

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.content,
      })),
      {
        role: "user",
        content: `Learner message: "${userMessage}". Analyze and respond in character according to your pedagogical rules. Respond in JSON.`,
      },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          response_format: { type: "json_object" },
          max_tokens: 1000,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content) as Partial<AIReplyResult>;

      const usage = data.usage;
      const tokensUsed = usage
        ? {
            prompt: usage.prompt_tokens || 0,
            completion: usage.completion_tokens || 0,
            total: usage.total_tokens || 0,
          }
        : undefined;

      return {
        replyEn: parsed.replyEn || "I understand. Let's keep going!",
        replyVi: parsed.replyVi || "Tôi hiểu rồi. Chúng ta hãy tiếp tục nhé!",
        tutorCorrection: parsed.tutorCorrection || null,
        suggestedReplies: Array.isArray(parsed.suggestedReplies)
          ? parsed.suggestedReplies
          : [],
        followUpQuestionEn: parsed.followUpQuestionEn,
        followUpQuestionVi: parsed.followUpQuestionVi,
        source: "openai",
        isMock: false,
        tokensUsed,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms.`);
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          response_format: { type: "json_object" },
          max_tokens: 2000,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI summary HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content) as SessionSummary;

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
        throw new Error(`OpenAI summary request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }
}
