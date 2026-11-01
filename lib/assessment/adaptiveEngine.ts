import type {
  AssessmentQuestion,
  AssessmentResponse,
  AssessmentResult,
  PublicQuestion,
  SkillCategory,
  SkillScoreSummary,
  TestMode,
} from "./types";

export interface AdaptiveStageState {
  stage: 1 | 2;
  mode: TestMode;
  assignedQuestionIds: string[];
  stage1Score?: number;
}

export interface AssessmentEvaluationEngineDeps {
  getAllQuestions?: () => AssessmentQuestion[];
  getQuestionsForTestMode?: (mode: TestMode) => AssessmentQuestion[];
  sanitizeQuestionForClient?: (q: AssessmentQuestion) => PublicQuestion;
  scoreObjectiveQuestion?: (
    q: AssessmentQuestion,
    a: string
  ) => { isCorrect: boolean; score: number };
  scoreSpeakingQuestion?: (
    q: AssessmentQuestion,
    s: string,
    m?: number
  ) => { isCorrect: boolean; score: number };
  computeSkillSummaries?: (
    questions: AssessmentQuestion[],
    responses: Record<string, AssessmentResponse>
  ) => Record<SkillCategory, SkillScoreSummary>;
  computeOverallScore?: (
    skills: Record<SkillCategory, SkillScoreSummary>,
    mode: TestMode
  ) => number;
  estimateCefrProfile?: (
    overallScore: number,
    skillScores: Record<SkillCategory, SkillScoreSummary>,
    responses: AssessmentResponse[]
  ) => any;
}

function resolveEngineDependencies(
  overrides?: AssessmentEvaluationEngineDeps
): Required<AssessmentEvaluationEngineDeps> {
  let qb: any = null;
  let sc: any = null;
  let cf: any = null;

  try {
    // eslint-disable-next-line
    const r = typeof require !== "undefined" ? require : null;
    if (r) {
      try {
        qb = r("./questionBank.ts");
        sc = r("./scoring.ts");
        cf = r("./cefrEstimator.ts");
      } catch {
        qb = r("./questionBank");
        sc = r("./scoring");
        cf = r("./cefrEstimator");
      }
    }
  } catch {
    // Fallback if environment restricts synchronous require
  }

  return {
    getAllQuestions: overrides?.getAllQuestions || qb?.getAllQuestions || (() => []),
    getQuestionsForTestMode:
      overrides?.getQuestionsForTestMode ||
      qb?.getQuestionsForTestMode ||
      (() => []),
    sanitizeQuestionForClient:
      overrides?.sanitizeQuestionForClient ||
      qb?.sanitizeQuestionForClient ||
      ((q: AssessmentQuestion) => q as unknown as PublicQuestion),
    scoreObjectiveQuestion:
      overrides?.scoreObjectiveQuestion ||
      sc?.scoreObjectiveQuestion ||
      (() => ({ isCorrect: false, score: 0 })),
    scoreSpeakingQuestion:
      overrides?.scoreSpeakingQuestion ||
      sc?.scoreSpeakingQuestion ||
      (() => ({ isCorrect: false, score: 0 })),
    computeSkillSummaries:
      overrides?.computeSkillSummaries ||
      sc?.computeSkillSummaries ||
      (() => ({} as any)),
    computeOverallScore:
      overrides?.computeOverallScore || sc?.computeOverallScore || (() => 0),
    estimateCefrProfile:
      overrides?.estimateCefrProfile ||
      cf?.estimateCefrProfile ||
      (() => ({
        estimatedLevel: "A1",
        possibleRange: "A1",
        confidence: "low",
        strengths: [],
        weaknesses: [],
        recommendations: [],
        recommendedLearningLevel: "A1",
      })),
  };
}

/**
 * Initializes a structured test session based on chosen TestMode
 */
export function initializeTestQuestions(
  mode: TestMode,
  deps?: AssessmentEvaluationEngineDeps
): PublicQuestion[] {
  const { getQuestionsForTestMode, sanitizeQuestionForClient } =
    resolveEngineDependencies(deps);
  const secureQuestions = getQuestionsForTestMode(mode);
  return secureQuestions.map(sanitizeQuestionForClient);
}

/**
 * Evaluates whether test has enough data to conclude or reached target quota
 */
export function checkTestCompletion(
  mode: TestMode,
  answeredCount: number,
  totalAssigned: number
): boolean {
  if (answeredCount >= totalAssigned) return true;

  // Early termination rule for Quick mode if confidence is already clear
  if (mode === "quick" && answeredCount >= 12) {
    return true;
  }
  return false;
}

/**
 * Processes completed test responses and produces the official AssessmentResult
 */
export function evaluateAssessmentSubmission(
  mode: TestMode,
  userResponses: Record<
    string,
    {
      answer: string;
      spokenText?: string;
      speechMatchScore?: number;
      responseTimeMs?: number;
    }
  >,
  userId: string | null = null,
  durationSeconds: number = 0,
  deps?: AssessmentEvaluationEngineDeps
): AssessmentResult {
  const resolved = resolveEngineDependencies(deps);
  const allBank = resolved.getAllQuestions();
  const bankMap = new Map<string, AssessmentQuestion>();
  for (const q of allBank) {
    bankMap.set(q.id, q);
  }

  const evaluatedResponses: AssessmentResponse[] = [];
  const responsesRecord: Record<string, AssessmentResponse> = {};
  let correctCount = 0;

  for (const [qId, input] of Object.entries(userResponses)) {
    const question = bankMap.get(qId);
    if (!question) continue;

    let evalResult: { isCorrect: boolean; score: number };

    if (question.skill === "speaking") {
      evalResult = resolved.scoreSpeakingQuestion(
        question,
        input.spokenText || input.answer,
        input.speechMatchScore
      );
    } else {
      evalResult = resolved.scoreObjectiveQuestion(question, input.answer);
    }

    if (evalResult.isCorrect) correctCount++;

    const responseObj: AssessmentResponse = {
      questionId: qId,
      skill: question.skill,
      userAnswer: input.answer,
      spokenText: input.spokenText,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      responseTimeMs: input.responseTimeMs,
    };

    evaluatedResponses.push(responseObj);
    responsesRecord[qId] = responseObj;
  }

  // 1. Compute skill score summaries
  const testedQuestions = evaluatedResponses
    .map((r) => bankMap.get(r.questionId))
    .filter((q): q is AssessmentQuestion => Boolean(q));

  const skillScores = resolved.computeSkillSummaries(
    testedQuestions,
    responsesRecord
  );

  // 2. Compute overall score
  const overallScore = resolved.computeOverallScore(
    skillScores,
    mode
  );

  // 3. Estimate CEFR profile
  const cefrProfile = resolved.estimateCefrProfile(
    overallScore,
    skillScores,
    evaluatedResponses
  );

  const assessedSkills = (
    Object.keys(skillScores) as (keyof typeof skillScores)[]
  ).filter((s) => skillScores[s]?.isAssessed);

  const resultId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: resultId,
    attemptId,
    userId,
    mode,
    estimatedCefrLevel: cefrProfile.estimatedLevel,
    possibleLevelRange: cefrProfile.possibleRange,
    confidenceLevel: cefrProfile.confidence,
    overallScore,
    skillScores,
    assessedSkills,
    strengths: cefrProfile.strengths,
    weaknesses: cefrProfile.weaknesses,
    recommendations: cefrProfile.recommendations,
    recommendedLearningLevel: cefrProfile.recommendedLearningLevel,
    completedAt: new Date().toISOString(),
    durationSeconds,
    totalQuestions: evaluatedResponses.length,
    correctAnswersCount: correctCount,
    isComplete: true,
    responses: evaluatedResponses,
  };
}
