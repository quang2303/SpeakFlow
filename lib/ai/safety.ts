import type { AITutorChatRequest } from "./types";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25; // max 25 calls per minute per user/IP

export const MAX_HISTORY_MESSAGES = 8; // Latest 4 back-and-forth turns
export const MAX_USER_MESSAGE_CHARS = 500;

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { timestamps: [] };

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  record.timestamps.push(now);
  rateLimitMap.set(identifier, record);
  return { allowed: true };
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

/**
 * Truncate long history to latest N messages to control token costs
 */
export function sanitizeHistory(
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): Array<{ role: "user" | "assistant"; content: string }> {
  const slice = history.slice(-MAX_HISTORY_MESSAGES);
  return slice.map((item) => ({
    role: item.role,
    content: item.content.slice(0, MAX_USER_MESSAGE_CHARS),
  }));
}
