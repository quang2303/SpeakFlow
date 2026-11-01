export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type CorrectionMode = "gentle" | "standard" | "intensive";

export type InteractionMode = "text" | "voice";

export type ScenarioCategory =
  | "daily-conversation"
  | "restaurant"
  | "hotel"
  | "airport-travel"
  | "shopping"
  | "hospital"
  | "job-interview"
  | "office-communication"
  | "business-english"
  | "meeting-presentation"
  | "making-friends"
  | "phone-conversation"
  | "custom";

export interface RoleplayScenario {
  id: string;
  category: ScenarioCategory;
  title: string;
  titleVi: string;
  contextVi: string;
  defaultUserRole: string;
  defaultAiRole: string;
  starterAiPrompt: string;
  starterAiPromptVi: string;
  recommendedLevel: CEFRLevel;
  icon: string;
  starterReplies?: Array<{
    en: string;
    vi: string;
  }>;
}

export interface TutorCorrection {
  hasError: boolean;
  errorType: "grammar" | "vocabulary" | "phrasing" | "none";
  originalSentence: string;
  correctedSentence: string;
  explanationVi: string;
  betterAlternative?: string;
  severity: "low" | "medium" | "high";
}

export interface SuggestedReply {
  en: string;
  vi: string;
}

export interface AIReplyResult {
  replyEn: string;
  replyVi: string;
  tutorCorrection: TutorCorrection | null;
  suggestedReplies: SuggestedReply[];
  followUpQuestionEn?: string;
  followUpQuestionVi?: string;
  source: "gemini" | "openai" | "mock" | "builtin";
  isMock?: boolean;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface SessionSummary {
  topic: string;
  cefrLevel: CEFRLevel;
  turnsCount: number;
  durationSeconds: number;
  completionStatus: "completed" | "abandoned";
  accomplishmentScore: number; // 0 - 100
  strengths: string[];
  areasForImprovement: string[];
  grammarFeedback: Array<{
    errorType: string;
    original: string;
    corrected: string;
    explanationVi: string;
  }>;
  vocabularyFeedback: {
    usedWell: string[];
    recommended: Array<{
      wordOrPhrase: string;
      meaningVi: string;
      example: string;
    }>;
  };
  nextRecommendations: string[];
  keyTakeawayCards: Array<{
    phraseEn: string;
    sentenceEn: string;
    meaningVi: string;
    sentenceVi: string;
    contextNote: string;
    level: CEFRLevel;
  }>;
}

export interface RoleplayMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  content_vi?: string;
  tutor_correction?: TutorCorrection | null;
  suggested_replies?: SuggestedReply[];
  is_voice?: boolean;
  audio_match_score?: number;
  created_at: string;
}

export interface RoleplaySession {
  id: string;
  user_id: string | null;
  scenario_id: string;
  topic: string;
  cefr_level: CEFRLevel;
  user_role: string;
  ai_role: string;
  learning_mode: InteractionMode;
  correction_mode: CorrectionMode;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed" | "abandoned";
  summary: SessionSummary | null;
}

export interface AITutorChatRequest {
  userMessage: string;
  scenarioId?: string;
  scenarioTitle?: string;
  scenarioContext?: string;
  userRole?: string;
  aiRole?: string;
  level: CEFRLevel;
  correctionMode: CorrectionMode;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface AITutorSummaryRequest {
  scenarioTitle: string;
  cefrLevel: CEFRLevel;
  durationSeconds: number;
  history: Array<{
    role: "user" | "assistant";
    content: string;
    correction?: TutorCorrection | null;
  }>;
}

export interface AITutorExplainRequest {
  textToExplain: string;
  context?: string;
  userLevel?: CEFRLevel;
}

export interface AIExplanationResult {
  originalText: string;
  vietnameseMeaning: string;
  grammarBreakdown: string;
  naturalCollocations: string[];
  usageTipVi: string;
}
