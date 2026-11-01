import type { StreakData } from "./types";

export const STREAK_STORAGE_KEY = "speakflow_streak_v1";

export function getTodayDateString(refDate = new Date()): string {
  return `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(refDate.getDate()).padStart(2, "0")}`;
}

export function getYesterdayDateString(refDate = new Date()): string {
  const d = new Date(refDate);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Pure evaluation function for streak status and continuity
 */
export function evaluateStreakStatus(
  stored: Partial<StreakData> | null,
  today: string,
  yesterday: string
): StreakData {
  if (!stored || typeof stored !== "object") {
    return {
      currentStreak: 0,
      lastStudyDate: null,
      todayReviewedCount: 0,
      isStreakActiveToday: false,
      streakStatus: "broken",
    };
  }

  const storedStreak =
    typeof stored.currentStreak === "number" && !isNaN(stored.currentStreak)
      ? Math.max(0, stored.currentStreak)
      : 0;

  // 1. Studied today: streak active and maintained
  if (stored.lastStudyDate === today) {
    return {
      currentStreak: Math.max(1, storedStreak),
      lastStudyDate: today,
      todayReviewedCount:
        typeof stored.todayReviewedCount === "number"
          ? stored.todayReviewedCount
          : 0,
      isStreakActiveToday: true,
      streakStatus: "active_today",
    };
  }

  // 2. Studied yesterday, but not yet today: streak preserved from yesterday,
  // at risk if not studied before midnight
  if (stored.lastStudyDate === yesterday && storedStreak > 0) {
    return {
      currentStreak: storedStreak,
      lastStudyDate: stored.lastStudyDate,
      todayReviewedCount: 0,
      isStreakActiveToday: false,
      streakStatus: "at_risk",
    };
  }

  // 3. User missed 1 or more days: STREAK IS LOST -> RESET TO 0!
  return {
    currentStreak: 0,
    lastStudyDate: stored.lastStudyDate || null,
    todayReviewedCount: 0,
    isStreakActiveToday: false,
    streakStatus: "broken",
  };
}

/**
 * Pure calculation for updating streak after a completed study activity
 */
export function computeNextStreakAfterStudy(
  current: StreakData,
  today: string,
  yesterday: string,
  incrementCount = 1
): StreakData {
  let nextStreak = 1;
  let todayCount = incrementCount;

  if (current.lastStudyDate === today) {
    // Already reviewed today: keep current streak and increment count
    nextStreak = Math.max(1, current.currentStreak);
    todayCount = (current.todayReviewedCount || 0) + incrementCount;
  } else if (current.lastStudyDate === yesterday && current.currentStreak > 0) {
    // Studied yesterday: consecutive day achieved! Increment streak
    nextStreak = current.currentStreak + 1;
    todayCount = incrementCount;
  } else {
    // Missed yesterday (lost streak) or first time ever: start fresh streak of 1 day
    nextStreak = 1;
    todayCount = incrementCount;
  }

  return {
    currentStreak: nextStreak,
    lastStudyDate: today,
    todayReviewedCount: todayCount,
    isStreakActiveToday: true,
    streakStatus: "active_today",
  };
}

/**
 * Get current streak information from localStorage and verify consecutive day continuity.
 */
export function getStreakData(): StreakData {
  if (typeof window === "undefined") {
    return {
      currentStreak: 0,
      lastStudyDate: null,
      todayReviewedCount: 0,
      isStreakActiveToday: false,
      streakStatus: "broken",
    };
  }

  try {
    const raw = window.localStorage.getItem(STREAK_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StreakData>) : null;

    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    const evaluated = evaluateStreakStatus(parsed, today, yesterday);

    // If storage held an obsolete positive streak that is now broken, persist the reset
    if (parsed && (parsed.currentStreak || 0) > 0 && evaluated.currentStreak === 0) {
      window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(evaluated));
    }

    return evaluated;
  } catch {
    return {
      currentStreak: 0,
      lastStudyDate: null,
      todayReviewedCount: 0,
      isStreakActiveToday: false,
      streakStatus: "broken",
    };
  }
}

/**
 * Record a completed study activity, incrementing today's count and maintaining the streak.
 */
export function recordStudyActivity(incrementCount = 1): StreakData {
  if (typeof window === "undefined") {
    return {
      currentStreak: 1,
      lastStudyDate: null,
      todayReviewedCount: incrementCount,
      isStreakActiveToday: true,
      streakStatus: "active_today",
    };
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const current = getStreakData();

  const updated = computeNextStreakAfterStudy(current, today, yesterday, incrementCount);

  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));

  try {
    window.dispatchEvent(new Event("speakflow-auth-changed"));
  } catch {
    // ignore
  }

  return updated;
}
