import type {
  AssessmentQuestion,
  AssessmentResponse,
  CEFRLevel,
  SkillCategory,
  SkillScoreSummary,
  TestMode,
} from "./types";

export const SKILL_LABELS_VI: Record<SkillCategory, string> = {
  grammar: "Ngữ pháp (Grammar)",
  vocabulary: "Từ vựng (Vocabulary)",
  reading: "Đọc hiểu (Reading)",
  listening: "Nghe hiểu (Listening)",
  speaking: "Nói & Diễn đạt (Speaking)",
};

export const DEFAULT_FULL_WEIGHTS: Record<SkillCategory, number> = {
  grammar: 0.2,
  vocabulary: 0.2,
  reading: 0.2,
  listening: 0.2,
  speaking: 0.2,
};

/**
 * Objectively grades a multiple-choice or exact-match question
 */
export function scoreObjectiveQuestion(
  question: AssessmentQuestion,
  userAnswer: string
): { isCorrect: boolean; score: number } {
  const normalizedUser = (userAnswer || "").trim().toUpperCase();
  const normalizedKey = (question.correctAnswer || "").trim().toUpperCase();

  // For multiple-choice ("A", "B", "C", "D")
  if (question.type === "multiple_choice" || question.type === "reading_comprehension" || question.type === "listening_comprehension") {
    const isCorrect = normalizedUser === normalizedKey;
    return {
      isCorrect,
      score: isCorrect ? 100 : 0,
    };
  }

  // Exact text match (case-insensitive, normalized spaces)
  const isMatch =
    normalizedUser.replace(/\s+/g, " ") === normalizedKey.replace(/\s+/g, " ");
  return {
    isCorrect: isMatch,
    score: isMatch ? 100 : 0,
  };
}

/**
 * Evaluates a speaking response based on speech recognition transcript
 * Note: Clearly distinguishes speech recognition text matching from acoustic phoneme testing
 */
export function scoreSpeakingQuestion(
  question: AssessmentQuestion,
  spokenText: string,
  speechMatchScore?: number
): { isCorrect: boolean; score: number } {
  const cleanSpoken = (spokenText || "").trim();

  // If no audio was spoken / skipped
  if (!cleanSpoken) {
    return { isCorrect: false, score: 0 };
  }

  // For read aloud sentences: score comes directly from speech recognition word match
  if (question.type === "speaking_read_aloud") {
    if (typeof speechMatchScore === "number") {
      const score = Math.max(0, Math.min(100, Math.round(speechMatchScore)));
      return {
        isCorrect: score >= 70,
        score,
      };
    }

    // Fallback: character-level / word-level match with target sentence
    const targetWords = (question.speakingPrompt?.targetSentence || question.correctAnswer)
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/);
    const spokenWords = cleanSpoken
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/);

    const matches = spokenWords.filter((w) => targetWords.includes(w)).length;
    const computedScore = Math.min(
      100,
      Math.round((matches / Math.max(1, targetWords.length)) * 100)
    );
    return {
      isCorrect: computedScore >= 70,
      score: computedScore,
    };
  }

  // For open conversational response: evaluate communicative length, cohesion, and vocabulary
  const words = cleanSpoken.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let baseScore = 40; // Base score for attempting spoken English
  if (wordCount >= 5) baseScore += 20;
  if (wordCount >= 10) baseScore += 20;
  if (wordCount >= 15) baseScore += 10;

  // Bonus for connective discourse markers (because, although, however, therefore, in my opinion)
  const lower = cleanSpoken.toLowerCase();
  const discourseMarkers = [
    "because",
    "although",
    "however",
    "therefore",
    "in my opinion",
    "for example",
    "firstly",
    "secondly",
    "finally",
    "but",
    "and",
    "so",
  ];
  const hasMarker = discourseMarkers.some((m) => lower.includes(m));
  if (hasMarker) baseScore += 10;

  const finalScore = Math.min(100, baseScore);
  return {
    isCorrect: finalScore >= 60,
    score: finalScore,
  };
}

/**
 * Estimates skill-specific CEFR level from 0-100 score and average question difficulty
 */
export function estimateSkillLevel(score: number, avgDifficulty: number): CEFRLevel {
  // If score is high on high-difficulty questions: C1 or C2
  if (score >= 85) {
    if (avgDifficulty >= 0.75) return "C2";
    if (avgDifficulty >= 0.6) return "C1";
    return "B2";
  }
  if (score >= 70) {
    if (avgDifficulty >= 0.7) return "C1";
    if (avgDifficulty >= 0.5) return "B2";
    return "B1";
  }
  if (score >= 55) {
    if (avgDifficulty >= 0.5) return "B1";
    return "A2";
  }
  if (score >= 40) {
    return "A2";
  }
  return "A1";
}

/**
 * Aggregates all questions and responses into SkillScoreSummary for all 5 skills
 */
export function computeSkillSummaries(
  questions: AssessmentQuestion[],
  responses: Record<string, AssessmentResponse>
): Record<SkillCategory, SkillScoreSummary> {
  const skills: SkillCategory[] = [
    "grammar",
    "vocabulary",
    "reading",
    "listening",
    "speaking",
  ];

  const result: Record<SkillCategory, SkillScoreSummary> = {
    grammar: {
      skill: "grammar",
      skillLabelVi: SKILL_LABELS_VI.grammar,
      score: 0,
      questionsCount: 0,
      correctCount: 0,
      isAssessed: false,
      levelEstimate: "A1",
    },
    vocabulary: {
      skill: "vocabulary",
      skillLabelVi: SKILL_LABELS_VI.vocabulary,
      score: 0,
      questionsCount: 0,
      correctCount: 0,
      isAssessed: false,
      levelEstimate: "A1",
    },
    reading: {
      skill: "reading",
      skillLabelVi: SKILL_LABELS_VI.reading,
      score: 0,
      questionsCount: 0,
      correctCount: 0,
      isAssessed: false,
      levelEstimate: "A1",
    },
    listening: {
      skill: "listening",
      skillLabelVi: SKILL_LABELS_VI.listening,
      score: 0,
      questionsCount: 0,
      correctCount: 0,
      isAssessed: false,
      levelEstimate: "A1",
    },
    speaking: {
      skill: "speaking",
      skillLabelVi: SKILL_LABELS_VI.speaking,
      score: 0,
      questionsCount: 0,
      correctCount: 0,
      isAssessed: false,
      levelEstimate: "A1",
    },
  };

  const questionMap = new Map<string, AssessmentQuestion>();
  for (const q of questions) {
    questionMap.set(q.id, q);
    result[q.skill].questionsCount++;
  }

  // Accumulate scores per skill
  const skillPoints: Record<SkillCategory, { totalScore: number; answeredCount: number; sumDifficulty: number }> = {
    grammar: { totalScore: 0, answeredCount: 0, sumDifficulty: 0 },
    vocabulary: { totalScore: 0, answeredCount: 0, sumDifficulty: 0 },
    reading: { totalScore: 0, answeredCount: 0, sumDifficulty: 0 },
    listening: { totalScore: 0, answeredCount: 0, sumDifficulty: 0 },
    speaking: { totalScore: 0, answeredCount: 0, sumDifficulty: 0 },
  };

  for (const [qId, resp] of Object.entries(responses)) {
    const q = questionMap.get(qId);
    if (!q) continue;

    const skill = q.skill;
    skillPoints[skill].answeredCount++;
    skillPoints[skill].totalScore += resp.score;
    skillPoints[skill].sumDifficulty += q.difficulty;

    if (resp.isCorrect) {
      result[skill].correctCount++;
    }
  }

  // Calculate normalized 0-100 scores
  for (const skill of skills) {
    const data = skillPoints[skill];
    if (data.answeredCount > 0) {
      result[skill].isAssessed = true;
      result[skill].score = Math.round(data.totalScore / data.answeredCount);
      const avgDiff = data.sumDifficulty / data.answeredCount;
      result[skill].levelEstimate = estimateSkillLevel(result[skill].score, avgDiff);
    } else {
      result[skill].isAssessed = false;
      result[skill].score = 0;
      result[skill].levelEstimate = "A1";
    }
  }

  return result;
}

/**
 * Calculates weighted overall score with dynamic reallocation for unassessed/skipped skills
 */
export function computeOverallScore(
  skillScores: Record<SkillCategory, SkillScoreSummary>,
  mode: TestMode
): number {
  let baseWeights: Record<SkillCategory, number>;

  switch (mode) {
    case "grammar_vocab":
      baseWeights = {
        grammar: 0.5,
        vocabulary: 0.5,
        reading: 0,
        listening: 0,
        speaking: 0,
      };
      break;

    case "speaking_only":
      baseWeights = {
        grammar: 0,
        vocabulary: 0,
        reading: 0,
        listening: 0,
        speaking: 1.0,
      };
      break;

    case "quick":
    case "full":
    default:
      baseWeights = { ...DEFAULT_FULL_WEIGHTS };
      break;
  }

  // Identify assessed skills that have weight > 0
  const assessedWeights: Partial<Record<SkillCategory, number>> = {};
  let totalAssessedWeight = 0;

  for (const [skillKey, weight] of Object.entries(baseWeights)) {
    const skill = skillKey as SkillCategory;
    if (weight > 0 && skillScores[skill].isAssessed) {
      assessedWeights[skill] = weight;
      totalAssessedWeight += weight;
    }
  }

  // If no skill was assessed
  if (totalAssessedWeight === 0) return 0;

  // Re-normalize weights so they sum to 1.0
  let weightedSum = 0;
  for (const [skillKey, weight] of Object.entries(assessedWeights)) {
    const skill = skillKey as SkillCategory;
    const normalizedWeight = (weight || 0) / totalAssessedWeight;
    weightedSum += skillScores[skill].score * normalizedWeight;
  }

  return Math.round(weightedSum);
}
