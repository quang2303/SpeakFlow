import {
  AssessmentResult,
  AssessmentStats,
  CEFRLevel,
  SkillCategory,
} from "./types";
import { getStoredUserProfile, getSupabaseClient } from "@/lib/dataService";
import { getActiveGoal, saveGoal } from "@/lib/learningPath/service";
import { LearningGoal, SkillPriority } from "@/lib/learningPath/types";

const ASSESSMENT_STORAGE_KEYS = {
  RESULTS: "speakflow_assessment_results_v1",
  LATEST: "speakflow_assessment_latest_v1",
};

export function getAssessmentStoragePrefix(userId?: string | null): string {
  if (userId) return `user_${userId}_`;
  if (typeof window !== "undefined") {
    const user = getStoredUserProfile();
    if (user?.id) return `user_${user.id}_`;
  }
  return "guest_";
}

/**
 * Persists assessment result to LocalStorage and triggers background Supabase sync
 */
export async function saveAssessmentResult(
  result: AssessmentResult,
  userId?: string | null
): Promise<void> {
  const prefix = getAssessmentStoragePrefix(userId);

  if (typeof window !== "undefined") {
    try {
      // 1. Save as latest
      window.localStorage.setItem(
        `${prefix}${ASSESSMENT_STORAGE_KEYS.LATEST}`,
        JSON.stringify(result)
      );

      // 2. Append to history list
      const historyKey = `${prefix}${ASSESSMENT_STORAGE_KEYS.RESULTS}`;
      const existingRaw = window.localStorage.getItem(historyKey);
      const history: AssessmentResult[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      
      // Keep up to 20 recent attempts
      const updated = [result, ...history.filter((h) => h.id !== result.id)].slice(
        0,
        20
      );
      window.localStorage.setItem(historyKey, JSON.stringify(updated));
    } catch {
      // Ignore storage errors in restricted private browsing
    }
  }

  // 3. Supabase Cloud Sync (if online and authenticated)
  const supabase = getSupabaseClient();
  const effectiveUserId =
    userId || (typeof window !== "undefined" ? getStoredUserProfile()?.id : null);

  if (supabase && effectiveUserId) {
    try {
      await supabase.from("assessment_attempts").upsert({
        id: result.attemptId,
        user_id: effectiveUserId,
        test_type: result.mode,
        status: "completed",
        started_at: result.completedAt,
        completed_at: result.completedAt,
        duration_seconds: result.durationSeconds,
        estimated_cefr_level: result.estimatedCefrLevel,
        possible_level_range: result.possibleLevelRange,
        confidence_level: result.confidenceLevel,
        scoring_version: 1,
      });

      await supabase.from("assessment_results").upsert({
        id: result.id,
        attempt_id: result.attemptId,
        grammar_score: result.skillScores.grammar.score,
        vocabulary_score: result.skillScores.vocabulary.score,
        reading_score: result.skillScores.reading.score,
        listening_score: result.skillScores.listening.score,
        speaking_score: result.skillScores.speaking.score,
        assessed_skills: result.assessedSkills,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        result_data: result,
      });
    } catch {
      // Cloud sync failure is tolerated gracefully in offline-first architecture
    }
  }
}

/**
 * Retrieves the most recent assessment result
 */
export function getLatestAssessmentResult(
  userId?: string | null
): AssessmentResult | null {
  if (typeof window === "undefined") return null;
  try {
    const prefix = getAssessmentStoragePrefix(userId);
    const raw = window.localStorage.getItem(
      `${prefix}${ASSESSMENT_STORAGE_KEYS.LATEST}`
    );
    if (!raw) return null;
    return JSON.parse(raw) as AssessmentResult;
  } catch {
    return null;
  }
}

/**
 * Retrieves all past assessment results
 */
export function getAssessmentHistory(
  userId?: string | null
): AssessmentResult[] {
  if (typeof window === "undefined") return [];
  try {
    const prefix = getAssessmentStoragePrefix(userId);
    const raw = window.localStorage.getItem(
      `${prefix}${ASSESSMENT_STORAGE_KEYS.RESULTS}`
    );
    if (!raw) return [];
    return JSON.parse(raw) as AssessmentResult[];
  } catch {
    return [];
  }
}

/**
 * Computes analytics stats for admin or profile overview
 */
export function getAssessmentStats(userId?: string | null): AssessmentStats {
  const history = getAssessmentHistory(userId);
  const totalAttempts = history.length;

  const levelDistribution: Record<CEFRLevel, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };

  const skillSums: Record<SkillCategory, number> = {
    grammar: 0,
    vocabulary: 0,
    reading: 0,
    listening: 0,
    speaking: 0,
  };
  const skillCounts: Record<SkillCategory, number> = {
    grammar: 0,
    vocabulary: 0,
    reading: 0,
    listening: 0,
    speaking: 0,
  };

  let overallSum = 0;

  for (const h of history) {
    if (h.estimatedCefrLevel && levelDistribution[h.estimatedCefrLevel] !== undefined) {
      levelDistribution[h.estimatedCefrLevel]++;
    }
    overallSum += h.overallScore;

    for (const [sk, summary] of Object.entries(h.skillScores)) {
      const skillKey = sk as SkillCategory;
      if (summary.isAssessed) {
        skillSums[skillKey] += summary.score;
        skillCounts[skillKey]++;
      }
    }
  }

  const averageScoresBySkill: Record<SkillCategory, number> = {
    grammar: skillCounts.grammar > 0 ? Math.round(skillSums.grammar / skillCounts.grammar) : 0,
    vocabulary: skillCounts.vocabulary > 0 ? Math.round(skillSums.vocabulary / skillCounts.vocabulary) : 0,
    reading: skillCounts.reading > 0 ? Math.round(skillSums.reading / skillCounts.reading) : 0,
    listening: skillCounts.listening > 0 ? Math.round(skillSums.listening / skillCounts.listening) : 0,
    speaking: skillCounts.speaking > 0 ? Math.round(skillSums.speaking / skillCounts.speaking) : 0,
  };

  return {
    totalAttempts,
    levelDistribution,
    averageScoresBySkill,
    averageOverallScore: totalAttempts > 0 ? Math.round(overallSum / totalAttempts) : 0,
    latestAttemptDate: history[0]?.completedAt,
  };
}

/**
 * Seamlessly bridges Placement Test result to Learning Path (Prompt 04)
 * Updates or pre-configures user learning goal with diagnosed CEFR level & skill priorities
 */
export async function bridgeAssessmentToLearningGoal(
  result: AssessmentResult,
  userId?: string | null
): Promise<LearningGoal> {
  const existingGoal = getActiveGoal();

  // Determine skill priority: skills with lower scores get higher study priority
  const prioritizedSkills: SkillPriority[] = [];
  const assessed = Object.entries(result.skillScores).filter(([, s]) => s.isAssessed);
  assessed.sort(([, a], [, b]) => a.score - b.score);

  for (const [skillKey] of assessed) {
    if (skillKey === "speaking") prioritizedSkills.push("speaking");
    else if (skillKey === "listening") prioritizedSkills.push("listening");
    else if (skillKey === "vocabulary") prioritizedSkills.push("vocabulary");
    else if (skillKey === "grammar") prioritizedSkills.push("grammar");
    else if (skillKey === "reading") prioritizedSkills.push("reading");
  }

  // Ensure speaking and listening are included if empty
  if (!prioritizedSkills.includes("speaking")) prioritizedSkills.push("speaking");
  if (!prioritizedSkills.includes("listening")) prioritizedSkills.push("listening");

  const targetLevelMap: Record<CEFRLevel, CEFRLevel> = {
    A1: "A2",
    A2: "B1",
    B1: "B2",
    B2: "C1",
    C1: "C2",
    C2: "C2",
  };

  const currentLevel = result.recommendedLearningLevel || result.estimatedCefrLevel;
  const targetLevel = targetLevelMap[currentLevel] || "B2";

  const goalToSave: LearningGoal = {
    id: existingGoal?.id || `goal_${Date.now()}`,
    user_id: userId || existingGoal?.user_id || null,
    title: existingGoal?.title || `Lộ trình chinh phục ${targetLevel} từ bài kiểm tra`,
    description: `Khởi tạo dựa trên kết quả Placement Test (${result.estimatedCefrLevel} - Điểm: ${result.overallScore}/100)`,
    primary_goal: existingGoal?.primary_goal || "general_english",
    current_level: currentLevel,
    target_level: targetLevel,
    daily_minutes: existingGoal?.daily_minutes || 20,
    days_per_week: existingGoal?.days_per_week || 5,
    rest_days: existingGoal?.rest_days || [0, 6],
    preferred_skills: prioritizedSkills,
    start_date: existingGoal?.start_date || new Date().toISOString().split("T")[0],
    target_date:
      existingGoal?.target_date ||
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    duration_days: existingGoal?.duration_days || 30,
    status: "active",
    created_at: existingGoal?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    placement_test_result: {
      level: result.estimatedCefrLevel,
      test_date: result.completedAt,
      scores: {
        overall: result.overallScore,
        grammar: result.skillScores.grammar.score,
        vocabulary: result.skillScores.vocabulary.score,
        reading: result.skillScores.reading.score,
        listening: result.skillScores.listening.score,
        speaking: result.skillScores.speaking.score,
      },
      weaknesses: result.weaknesses,
    },
  };

  return await saveGoal(goalToSave);
}
