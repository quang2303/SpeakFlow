export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type SkillCategory =
  | "grammar"
  | "vocabulary"
  | "reading"
  | "listening"
  | "speaking";

export type QuestionType =
  | "multiple_choice"
  | "fill_blank"
  | "error_identification"
  | "sentence_transformation"
  | "reading_comprehension"
  | "listening_comprehension"
  | "speaking_read_aloud"
  | "speaking_open_response";

export type TestMode =
  | "quick" // 12-15 questions, ~10-15 mins (Grammar, Vocab, Reading, Listening, Speaking)
  | "full" // 25-30 questions, ~25-35 mins (All 5 skills in depth)
  | "grammar_vocab" // 15 questions, Grammar & Vocab only
  | "speaking_only"; // 6 questions, Speaking only

export type ConfidenceLevel = "low" | "medium" | "high";

export interface QuestionChoice {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface AssessmentQuestion {
  id: string;
  skill: SkillCategory;
  level: CEFRLevel;
  type: QuestionType;
  difficulty: number; // 0.1 (easiest A1) to 1.0 (hardest C2)
  topic: string;
  prompt: string;
  subPrompt?: string;
  choices?: QuestionChoice[];
  readingPassage?: {
    title: string;
    content: string;
  };
  audioPrompt?: {
    transcriptForPlayer: string; // Used for synthesized audio or audio player
    allowedPlays: number; // Max times audio can be replayed (e.g. 2 or 3)
  };
  speakingPrompt?: {
    targetSentence?: string; // For read_aloud
    contextScenario?: string; // For open_response
    sampleIdealResponse?: string;
  };
  correctAnswer: string; // Hidden from client until submitted
  explanationVi: string; // Hidden from client until submitted
}

/**
 * Public question safe to send to client during the active test session
 * Omits `correctAnswer` and `explanationVi` to prevent client-side answer inspection
 */
export type PublicQuestion = Omit<
  AssessmentQuestion,
  "correctAnswer" | "explanationVi"
>;

export interface AssessmentResponse {
  questionId: string;
  skill: SkillCategory;
  userAnswer: string; // Option letter ("A", "B", etc.) or text
  spokenText?: string;
  isCorrect?: boolean;
  score: number; // 0 to 100 for this question
  responseTimeMs?: number;
  speechEvaluation?: {
    matchScore: number;
    clarityScore: number;
    recognizedText: string;
  };
}

export interface SkillScoreSummary {
  skill: SkillCategory;
  skillLabelVi: string;
  score: number; // 0 to 100
  questionsCount: number;
  correctCount: number;
  isAssessed: boolean;
  levelEstimate: CEFRLevel;
}

export interface AssessmentResult {
  id: string;
  attemptId: string;
  userId: string | null;
  mode: TestMode;
  estimatedCefrLevel: CEFRLevel;
  possibleLevelRange: string; // e.g. "A2–B1", "B1–B2"
  confidenceLevel: ConfidenceLevel;
  overallScore: number; // 0 to 100 weighted
  skillScores: Record<SkillCategory, SkillScoreSummary>;
  assessedSkills: SkillCategory[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recommendedLearningLevel: CEFRLevel;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctAnswersCount: number;
  isComplete: boolean;
  responses: AssessmentResponse[];
}

export interface AssessmentAttempt {
  id: string;
  userId: string | null;
  mode: TestMode;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  currentQuestionIndex: number;
  responses: Record<string, AssessmentResponse>;
  audioPlaysRemaining: Record<string, number>;
  result?: AssessmentResult;
}

export interface AssessmentStats {
  totalAttempts: number;
  levelDistribution: Record<CEFRLevel, number>;
  averageScoresBySkill: Record<SkillCategory, number>;
  averageOverallScore: number;
  latestAttemptDate?: string;
}
