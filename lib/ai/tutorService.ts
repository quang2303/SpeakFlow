import type { AIProvider } from "./providers/base";
import { GeminiAIProvider } from "./providers/geminiProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { MockAIProvider } from "./providers/mockProvider";
import {
  checkRateLimit,
  sanitizeHistory,
  MAX_USER_MESSAGE_CHARS,
} from "./safety";
import type {
  AIReplyResult,
  AITutorChatRequest,
  AITutorSummaryRequest,
  SessionSummary,
} from "./types";

export { checkRateLimit, sanitizeHistory, MAX_USER_MESSAGE_CHARS };

// Deduplication map to guard against double-clicks
const activeInFlightKeys = new Set<string>();

/**
 * Factory to instantiate the best available AI Provider
 */
export function getAIProvider(): AIProvider {
  const explicitProvider = process.env.AI_PROVIDER?.toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (explicitProvider === "openai" && openaiKey) {
    return new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL || "gpt-4o-mini");
  }

  if (explicitProvider === "gemini" && geminiKey) {
    return new GeminiAIProvider(geminiKey, process.env.GEMINI_MODEL || "gemini-1.5-flash");
  }

  // Auto-detect based on presence of API keys
  if (geminiKey) {
    return new GeminiAIProvider(geminiKey, process.env.GEMINI_MODEL || "gemini-1.5-flash");
  }

  if (openaiKey) {
    return new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL || "gpt-4o-mini");
  }

  // Fallback to Mock provider for development, testing, and offline modes
  return new MockAIProvider();
}

/**
 * High-level service for handling tutor chat requests with safety, sanitization, and deduplication
 */
export async function handleTutorChat(
  request: AITutorChatRequest,
  clientId: string = "anonymous"
): Promise<AIReplyResult> {
  // 1. Rate limiting
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    throw new Error(
      `Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`
    );
  }

  // 2. Input validation & sanitization
  const trimmed = (request.userMessage || "").trim();
  if (!trimmed) {
    throw new Error("Nội dung tin nhắn không được để trống.");
  }
  const sanitizedUserMessage = trimmed.slice(0, MAX_USER_MESSAGE_CHARS);

  // 3. Request deduplication key
  const dedupeKey = `${clientId}:${sanitizedUserMessage.slice(0, 40)}`;
  if (activeInFlightKeys.has(dedupeKey)) {
    throw new Error("Yêu cầu trước đó đang được xử lý. Vui lòng chờ trong giây lát.");
  }
  activeInFlightKeys.add(dedupeKey);

  try {
    const sanitizedRequest: AITutorChatRequest = {
      ...request,
      userMessage: sanitizedUserMessage,
      history: sanitizeHistory(request.history),
    };

    const provider = getAIProvider();
    return await provider.generateReply(sanitizedRequest);
  } finally {
    activeInFlightKeys.delete(dedupeKey);
  }
}

/**
 * High-level service for generating session summary
 */
export async function handleTutorSummary(
  request: AITutorSummaryRequest
): Promise<SessionSummary> {
  const provider = getAIProvider();
  return await provider.generateSummary(request);
}
