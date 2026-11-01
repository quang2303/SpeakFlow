import { StreakData } from "./types";

export const STREAK_STORAGE_KEY = "speakflow_streak_v1";

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get current streak information and verify consecutive day continuity.
 * If user skipped 1 or more full days, streak is automatically reset to 0.
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
    if (!raw) {
      return {
        currentStreak: 0,
        lastStudyDate: null,
        todayReviewedCount: 0,
        isStreakActiveToday: false,
        streakStatus: "broken",
      };
    }
    const parsed = JSON.parse(raw) as Partial<StreakData> | null;
    if (!parsed || typeof parsed !== "object") {
      return {
        currentStreak: 0,
        lastStudyDate: null,
        todayReviewedCount: 0,
        isStreakActiveToday: false,
        streakStatus: "broken",
      };
    }

    const storedStreak =
      typeof parsed.currentStreak === "number" && !isNaN(parsed.currentStreak)
        ? Math.max(0, parsed.currentStreak)
        : 0;

    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    // 1. Studied today: streak is fully active and maintained
    if (parsed.lastStudyDate === today) {
      return {
        currentStreak: Math.max(1, storedStreak),
        lastStudyDate: today,
        todayReviewedCount:
          typeof parsed.todayReviewedCount === "number"
            ? parsed.todayReviewedCount
            : 0,
        isStreakActiveToday: true,
        streakStatus: "active_today",
      };
    }

    // 2. Studied yesterday, but not yet today: streak is preserved from yesterday,
    // but at risk if not continued before midnight
    if (parsed.lastStudyDate === yesterday && storedStreak > 0) {
      return {
        currentStreak: storedStreak,
        lastStudyDate: parsed.lastStudyDate,
        todayReviewedCount: 0,
        isStreakActiveToday: false,
        streakStatus: "at_risk",
      };
    }

    // 3. User missed 1 or more days (lastStudyDate < yesterday or null):
    // STREAK IS LOST -> RESET TO 0!
    const brokenStreakData: StreakData = {
      currentStreak: 0,
      lastStudyDate: parsed.lastStudyDate || null,
      todayReviewedCount: 0,
      isStreakActiveToday: false,
      streakStatus: "broken",
    };

    // If storage still holds a positive streak, persist the reset so cache doesn't lie
    if (storedStreak > 0) {
      window.localStorage.setItem(
        STREAK_STORAGE_KEY,
        JSON.stringify(brokenStreakData)
      );
    }

    return brokenStreakData;
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

  const updated: StreakData = {
    currentStreak: nextStreak,
    lastStudyDate: today,
    todayReviewedCount: todayCount,
    isStreakActiveToday: true,
    streakStatus: "active_today",
  };

  window.localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(updated));

  // Notify all UI listeners (Header flame, Dashboard, Profile) of streak update
  try {
    window.dispatchEvent(new Event("speakflow-auth-changed"));
  } catch {
    // ignore
  }

  return updated;
}
