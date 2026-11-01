import type {
  AIReplyResult,
  AITutorChatRequest,
  AITutorSummaryRequest,
  SessionSummary,
} from "../types";

export interface AIProvider {
  name: string;
  generateReply(request: AITutorChatRequest): Promise<AIReplyResult>;
  generateSummary(request: AITutorSummaryRequest): Promise<SessionSummary>;
}
