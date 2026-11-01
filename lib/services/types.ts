import { Card, CEFRLevel, Deck } from "../seedData";
import { SRSRating } from "../srs";

export interface StreakData {
  currentStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  todayReviewedCount: number;
  isStreakActiveToday?: boolean;
  streakStatus?: "active_today" | "at_risk" | "broken";
}

export type UserRole = "admin" | "student";
export type UserAccountStatus = "active" | "locked";

export interface UserProfile {
  id: string; // UUID
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  status: UserAccountStatus;
  provider?: "google" | "credentials" | "demo";
  persona_label?: string;
  password?: string;
  last_synced_at?: string;
}

export interface DemoAccountPreset extends UserProfile {
  persona_label: string;
  badge_color: "indigo" | "emerald" | "amber" | "rose";
  description: string;
  preset_streak: number;
  preset_practiced_count: number;
  preset_mastered_count: number;
  preset_avg_pronunciation: number;
  frequent_red_words: string[];
}

export interface StudyActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  mode: "study" | "shadowing" | "reflex" | "roleplay";
  card_id?: string;
  phrase_en: string;
  sentence_en: string;
  spoken_text?: string;
  score: number;
  rating?: SRSRating;
  mispronounced_words: string[];
  created_at: string;
}

export interface AccountProgressSummary {
  totalCards: number;
  practicedCards: number;
  masteredCards: number;
  dueCards: number;
  currentStreak: number;
  todayReviewedCount: number;
  lastStudyDate: string | null;
  lastSyncedAt: string | null;
}

export type StorageMode = "supabase" | "local";

export interface AdminDailyActivityPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g., "T2", "T3", "Hôm nay"
  phrasesCount: number;
  minutes: number;
}

export interface AdminRedWordInsight {
  word: string;
  heardAs: string;
  sentenceEn: string;
  phraseEn: string;
  errorCount: number;
}

export interface AdminStudentMetrics {
  profile: UserProfile;
  streak: number;
  totalMinutes: number;
  totalCards: number;
  practicedCount: number;
  masteredCount: number;
  box1Count: number;
  box23Count: number;
  box45Count: number;
  progressPercent: number;
  avgPronunciation: number;
  lastActiveAt: string;
  daysInactive: number;
  studiedToday: boolean;
  isAtRisk: boolean;
  redWords: string[];
  redWordDetails: AdminRedWordInsight[];
  dailyActivity7Days: AdminDailyActivityPoint[];
  recentLogs: StudyActivityLog[];
}

/**
 * Progress snapshot used for per-card sync and conflict resolution
 */
export interface ProgressSnapshot {
  box: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string;
}

/**
 * Outbox actions for resilient offline syncing
 */
export interface PendingCardAction {
  id: string; // Action unique ID
  action: "create" | "update" | "delete";
  card?: Card;
  cardId?: string;
  userId?: string | null;
  timestamp: number;
  retryCount?: number;
}

export interface PendingDeckAction {
  id: string; // Action unique ID
  action: "create" | "update" | "delete";
  deck?: Deck;
  deckId?: string;
  userId?: string | null;
  timestamp: number;
  retryCount?: number;
}

export interface PendingProgressAction {
  id: string; // Action unique ID (cardId + timestamp dedup)
  userId: string;
  cardId: string;
  box: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string;
  rating?: SRSRating;
  timestamp: number;
  retryCount?: number;
}

export interface PendingStudyLogAction {
  id: string; // Log ID
  userId: string;
  log: StudyActivityLog;
  timestamp: number;
  retryCount?: number;
}
