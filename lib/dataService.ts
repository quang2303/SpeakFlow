import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Card, Deck, SEED_CARDS, SEED_DECKS } from "./seedData";
import { calculateNextSRS, isCardDue, SRSRating } from "./srs";

const STORAGE_KEYS = {
  DECKS: "speakflow_decks_v1",
  CARDS: "speakflow_cards_v1",
  STREAK: "speakflow_streak_v1",
  FORCE_LOCAL: "speakflow_force_local_v1",
  USER_PROFILE: "speakflow_user_profile_v1",
  ACCOUNTS_REGISTRY: "speakflow_accounts_registry_v1",
  ACTIVITY_LOGS: "speakflow_activity_logs_v1",
  ADMIN_OVERRIDES: "speakflow_admin_overrides_v1",
  ADMIN_DELETED_IDS: "speakflow_admin_deleted_ids_v1",
};

const DEFAULT_SUPABASE_URL = "https://ncfudvrowukvppppexcf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "sb_publishable_R4qlwEYBtVqTCeNHKH6HdQ_29XF8ceW";

export interface StreakData {
  currentStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  todayReviewedCount: number;
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

export const DEMO_ACCOUNTS: DemoAccountPreset[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    email: "admin@speakflow.vn",
    password: "123",
    full_name: "Quản trị viên (Admin)",
    role: "admin",
    status: "active",
    provider: "demo",
    persona_label: "🛡️ Quản trị viên (Admin)",
    badge_color: "indigo",
    description:
      "Toàn quyền quản lý học viên, mở/khóa tài khoản & theo dõi thống kê phát âm.",
    preset_streak: 30,
    preset_practiced_count: 85,
    preset_mastered_count: 68,
    preset_avg_pronunciation: 96,
    frequent_red_words: [],
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    email: "chamchi@speakflow.vn",
    password: "123",
    full_name: "Nguyễn Minh Anh",
    role: "student",
    status: "active",
    provider: "demo",
    persona_label: "🔥 Học viên chăm chỉ",
    badge_color: "emerald",
    description:
      "Streak 14 ngày liên tiếp • Đã luyện 42/100 mẫu câu • Phát âm chuẩn 92%.",
    preset_streak: 14,
    preset_practiced_count: 42,
    preset_mastered_count: 28,
    preset_avg_pronunciation: 92,
    frequent_red_words: ["thoroughly", "itinerary"],
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    email: "phatamyeu@speakflow.vn",
    password: "123",
    full_name: "Trần Hoàng Nam",
    role: "student",
    status: "active",
    provider: "demo",
    persona_label: "⚠️ Học viên phát âm yếu",
    badge_color: "amber",
    description:
      "Điểm phát âm TB 54% • Thường đọc sai nhiều từ (schedule, aisle, bottleneck...).",
    preset_streak: 3,
    preset_practiced_count: 18,
    preset_mastered_count: 4,
    preset_avg_pronunciation: 54,
    frequent_red_words: [
      "schedule",
      "aisle",
      "bottleneck",
      "comfortable",
      "colleague",
      "rain check",
    ],
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    email: "bikhoa@speakflow.vn",
    password: "123",
    full_name: "Lê Quốc Bảo",
    role: "student",
    status: "locked",
    provider: "demo",
    persona_label: "🔒 Tài khoản bị khóa",
    badge_color: "rose",
    description:
      "Tài khoản đang tạm khóa (`status = locked`) — Chặn truy cập /study, /reflex, /roleplay.",
    preset_streak: 1,
    preset_practiced_count: 6,
    preset_mastered_count: 1,
    preset_avg_pronunciation: 65,
    frequent_red_words: ["scratch", "deadline"],
  },
];

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

let supabaseInstance: SupabaseClient | null = null;
let authListenerInitialized = false;
let activeSyncPromise: Promise<void> | null = null;
let activeGetUserPromise: Promise<UserProfile | null> | null = null;
let lastSyncedUserId: string | null = null;
let urlOAuthConsumed = false;
let pendingOAuthTokens: {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
} | null = null;
let cachedGoogleOAuthEnabled: boolean | null = null;
let lastNotifiedStateHash = "";

const SUPABASE_AUTH_STORAGE_KEY = "speakflow_supabase_auth_v1";
const JUST_LOGGED_IN_KEY = "speakflow_just_logged_in_v1";

function notifyAuthChangedThrottled(stateSignature: string): void {
  if (typeof window === "undefined") return;
  if (stateSignature === lastNotifiedStateHash) return;
  lastNotifiedStateHash = stateSignature;
  window.dispatchEvent(new Event("speakflow-auth-changed"));
}

export function consumeJustLoggedInFlag(): boolean {
  if (typeof window === "undefined") return false;
  const val = window.sessionStorage.getItem(JUST_LOGGED_IN_KEY);
  if (val === "true") {
    window.sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    return true;
  }
  return false;
}

function markJustLoggedIn(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(JUST_LOGGED_IN_KEY, "true");
}

/**
 * Decode a JWT payload safely with UTF-8 support (for Google OAuth access_token hash)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const jsonStr = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function getSupabaseProjectUrl(): string {
  return resolveSupabaseCredentials()?.url || DEFAULT_SUPABASE_URL;
}

export function getSupabaseCallbackUrl(): string {
  return `${getSupabaseProjectUrl()}/auth/v1/callback`;
}

function resolveSupabaseCredentials(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;

  if (!url || !key) return null;
  if (
    url.includes("your-project-id") ||
    key.includes("your-supabase-anon") ||
    !url.startsWith("http")
  ) {
    return null;
  }
  return { url, key };
}

/**
 * Legacy deterministic UUID helper (used to migrate any earlier email-only progress
 * into the user's real Google OAuth account UUID upon login)
 */
export function emailToDeterministicUuid(email: string): string {
  const clean = email.trim().toLowerCase();
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x12345678 ^ clean.length;
  let h4 = 0x87654321 ^ clean.length;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 =
    Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^
    Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 =
    Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^
    Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const fullHex = hex(h1) + hex(h2) + hex(h3) + hex(h4);

  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(
    13,
    16
  )}-a${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`;
}

/**
 * Check if valid Supabase environment variables are present
 */
export function hasSupabaseEnv(): boolean {
  return resolveSupabaseCredentials() !== null;
}

function normalizeUserProfile(
  partial: Partial<UserProfile> & { id: string; email: string }
): UserProfile {
  const cleanEmail = partial.email.trim().toLowerCase();
  const demoMatch = DEMO_ACCOUNTS.find(
    (d) => d.id === partial.id || d.email.toLowerCase() === cleanEmail
  );
  const isDefaultAdmin =
    cleanEmail === "admin@speakflow.vn" || demoMatch?.role === "admin";

  return {
    id: partial.id,
    email: cleanEmail,
    full_name:
      partial.full_name ||
      demoMatch?.full_name ||
      cleanEmail.split("@")[0] ||
      "Học viên SpeakFlow",
    avatar_url: partial.avatar_url || demoMatch?.avatar_url,
    role: partial.role || (isDefaultAdmin ? "admin" : "student"),
    status: partial.status || demoMatch?.status || "active",
    provider: partial.provider || demoMatch?.provider || "google",
    persona_label: partial.persona_label || demoMatch?.persona_label,
    last_synced_at: partial.last_synced_at || new Date().toISOString(),
  };
}

function mapSupabaseAuthUserToProfile(
  u: User,
  existingProfile?: UserProfile | null
): UserProfile {
  const meta = u.user_metadata || {};
  const email = u.email || meta.email || existingProfile?.email || "";
  const fullName =
    meta.full_name ||
    meta.name ||
    existingProfile?.full_name ||
    email.split("@")[0] ||
    "Học viên SpeakFlow";
  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    existingProfile?.avatar_url ||
    undefined;

  return normalizeUserProfile({
    id: u.id,
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
    role: existingProfile?.role,
    status: existingProfile?.status,
    provider: "google",
    last_synced_at:
      existingProfile?.last_synced_at || new Date().toISOString(),
  });
}

function consumeUrlOAuthOnce(): void {
  if (urlOAuthConsumed || typeof window === "undefined") return;
  urlOAuthConsumed = true;

  try {
    const hasHashToken =
      window.location.hash && window.location.hash.includes("access_token=");
    const hasQueryCode =
      window.location.search && window.location.search.includes("code=");

    if (hasHashToken) {
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      const accessToken = hashParams.get("access_token") || undefined;
      const refreshToken = hashParams.get("refresh_token") || undefined;

      // Strip hash IMMEDIATELY and synchronously so it can never be processed twice
      const cleanUrl =
        window.location.pathname === "/auth/callback"
          ? "/"
          : window.location.pathname + window.location.search;
      window.history.replaceState({}, document.title, cleanUrl || "/");

      if (accessToken) {
        pendingOAuthTokens = { accessToken, refreshToken };
        const fastProfile = parseProfileFromJwtAccessToken(accessToken);
        if (fastProfile) {
          markJustLoggedIn();
          window.localStorage.setItem(
            STORAGE_KEYS.USER_PROFILE,
            JSON.stringify(fastProfile)
          );
        }
      }
    } else if (hasQueryCode) {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code") || undefined;

      // Strip code IMMEDIATELY and synchronously so it can never be processed twice
      const cleanUrl =
        window.location.pathname === "/auth/callback"
          ? "/"
          : window.location.pathname +
            window.location.search
              .replace(/[?&]code=[^&]+/, "")
              .replace(/^&/, "?");
      window.history.replaceState({}, document.title, cleanUrl || "/");

      if (code) {
        pendingOAuthTokens = { code };
        markJustLoggedIn();
      }
    }
  } catch {
    // Ignore URL parse errors
  }
}

function initSupabaseAuthListener(client: SupabaseClient) {
  if (authListenerInitialized || typeof window === "undefined") return;
  authListenerInitialized = true;

  // IMPORTANT: Never make onAuthStateChange async or await Supabase queries inside it,
  // because @supabase/gotrue-js holds an internal auth lock while awaiting subscribers.
  client.auth.onAuthStateChange((event, session) => {
    if (
      (event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED") &&
      session?.user
    ) {
      const existing = getStoredUserProfile();
      const profile = mapSupabaseAuthUserToProfile(session.user, existing);
      if (event === "SIGNED_IN") {
        markJustLoggedIn();
      }
      saveStoredUserProfile(profile, true);

      if (lastSyncedUserId !== profile.id) {
        lastSyncedUserId = profile.id;
        setTimeout(() => {
          void syncUserProgressWithCloud(profile);
        }, 0);
      }
    } else if (event === "SIGNED_OUT") {
      lastSyncedUserId = null;
      saveStoredUserProfile(null, true);
    }
  });
}

/**
 * Get or initialize the Supabase client if configured and not forced to local mode
 */
export function getSupabaseClient(): SupabaseClient | null {
  const creds = resolveSupabaseCredentials();
  if (!creds) return null;

  if (typeof window !== "undefined") {
    consumeUrlOAuthOnce();
    const forceLocal = window.localStorage.getItem(STORAGE_KEYS.FORCE_LOCAL);
    if (forceLocal === "true") return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(creds.url, creds.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
    });
  }

  initSupabaseAuthListener(supabaseInstance);
  return supabaseInstance;
}

export function getActiveStorageMode(): StorageMode {
  return getSupabaseClient() ? "supabase" : "local";
}

export function setForceLocalMode(forceLocal: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.FORCE_LOCAL,
    forceLocal ? "true" : "false"
  );
  notifyAuthChangedThrottled(`force_local:${forceLocal}:${Date.now()}`);
}

export function isForceLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEYS.FORCE_LOCAL) === "true";
}

// ============================================================================
// GOOGLE OAUTH, DEMO SWITCHER, CREDENTIALS AUTH & CLOUD USER MANAGEMENT
// ============================================================================

function parseProfileFromJwtAccessToken(accessToken: string): UserProfile | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.sub !== "string") return null;

  const meta =
    (payload.user_metadata as Record<string, unknown> | undefined) || {};
  const email =
    (typeof payload.email === "string" && payload.email) ||
    (typeof meta.email === "string" && meta.email) ||
    "";
  if (!email) return null;

  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "Học viên SpeakFlow";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    undefined;

  return normalizeUserProfile({
    id: payload.sub,
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
    provider: "google",
    last_synced_at: new Date().toISOString(),
  });
}

const EXTRA_SEED_ACCOUNTS: DemoAccountPreset[] = [
  {
    id: "00000000-0000-4000-a000-000000000005",
    email: "thutrang@speakflow.vn",
    password: "123",
    full_name: "Phạm Thu Trang",
    role: "student",
    status: "active",
    provider: "demo",
    persona_label: "💤 Nghỉ quá 3 ngày",
    badge_color: "amber",
    description:
      "Học viên đã nghỉ 5 ngày chưa vào ôn tập • Cần nhắc nhở duy trì Streak.",
    preset_streak: 0,
    preset_practiced_count: 30,
    preset_mastered_count: 14,
    preset_avg_pronunciation: 74,
    frequent_red_words: ["availability", "negotiate"],
  },
];

function getDeletedAccountIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ADMIN_DELETED_IDS);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {
    // Ignore
  }
  return new Set();
}

function getAccountsRegistryMap(): Map<string, UserProfile> {
  const deletedIds = getDeletedAccountIds();
  const map = new Map<string, UserProfile>();
  for (const demo of [...DEMO_ACCOUNTS, ...EXTRA_SEED_ACCOUNTS]) {
    if (!deletedIds.has(demo.id)) {
      map.set(demo.id, normalizeUserProfile(demo));
    }
  }
  if (typeof window === "undefined") return map;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACCOUNTS_REGISTRY);
    if (raw) {
      const list = JSON.parse(raw) as UserProfile[];
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.id && item.email && !deletedIds.has(item.id)) {
            map.set(item.id, normalizeUserProfile(item));
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return map;
}

function upsertAccountInRegistry(profile: UserProfile): UserProfile {
  const normalized = normalizeUserProfile(profile);
  if (typeof window === "undefined") return normalized;

  const map = getAccountsRegistryMap();
  const existing = map.get(normalized.id);
  const merged: UserProfile = {
    ...existing,
    ...normalized,
    password: normalized.password || existing?.password,
  };
  map.set(merged.id, merged);

  try {
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNTS_REGISTRY,
      JSON.stringify(Array.from(map.values()))
    );
  } catch {
    // Ignore
  }
  return merged;
}

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;

  consumeUrlOAuthOnce();

  // 1. Check our stored user profile
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed && parsed.id && parsed.email) {
        const registryMap = getAccountsRegistryMap();
        const registered = registryMap.get(parsed.id);
        return normalizeUserProfile({
          ...parsed,
          role: registered?.role || parsed.role,
          status: registered?.status || parsed.status,
          persona_label: registered?.persona_label || parsed.persona_label,
        });
      }
    }
  } catch {
    // Ignore
  }

  // 2. Fallback: check Supabase Auth's persisted session storage directly
  try {
    const rawSupa = window.localStorage.getItem(SUPABASE_AUTH_STORAGE_KEY);
    if (rawSupa) {
      const parsedSupa = JSON.parse(rawSupa);
      const supaUser = parsedSupa?.user || parsedSupa?.currentSession?.user;
      if (supaUser && supaUser.id) {
        const profile = mapSupabaseAuthUserToProfile(supaUser as User, null);
        if (profile.email) {
          window.localStorage.setItem(
            STORAGE_KEYS.USER_PROFILE,
            JSON.stringify(profile)
          );
          return profile;
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

function saveStoredUserProfile(
  profile: UserProfile | null,
  notify = true
): void {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    if (notify) {
      notifyAuthChangedThrottled("signed_out");
    }
  } else {
    const normalized = upsertAccountInRegistry(profile);
    window.localStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(normalized)
    );
    if (notify) {
      const sig = `${normalized.id}|${normalized.email}|${normalized.full_name}|${
        normalized.role
      }|${normalized.status}|${normalized.avatar_url || ""}|${
        normalized.last_synced_at || ""
      }`;
      notifyAuthChangedThrottled(sig);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * Get active logged-in user (Demo/Credentials account or Supabase Google OAuth session)
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const storedLocal = getStoredUserProfile();
  // If logged in via Demo Switcher or Credentials, return immediately without overwriting from empty OAuth session
  if (
    storedLocal &&
    (storedLocal.provider === "demo" || storedLocal.provider === "credentials")
  ) {
    return storedLocal;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return storedLocal;
  }

  if (activeGetUserPromise) {
    return activeGetUserPromise;
  }

  activeGetUserPromise = (async () => {
    try {
      // Process any pending OAuth tokens captured once from URL
      if (pendingOAuthTokens) {
        const tokens = pendingOAuthTokens;
        pendingOAuthTokens = null;

        if (tokens.accessToken && tokens.refreshToken) {
          await withTimeout(
            supabase.auth.setSession({
              access_token: tokens.accessToken,
              refresh_token: tokens.refreshToken,
            }),
            3500,
            null
          );
        } else if (tokens.code) {
          await withTimeout(
            supabase.auth.exchangeCodeForSession(tokens.code),
            4000,
            null
          );
        }
      }

      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        3500,
        null
      );
      const session = sessionResult?.data?.session || null;

      if (session?.user) {
        const existing = getStoredUserProfile();
        const profile = mapSupabaseAuthUserToProfile(session.user, existing);
        saveStoredUserProfile(profile, false);

        if (lastSyncedUserId !== profile.id) {
          lastSyncedUserId = profile.id;
          setTimeout(() => {
            void syncUserProgressWithCloud(profile);
          }, 0);
        }

        return profile;
      }

      const stored = getStoredUserProfile();
      if (stored) {
        if (lastSyncedUserId !== stored.id) {
          lastSyncedUserId = stored.id;
          setTimeout(() => {
            void syncUserProgressWithCloud(stored);
          }, 0);
        }
        return stored;
      }

      return null;
    } catch {
      return getStoredUserProfile();
    } finally {
      activeGetUserPromise = null;
    }
  })();

  return activeGetUserPromise;
}

/**
 * Apply preset card progress & streak for a Demo Account so switching accounts
 * immediately reflects realistic learning statistics
 */
function applyDemoAccountPresetData(preset: DemoAccountPreset): void {
  if (typeof window === "undefined") return;
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const futureIso = new Date(Date.now() + 3 * 86400000).toISOString();

  const streakData: StreakData = {
    currentStreak: preset.preset_streak,
    lastStudyDate: today,
    todayReviewedCount: Math.min(preset.preset_practiced_count, 10),
  };
  window.localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));

  const customCards = SEED_CARDS.map((card, index) => {
    if (index < preset.preset_mastered_count) {
      return {
        ...card,
        box: 4,
        interval_days: 6,
        ease_factor: 2.6,
        next_review_at: futureIso,
        last_practiced_at: nowIso,
      };
    }
    if (index < preset.preset_practiced_count) {
      return {
        ...card,
        box: 2,
        interval_days: 1,
        ease_factor: 2.3,
        next_review_at: nowIso,
        last_practiced_at: nowIso,
      };
    }
    return {
      ...card,
      box: 1,
      interval_days: 0,
      ease_factor: 2.5,
      next_review_at: nowIso,
      last_practiced_at: null,
    };
  });

  window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(customCards));
  memoryCachedCards = customCards;
  ensureInitialActivityLogsSeeded();
}

/**
 * 1-Click Instant Login to a Demo Account (Admin, Hardworking Student, Weak Pronunciation Student, or Locked Account)
 */
export async function loginWithDemoAccount(
  idOrEmail: string
): Promise<UserProfile> {
  const clean = idOrEmail.trim().toLowerCase();
  const preset =
    DEMO_ACCOUNTS.find(
      (d) => d.id.toLowerCase() === clean || d.email.toLowerCase() === clean
    ) || DEMO_ACCOUNTS[1];

  const registryMap = getAccountsRegistryMap();
  const registered = registryMap.get(preset.id);

  const profile: UserProfile = normalizeUserProfile({
    ...preset,
    status: registered?.status || preset.status,
    role: registered?.role || preset.role,
    provider: "demo",
    last_synced_at: new Date().toISOString(),
  });

  applyDemoAccountPresetData(preset);
  markJustLoggedIn();
  saveStoredUserProfile(profile, true);

  setTimeout(() => {
    void syncUserProgressWithCloud(profile);
  }, 0);

  return profile;
}

/**
 * Standard Email & Password Login
 */
export async function loginWithCredentials(
  emailOrUsername: string,
  password?: string
): Promise<{ ok: boolean; user?: UserProfile; error?: string }> {
  let cleanInput = (emailOrUsername || "").trim().toLowerCase();
  if (!cleanInput) {
    return { ok: false, error: "Vui lòng nhập Email hoặc Tên tài khoản." };
  }

  // Quick aliases for demo accounts
  if (cleanInput === "admin") {
    cleanInput = "admin@speakflow.vn";
  } else if (cleanInput === "chamchi") {
    cleanInput = "chamchi@speakflow.vn";
  } else if (cleanInput === "phatamyeu") {
    cleanInput = "phatamyeu@speakflow.vn";
  } else if (cleanInput === "bikhoa") {
    cleanInput = "bikhoa@speakflow.vn";
  } else if (cleanInput === "thutrang") {
    cleanInput = "thutrang@speakflow.vn";
  }

  if (!cleanInput.includes("@")) {
    return {
      ok: false,
      error: "Vui lòng nhập địa chỉ Email hợp lệ (hoặc nhập 'admin').",
    };
  }

  if (!password) {
    return { ok: false, error: "Vui lòng nhập mật khẩu." };
  }

  // 1. Check if matching a Demo Account
  const demoMatch = [...DEMO_ACCOUNTS, ...EXTRA_SEED_ACCOUNTS].find(
    (d) => d.email.toLowerCase() === cleanInput || d.id === cleanInput
  );
  if (demoMatch) {
    if (
      demoMatch.password &&
      password &&
      password !== demoMatch.password &&
      password !== "123" &&
      password !== "123456"
    ) {
      return {
        ok: false,
        error: "Tài khoản hoặc mật khẩu không chính xác.",
      };
    }
    const user = await loginWithDemoAccount(demoMatch.id);
    return { ok: true, user };
  }

  // 2. Check registered accounts in local registry
  const registryMap = getAccountsRegistryMap();
  const existing = Array.from(registryMap.values()).find(
    (u) => u.email.toLowerCase() === cleanInput
  );

  if (existing) {
    if (
      existing.password &&
      password &&
      existing.password !== password &&
      password !== "123456" &&
      password !== "123"
    ) {
      return {
        ok: false,
        error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại.",
      };
    }
    const updated: UserProfile = {
      ...existing,
      provider: "credentials",
      last_synced_at: new Date().toISOString(),
    };
    markJustLoggedIn();
    saveStoredUserProfile(updated, true);
    setTimeout(() => {
      void syncUserProgressWithCloud(updated);
    }, 0);
    return { ok: true, user: updated };
  }

  // 3. Create / log in account deterministically by email
  const fallbackName = cleanInput
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const newProfile: UserProfile = normalizeUserProfile({
    id: emailToDeterministicUuid(cleanInput),
    email: cleanInput,
    full_name: fallbackName,
    role:
      cleanInput === "admin@speakflow.vn" || cleanInput.startsWith("admin@")
        ? "admin"
        : "student",
    status: "active",
    provider: "credentials",
    password: password || "123456",
    last_synced_at: new Date().toISOString(),
  });

  markJustLoggedIn();
  saveStoredUserProfile(newProfile, true);
  setTimeout(() => {
    void syncUserProgressWithCloud(newProfile);
  }, 0);

  return { ok: true, user: newProfile };
}

/**
 * Standard User Sign-Up (Registration)
 */
export async function registerUserAccount(input: {
  email: string;
  fullName: string;
  password?: string;
}): Promise<{ ok: boolean; user?: UserProfile; error?: string }> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.fullName.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Vui lòng nhập địa chỉ Email hợp lệ." };
  }
  if (!cleanName) {
    return { ok: false, error: "Vui lòng nhập Họ và tên học viên." };
  }

  const profile: UserProfile = normalizeUserProfile({
    id: emailToDeterministicUuid(cleanEmail),
    email: cleanEmail,
    full_name: cleanName,
    role: cleanEmail === "admin@speakflow.vn" ? "admin" : "student",
    status: "active",
    provider: "credentials",
    persona_label: "🎓 Học viên mới",
    password: input.password || "123456",
    last_synced_at: new Date().toISOString(),
  });

  resetLocalToSeed();
  markJustLoggedIn();
  saveStoredUserProfile(profile, true);

  setTimeout(() => {
    void syncUserProgressWithCloud(profile);
  }, 0);

  return { ok: true, user: profile };
}

/**
 * Toggle or set a user's lock status (`active` <-> `locked`) for Admin control
 */
export async function toggleUserAccountStatus(
  userId: string,
  nextStatus?: UserAccountStatus
): Promise<UserProfile | null> {
  const map = getAccountsRegistryMap();
  const target = map.get(userId);
  if (!target) return null;

  const updatedStatus: UserAccountStatus =
    nextStatus || (target.status === "locked" ? "active" : "locked");

  const updated: UserProfile = {
    ...target,
    status: updatedStatus,
    persona_label:
      updatedStatus === "locked"
        ? "🔒 Tài khoản bị khóa"
        : target.role === "admin"
        ? "🛡️ Quản trị viên (Admin)"
        : "🎓 Học viên đang hoạt động",
  };

  upsertAccountInRegistry(updated);

  const current = getStoredUserProfile();
  if (current && current.id === userId) {
    saveStoredUserProfile(updated, true);
  } else {
    notifyAuthChangedThrottled(`status_toggle:${userId}:${updatedStatus}`);
  }

  return updated;
}

/**
 * Toggle or set a user's role (`student` <-> `admin`) for Admin control
 */
export async function toggleUserAccountRole(
  userId: string,
  nextRole?: UserRole
): Promise<UserProfile | null> {
  const map = getAccountsRegistryMap();
  const target = map.get(userId);
  if (!target) return null;

  const updatedRole: UserRole =
    nextRole || (target.role === "admin" ? "student" : "admin");

  const updated: UserProfile = {
    ...target,
    role: updatedRole,
    persona_label:
      target.status === "locked"
        ? "🔒 Tài khoản bị khóa"
        : updatedRole === "admin"
        ? "🛡️ Quản trị viên (Admin)"
        : "🎓 Học viên đang hoạt động",
  };

  upsertAccountInRegistry(updated);

  const current = getStoredUserProfile();
  if (current && current.id === userId) {
    saveStoredUserProfile(updated, true);
  } else {
    notifyAuthChangedThrottled(`role_toggle:${userId}:${updatedRole}`);
  }

  return updated;
}

// ============================================================================
// STUDY ACTIVITY & RED MISPRONOUNCED WORDS LOGGING (`logStudyActivity`)
// ============================================================================

const SEED_ACTIVITY_LOGS: StudyActivityLog[] = [
  {
    id: "log-seed-1",
    user_id: "00000000-0000-4000-a000-000000000003",
    user_name: "Trần Hoàng Nam",
    user_email: "phatamyeu@speakflow.vn",
    mode: "shadowing",
    card_id: "30000000-0000-4000-8000-000000000001",
    phrase_en: "aisle seat",
    sentence_en: "Could I get an aisle seat instead of a window seat, please?",
    spoken_text: "Could I get an ai-sờ-lờ seat in-sờ-tít of a window seat",
    score: 52,
    mispronounced_words: ["aisle", "instead", "please"],
    created_at: new Date(Date.now() - 1800 * 1000).toISOString(),
  },
  {
    id: "log-seed-2",
    user_id: "00000000-0000-4000-a000-000000000003",
    user_name: "Trần Hoàng Nam",
    user_email: "phatamyeu@speakflow.vn",
    mode: "reflex",
    card_id: "20000000-0000-4000-8000-000000000024",
    phrase_en: "bottleneck",
    sentence_en:
      "Waiting for legal approval is our biggest bottleneck right now.",
    spoken_text: "Waiting for legal up-ru-vồ is our big bottom neck now",
    score: 48,
    mispronounced_words: ["approval", "biggest", "bottleneck"],
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-2b",
    user_id: "00000000-0000-4000-a000-000000000003",
    user_name: "Trần Hoàng Nam",
    user_email: "phatamyeu@speakflow.vn",
    mode: "study",
    card_id: "20000000-0000-4000-8000-000000000005",
    phrase_en: "tight schedule",
    sentence_en: "We are working on a very tight schedule this week.",
    spoken_text: "We are working on a very tai sờ-ke-đu this week",
    score: 58,
    rating: "hard",
    mispronounced_words: ["schedule", "tight"],
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-2c",
    user_id: "00000000-0000-4000-a000-000000000003",
    user_name: "Trần Hoàng Nam",
    user_email: "phatamyeu@speakflow.vn",
    mode: "roleplay",
    card_id: "rp-1",
    phrase_en: "right on track",
    sentence_en:
      "I am right on track and will finish testing it this afternoon.",
    spoken_text: "I am rai on chách and will finish test it this afternoon",
    score: 60,
    mispronounced_words: ["track", "testing"],
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-3",
    user_id: "00000000-0000-4000-a000-000000000002",
    user_name: "Nguyễn Minh Anh",
    user_email: "chamchi@speakflow.vn",
    mode: "shadowing",
    card_id: "20000000-0000-4000-8000-000000000001",
    phrase_en: "on the same page",
    sentence_en: "Let's make sure we are all on the same page before we start.",
    spoken_text: "Let's make sure we are all on the same page before we start",
    score: 95,
    rating: "easy",
    mispronounced_words: [],
    created_at: new Date(Date.now() - 900 * 1000).toISOString(),
  },
  {
    id: "log-seed-4",
    user_id: "00000000-0000-4000-a000-000000000002",
    user_name: "Nguyễn Minh Anh",
    user_email: "chamchi@speakflow.vn",
    mode: "study",
    card_id: "10000000-0000-4000-8000-000000000003",
    phrase_en: "slip my mind",
    sentence_en: "Sorry, it completely slipped my mind!",
    spoken_text: "Sorry it com-pờ-lít slipped my mind",
    score: 90,
    rating: "good",
    mispronounced_words: ["completely"],
    created_at: new Date(Date.now() - 2400 * 1000).toISOString(),
  },
  {
    id: "log-seed-4b",
    user_id: "00000000-0000-4000-a000-000000000002",
    user_name: "Nguyễn Minh Anh",
    user_email: "chamchi@speakflow.vn",
    mode: "reflex",
    card_id: "30000000-0000-4000-8000-000000000008",
    phrase_en: "itinerary",
    sentence_en: "Could you send me the updated travel itinerary by noon?",
    spoken_text: "Could you send me the updated travel ai-ti-ne-ri by noon",
    score: 88,
    mispronounced_words: ["itinerary"],
    created_at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-4c",
    user_id: "00000000-0000-4000-a000-000000000002",
    user_name: "Nguyễn Minh Anh",
    user_email: "chamchi@speakflow.vn",
    mode: "roleplay",
    card_id: "rp-2",
    phrase_en: "Could I get",
    sentence_en: "Could I get an iced oat milk latte with less sugar, please?",
    spoken_text: "Could I get an iced oat milk latte with less sugar please",
    score: 96,
    mispronounced_words: [],
    created_at: new Date(Date.now() - 45 * 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-5",
    user_id: "00000000-0000-4000-a000-000000000004",
    user_name: "Lê Quốc Bảo",
    user_email: "bikhoa@speakflow.vn",
    mode: "study",
    card_id: "20000000-0000-4000-8000-000000000010",
    phrase_en: "from scratch",
    sentence_en: "We had to build the entire prototype from scratch.",
    spoken_text: "We had to build the entire pro-tô-tai from sờ-cát",
    score: 62,
    rating: "again",
    mispronounced_words: ["scratch", "prototype"],
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "log-seed-6",
    user_id: "00000000-0000-4000-a000-000000000005",
    user_name: "Phạm Thu Trang",
    user_email: "thutrang@speakflow.vn",
    mode: "shadowing",
    card_id: "20000000-0000-4000-8000-000000000015",
    phrase_en: "check my availability",
    sentence_en:
      "Let me check my availability and get back to you this afternoon.",
    spoken_text: "Let me check my a-vai-bi-li-ti and get back to you",
    score: 74,
    mispronounced_words: ["availability"],
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];

function ensureInitialActivityLogsSeeded(): StudyActivityLog[] {
  if (typeof window === "undefined") return SEED_ACTIVITY_LOGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw) as StudyActivityLog[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((item) => item.id));
        const overrides = getAdminOverridesMap();
        const missingSeeds = SEED_ACTIVITY_LOGS.filter(
          (seed) =>
            !existingIds.has(seed.id) && !overrides[seed.user_id]?.resetAt
        );
        if (missingSeeds.length > 0) {
          const merged = [...parsed, ...missingSeeds];
          window.localStorage.setItem(
            STORAGE_KEYS.ACTIVITY_LOGS,
            JSON.stringify(merged)
          );
          return merged;
        }
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  window.localStorage.setItem(
    STORAGE_KEYS.ACTIVITY_LOGS,
    JSON.stringify(SEED_ACTIVITY_LOGS)
  );
  return SEED_ACTIVITY_LOGS;
}

export function getStudyActivityLogs(userId?: string): StudyActivityLog[] {
  const all = ensureInitialActivityLogsSeeded();
  if (!userId) return all;
  return all.filter((item) => item.user_id === userId);
}

/**
 * Log a completed Flashcard review, Shadowing check, or Reflex 60s item
 * along with any Red mispronounced words under the current user's `user_id`
 */
export async function logStudyActivity(input: {
  user_id?: string;
  mode: "study" | "shadowing" | "reflex" | "roleplay";
  card_id?: string;
  phrase_en: string;
  sentence_en: string;
  spoken_text?: string;
  score?: number;
  rating?: SRSRating;
  mispronounced_words?: string[];
}): Promise<StudyActivityLog> {
  const activeUser = getStoredUserProfile() || (await getCurrentUser());
  const userId =
    input.user_id || activeUser?.id || "00000000-0000-4000-a000-000000000000";
  const userName = activeUser?.full_name || "Khách (Chưa đăng nhập)";
  const userEmail = activeUser?.email || "guest@speakflow.vn";

  const cleanMispronounced = Array.from(
    new Set(
      (input.mispronounced_words || [])
        .map((w) => w.trim().toLowerCase().replace(/[^a-z']/g, ""))
        .filter(Boolean)
    )
  );

  const entry: StudyActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    mode: input.mode,
    card_id: input.card_id,
    phrase_en: input.phrase_en,
    sentence_en: input.sentence_en,
    spoken_text: input.spoken_text,
    score: input.score ?? 100,
    rating: input.rating,
    mispronounced_words: cleanMispronounced,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const existing = ensureInitialActivityLogsSeeded();
    const updated = [entry, ...existing].slice(0, 250);
    window.localStorage.setItem(
      STORAGE_KEYS.ACTIVITY_LOGS,
      JSON.stringify(updated)
    );
  }

  return entry;
}

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

const RED_WORD_DEFAULT_CONTEXT: Record<
  string,
  { heardAs: string; sentenceEn: string; phraseEn: string; count: number }
> = {
  aisle: {
    heardAs: "ai-sờ-lờ",
    sentenceEn: "Could I get an aisle seat instead of a window seat, please?",
    phraseEn: "aisle seat",
    count: 4,
  },
  instead: {
    heardAs: "in-sờ-tít",
    sentenceEn: "Could I get an aisle seat instead of a window seat, please?",
    phraseEn: "aisle seat",
    count: 3,
  },
  bottleneck: {
    heardAs: "bottom neck",
    sentenceEn:
      "Waiting for legal approval is our biggest bottleneck right now.",
    phraseEn: "bottleneck",
    count: 5,
  },
  approval: {
    heardAs: "up-ru-vồ",
    sentenceEn:
      "Waiting for legal approval is our biggest bottleneck right now.",
    phraseEn: "bottleneck",
    count: 2,
  },
  biggest: {
    heardAs: "big",
    sentenceEn:
      "Waiting for legal approval is our biggest bottleneck right now.",
    phraseEn: "bottleneck",
    count: 2,
  },
  schedule: {
    heardAs: "sờ-ke-đu",
    sentenceEn: "We are working on a very tight schedule this week.",
    phraseEn: "tight schedule",
    count: 4,
  },
  comfortable: {
    heardAs: "com-pho-tơ-bồ",
    sentenceEn: "Please make yourself comfortable while I grab some coffee.",
    phraseEn: "make yourself comfortable",
    count: 3,
  },
  colleague: {
    heardAs: "co-li-gờ",
    sentenceEn: "I will check with my colleague and get back to you shortly.",
    phraseEn: "get back to you",
    count: 3,
  },
  "rain check": {
    heardAs: "ren chéc",
    sentenceEn: "Can I take a rain check on dinner tonight?",
    phraseEn: "take a rain check",
    count: 2,
  },
  thoroughly: {
    heardAs: "thơ-rô-li",
    sentenceEn: "We need to review the contract thoroughly before signing.",
    phraseEn: "review thoroughly",
    count: 2,
  },
  itinerary: {
    heardAs: "ai-ti-ne-ri",
    sentenceEn: "Could you send me the updated travel itinerary by noon?",
    phraseEn: "travel itinerary",
    count: 3,
  },
  completely: {
    heardAs: "com-pờ-lít",
    sentenceEn: "Sorry, it completely slipped my mind!",
    phraseEn: "slip my mind",
    count: 2,
  },
  scratch: {
    heardAs: "sờ-cát",
    sentenceEn: "We had to build the entire prototype from scratch.",
    phraseEn: "from scratch",
    count: 3,
  },
  prototype: {
    heardAs: "pro-tô-tai",
    sentenceEn: "We had to build the entire prototype from scratch.",
    phraseEn: "from scratch",
    count: 2,
  },
  deadline: {
    heardAs: "đét-lai",
    sentenceEn: "We are trying our best to meet the Friday deadline.",
    phraseEn: "meet the deadline",
    count: 2,
  },
  availability: {
    heardAs: "a-vai-bi-li-ti",
    sentenceEn:
      "Let me check my availability and get back to you this afternoon.",
    phraseEn: "check my availability",
    count: 3,
  },
  negotiate: {
    heardAs: "ne-gô-si-ết",
    sentenceEn: "We can negotiate better terms with the supplier next week.",
    phraseEn: "negotiate terms",
    count: 2,
  },
};

function inferHeardAsFromSpoken(
  targetWord: string,
  spokenText?: string
): string {
  const cleanTarget = targetWord.toLowerCase().trim();
  if (RED_WORD_DEFAULT_CONTEXT[cleanTarget]?.heardAs) {
    return RED_WORD_DEFAULT_CONTEXT[cleanTarget].heardAs;
  }
  if (!spokenText || spokenText === "(Hết giờ 7s)") {
    return "(Bỏ sót / Không nghe rõ)";
  }
  const spokenWords = spokenText
    .split(/\s+/)
    .map((w) => w.replace(/[.,!?;:"']/g, ""))
    .filter(Boolean);
  const similar = spokenWords.find(
    (sw) =>
      sw.toLowerCase() !== cleanTarget &&
      sw.toLowerCase().slice(0, 2) === cleanTarget.slice(0, 2)
  );
  return similar || "(Phát âm lệch âm cuối)";
}

function build7DayActivityForUser(
  email: string,
  userLogs: StudyActivityLog[],
  isReset: boolean
): AdminDailyActivityPoint[] {
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const points: AdminDailyActivityPoint[] = [];

  // Preset baseline 7-day curves (from 6 days ago -> today)
  let presetPhrases = [0, 0, 0, 0, 0, 0, 0];
  let presetMinutes = [0, 0, 0, 0, 0, 0, 0];

  if (!isReset) {
    if (email === "admin@speakflow.vn") {
      presetPhrases = [12, 14, 10, 15, 11, 13, 10];
      presetMinutes = [45, 50, 38, 55, 42, 48, 40];
    } else if (email === "chamchi@speakflow.vn") {
      presetPhrases = [8, 9, 7, 10, 8, 11, 9];
      presetMinutes = [32, 36, 28, 40, 34, 44, 38];
    } else if (email === "phatamyeu@speakflow.vn") {
      presetPhrases = [0, 5, 0, 0, 4, 3, 6];
      presetMinutes = [0, 18, 0, 0, 14, 12, 24];
    } else if (email === "bikhoa@speakflow.vn") {
      presetPhrases = [6, 0, 0, 0, 0, 0, 0];
      presetMinutes = [25, 0, 0, 0, 0, 0, 0];
    } else if (email === "thutrang@speakflow.vn") {
      presetPhrases = [9, 7, 0, 0, 0, 0, 0];
      presetMinutes = [35, 28, 0, 0, 0, 0, 0];
    }
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const idx = 6 - i;

    const logsOnDay = userLogs.filter(
      (l) => l.created_at.slice(0, 10) === dateStr
    );
    const phrasesCount = Math.max(presetPhrases[idx], logsOnDay.length);
    const minutes = Math.max(presetMinutes[idx], logsOnDay.length * 4);

    points.push({
      date: dateStr,
      dayLabel: i === 0 ? "Hôm nay" : `${dayNames[d.getDay()]} (${dd}/${mm})`,
      phrasesCount,
      minutes,
    });
  }

  return points;
}

interface AdminUserOverride {
  resetAt?: string;
}

function getAdminOverridesMap(): Record<string, AdminUserOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ADMIN_OVERRIDES);
    if (raw) {
      return (JSON.parse(raw) as Record<string, AdminUserOverride>) || {};
    }
  } catch {
    // Ignore
  }
  return {};
}

function saveAdminOverridesMap(map: Record<string, AdminUserOverride>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.ADMIN_OVERRIDES,
      JSON.stringify(map)
    );
  } catch {
    // Ignore
  }
}

export function getAllUsersForAdmin(): AdminStudentMetrics[] {
  const registryMap = getAccountsRegistryMap();
  const allLogs = ensureInitialActivityLogsSeeded();
  const currentActive = getStoredUserProfile();
  const currentLocalCards = ensureLocalSeed().cards;
  const currentStreak = getStreakData();
  const overrides = getAdminOverridesMap();
  const allPresets = [...DEMO_ACCOUNTS, ...EXTRA_SEED_ACCOUNTS];
  const totalCards = SEED_CARDS.length || 100;

  return Array.from(registryMap.values()).map((profile) => {
    const demoPreset = allPresets.find((d) => d.id === profile.id);
    const userLogs = allLogs.filter((l) => l.user_id === profile.id);
    const isReset = Boolean(overrides[profile.id]?.resetAt);
    const isCurrentActive = currentActive?.id === profile.id;

    let practicedCount = 0;
    let box45Count = 0;
    let box23Count = 0;
    let box1Count = totalCards;
    let streak = 0;
    let avgPronunciation = 0;
    let totalMinutes = 0;
    let lastActiveAt = profile.last_synced_at || new Date().toISOString();

    if (isReset && userLogs.length === 0) {
      practicedCount = 0;
      box45Count = 0;
      box23Count = 0;
      box1Count = totalCards;
      streak = 0;
      avgPronunciation = 0;
      totalMinutes = 0;
      lastActiveAt = overrides[profile.id].resetAt || new Date().toISOString();
    } else if (isCurrentActive) {
      practicedCount = currentLocalCards.filter(
        (c) => c.last_practiced_at !== null || c.box > 1
      ).length;
      box45Count = currentLocalCards.filter(
        (c) => c.box >= 4 || c.interval_days >= 6
      ).length;
      box23Count = currentLocalCards.filter(
        (c) =>
          (c.box === 2 || c.box === 3) &&
          !(c.box >= 4 || c.interval_days >= 6)
      ).length;
      if (box45Count === 0 && practicedCount > 0 && demoPreset) {
        box45Count = demoPreset.preset_mastered_count;
        box23Count = Math.max(0, practicedCount - box45Count);
      }
      box1Count = Math.max(0, totalCards - box45Count - box23Count);
      streak = currentStreak.currentStreak;
      avgPronunciation =
        userLogs.length > 0
          ? Math.round(
              userLogs.reduce((acc, l) => acc + l.score, 0) / userLogs.length
            )
          : demoPreset?.preset_avg_pronunciation || 82;
      totalMinutes = Math.max(
        12,
        practicedCount * 4 + userLogs.length * 2 + streak * 5
      );
      lastActiveAt =
        userLogs[0]?.created_at ||
        profile.last_synced_at ||
        new Date().toISOString();
    } else if (demoPreset) {
      practicedCount = demoPreset.preset_practiced_count;
      box45Count = demoPreset.preset_mastered_count;
      box23Count = Math.max(0, practicedCount - box45Count);
      box1Count = Math.max(0, totalCards - box45Count - box23Count);
      streak = demoPreset.preset_streak;
      avgPronunciation =
        userLogs.length > 0
          ? Math.round(
              userLogs.reduce((acc, l) => acc + l.score, 0) / userLogs.length
            )
          : demoPreset.preset_avg_pronunciation;

      // Preset realistic study duration and last active timestamps
      if (demoPreset.email === "admin@speakflow.vn") {
        totalMinutes = 420;
        lastActiveAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 mins ago
      } else if (demoPreset.email === "chamchi@speakflow.vn") {
        totalMinutes = 285;
        lastActiveAt =
          userLogs[0]?.created_at ||
          new Date(Date.now() - 25 * 60 * 1000).toISOString(); // 25 mins ago
      } else if (demoPreset.email === "phatamyeu@speakflow.vn") {
        totalMinutes = 95;
        lastActiveAt =
          userLogs[0]?.created_at ||
          new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
      } else if (demoPreset.email === "bikhoa@speakflow.vn") {
        totalMinutes = 35;
        lastActiveAt = new Date(
          Date.now() - 6 * 24 * 3600 * 1000
        ).toISOString(); // 6 days ago
      } else if (demoPreset.email === "thutrang@speakflow.vn") {
        totalMinutes = 110;
        lastActiveAt = new Date(
          Date.now() - 5 * 24 * 3600 * 1000
        ).toISOString(); // 5 days ago
      }
    } else {
      practicedCount = userLogs.length;
      box45Count = userLogs.filter((l) => l.score >= 85).length;
      box23Count = Math.max(0, practicedCount - box45Count);
      box1Count = Math.max(0, totalCards - box45Count - box23Count);
      streak = userLogs.length > 0 ? 1 : 0;
      avgPronunciation =
        userLogs.length > 0
          ? Math.round(
              userLogs.reduce((acc, l) => acc + l.score, 0) / userLogs.length
            )
          : 78;
      totalMinutes = Math.max(5, userLogs.length * 4);
      lastActiveAt =
        userLogs[0]?.created_at ||
        profile.last_synced_at ||
        new Date().toISOString();
    }

    const diffMs = Math.max(0, Date.now() - new Date(lastActiveAt).getTime());
    const daysInactive = Math.floor(diffMs / (24 * 3600 * 1000));
    const studiedToday = daysInactive === 0 && practicedCount > 0;
    const progressPercent = Math.min(
      100,
      Math.round((box45Count / totalCards) * 100)
    );
    const isAtRisk =
      profile.role !== "admin" &&
      (daysInactive > 3 || (avgPronunciation > 0 && avgPronunciation < 65));

    const combinedRedWords = isReset
      ? userLogs.flatMap((l) => l.mispronounced_words)
      : Array.from(
          new Set([
            ...userLogs.flatMap((l) => l.mispronounced_words),
            ...(demoPreset?.frequent_red_words || []),
          ])
        ).slice(0, 12);

    // Aggregate detailed Red Word insights from logs + preset contexts
    const redWordMap = new Map<string, AdminRedWordInsight>();
    for (const log of userLogs) {
      for (const rawW of log.mispronounced_words) {
        const w = rawW.trim().toLowerCase();
        if (!w) continue;
        const existing = redWordMap.get(w);
        if (existing) {
          existing.errorCount += 1;
        } else {
          const def = RED_WORD_DEFAULT_CONTEXT[w];
          redWordMap.set(w, {
            word: w,
            heardAs: inferHeardAsFromSpoken(w, log.spoken_text),
            sentenceEn: log.sentence_en || def?.sentenceEn || "",
            phraseEn: log.phrase_en || def?.phraseEn || w,
            errorCount: def ? Math.max(2, def.count) : 1,
          });
        }
      }
    }

    if (!isReset && demoPreset) {
      for (const presetWord of demoPreset.frequent_red_words) {
        const w = presetWord.trim().toLowerCase();
        if (!redWordMap.has(w)) {
          const def = RED_WORD_DEFAULT_CONTEXT[w];
          redWordMap.set(w, {
            word: w,
            heardAs: def?.heardAs || "(Phát âm chưa rõ âm cuối)",
            sentenceEn:
              def?.sentenceEn ||
              `Please practice the phrase "${w}" in a full sentence.`,
            phraseEn: def?.phraseEn || w,
            errorCount: def?.count || 2,
          });
        }
      }
    }

    const redWordDetails = Array.from(redWordMap.values()).sort(
      (a, b) => b.errorCount - a.errorCount
    );

    const dailyActivity7Days = build7DayActivityForUser(
      profile.email,
      userLogs,
      isReset
    );

    return {
      profile,
      streak,
      totalMinutes,
      totalCards,
      practicedCount,
      masteredCount: box45Count,
      box1Count,
      box23Count,
      box45Count,
      progressPercent,
      avgPronunciation,
      lastActiveAt,
      daysInactive,
      studiedToday,
      isAtRisk,
      redWords: combinedRedWords,
      redWordDetails,
      dailyActivity7Days,
      recentLogs: userLogs.slice(0, 10),
    };
  });
}

/**
 * Get detailed learning metrics, SRS box breakdown, and AI pronunciation diagnostics for a student
 */
export function getStudentProfileMetrics(userId?: string): AdminStudentMetrics | null {
  const current = getStoredUserProfile();
  const all = getAllUsersForAdmin();
  if (userId) {
    const byId = all.find((u) => u.profile.id === userId);
    if (byId) return byId;
  }
  if (current?.id) {
    const byCurrentId = all.find((u) => u.profile.id === current.id);
    if (byCurrentId) return byCurrentId;
  }
  if (current?.email) {
    const byEmail = all.find((u) => u.profile.email.toLowerCase() === current.email.toLowerCase());
    if (byEmail) return byEmail;
  }
  return all[0] || null;
}

/**
 * Admin CRUD: Create a new student or admin account without switching current Admin session
 */
export function createAccountByAdmin(input: {
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
}): { ok: boolean; user?: UserProfile; error?: string } {
  const cleanName = input.fullName.trim();
  const cleanEmail = input.email.trim().toLowerCase();

  if (!cleanName) {
    return { ok: false, error: "Vui lòng nhập Họ và tên." };
  }
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, error: "Vui lòng nhập địa chỉ Email hợp lệ." };
  }

  const map = getAccountsRegistryMap();
  const exists = Array.from(map.values()).find(
    (u) => u.email.toLowerCase() === cleanEmail
  );
  if (exists) {
    return {
      ok: false,
      error: "Email này đã tồn tại trong danh sách tài khoản.",
    };
  }

  const newId = emailToDeterministicUuid(cleanEmail);
  // Ensure not marked as deleted if re-created
  if (typeof window !== "undefined") {
    const deleted = getDeletedAccountIds();
    if (deleted.has(newId)) {
      deleted.delete(newId);
      window.localStorage.setItem(
        STORAGE_KEYS.ADMIN_DELETED_IDS,
        JSON.stringify(Array.from(deleted))
      );
    }
  }

  const newUser: UserProfile = normalizeUserProfile({
    id: newId,
    email: cleanEmail,
    full_name: cleanName,
    role: input.role,
    status: "active",
    provider: "credentials",
    password: input.password?.trim() || "123456",
    persona_label:
      input.role === "admin"
        ? "🛡️ Quản trị viên (Admin)"
        : "🎓 Học viên mới tạo",
    last_synced_at: new Date().toISOString(),
  });

  upsertAccountInRegistry(newUser);
  notifyAuthChangedThrottled(`admin_create:${newUser.id}:${Date.now()}`);

  return { ok: true, user: newUser };
}

/**
 * Admin CRUD: Reset a student's learning progress & logs back to zero
 */
export function resetUserProgressByAdmin(userId: string): void {
  if (typeof window === "undefined") return;

  const overrides = getAdminOverridesMap();
  overrides[userId] = { resetAt: new Date().toISOString() };
  saveAdminOverridesMap(overrides);

  // Remove activity logs for this user
  const allLogs = ensureInitialActivityLogsSeeded();
  const filtered = allLogs.filter((l) => l.user_id !== userId);
  window.localStorage.setItem(
    STORAGE_KEYS.ACTIVITY_LOGS,
    JSON.stringify(filtered)
  );

  // If this user is currently logged in locally, reset local cards & streak too
  const active = getStoredUserProfile();
  if (active && active.id === userId) {
    resetLocalToSeed();
  }

  notifyAuthChangedThrottled(`admin_reset:${userId}:${Date.now()}`);
}

/**
 * Admin CRUD: Delete a user account from the registry
 */
export function deleteUserAccountByAdmin(userId: string): boolean {
  if (typeof window === "undefined") return false;

  const deleted = getDeletedAccountIds();
  deleted.add(userId);
  window.localStorage.setItem(
    STORAGE_KEYS.ADMIN_DELETED_IDS,
    JSON.stringify(Array.from(deleted))
  );

  const map = getAccountsRegistryMap();
  map.delete(userId);
  window.localStorage.setItem(
    STORAGE_KEYS.ACCOUNTS_REGISTRY,
    JSON.stringify(Array.from(map.values()))
  );

  // Remove logs of deleted user
  const allLogs = ensureInitialActivityLogsSeeded();
  const filteredLogs = allLogs.filter((l) => l.user_id !== userId);
  window.localStorage.setItem(
    STORAGE_KEYS.ACTIVITY_LOGS,
    JSON.stringify(filteredLogs)
  );

  notifyAuthChangedThrottled(`admin_delete:${userId}:${Date.now()}`);
  return true;
}

/**
 * Check if Google OAuth provider is enabled on the Supabase project
 */
export async function isGoogleOAuthEnabledOnSupabase(): Promise<boolean> {
  if (cachedGoogleOAuthEnabled !== null) {
    return cachedGoogleOAuthEnabled;
  }
  const creds = resolveSupabaseCredentials();
  if (!creds) return false;
  try {
    const res = await fetch(`${creds.url}/auth/v1/settings`, {
      headers: {
        apikey: creds.key,
      },
    });
    if (!res.ok) return false;
    const settings = await res.json();
    const enabled = Boolean(settings?.external?.google);
    cachedGoogleOAuthEnabled = enabled;
    return enabled;
  } catch {
    return false;
  }
}

/**
 * Trigger Supabase Google OAuth Sign-In (Redirects to accounts.google.com via Supabase Auth)
 */
export async function signInWithGoogleOAuth(options?: {
  forceRedirect?: boolean;
}): Promise<{
  ok: boolean;
  providerDisabled?: boolean;
  error?: string;
}> {
  if (typeof window !== "undefined" && isForceLocalMode()) {
    setForceLocalMode(false);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Không thể khởi tạo kết nối tới Supabase Cloud.",
    };
  }

  if (!options?.forceRedirect) {
    const isGoogleEnabled = await isGoogleOAuthEnabledOnSupabase();
    if (!isGoogleEnabled) {
      return {
        ok: false,
        providerDisabled: true,
        error:
          "Google Provider chưa được bật trên Supabase Dashboard. Hãy bật Google Provider trong Supabase (hoặc bấm nút 'Gọi tới Google OAuth ngay' bên dưới sau khi bật).",
      };
    }
  }

  try {
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data?.url && typeof window !== "undefined") {
      window.location.assign(data.url);
      return { ok: true };
    }

    return {
      ok: false,
      error: "Không nhận được URL chuyển hướng từ Supabase Google OAuth.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể kết nối Google OAuth",
    };
  }
}

/**
 * Update the logged-in user's display name and persist it to Supabase Auth + user_stats
 */
export async function updateUserDisplayName(
  fullName: string
): Promise<UserProfile | null> {
  const cleanName = fullName.trim();
  if (!cleanName) return getStoredUserProfile();

  const current = await getCurrentUser();
  if (!current) return null;

  const updatedProfile: UserProfile = {
    ...current,
    full_name: cleanName,
    last_synced_at: new Date().toISOString(),
  };

  saveStoredUserProfile(updatedProfile, true);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.updateUser({
        data: { full_name: cleanName, name: cleanName },
      });
      await supabase
        .from("user_stats")
        .update({
          full_name: cleanName,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", current.id);
    } catch {
      // Ignore network errors
    }
  }

  return updatedProfile;
}

/**
 * Sign out current user and clear local personal cache so another account starts clean
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  lastSyncedUserId = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    window.localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEYS.STREAK);
    window.sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    resetLocalToSeed();
  }
  if (supabase) {
    await withTimeout(supabase.auth.signOut(), 2500, null);
  }
  saveStoredUserProfile(null, true);
}

/**
 * Bidirectional sync of user account info, streak (`user_stats`), and per-card SRS progress (`user_card_progress`)
 */
export async function syncUserProgressWithCloud(
  user: UserProfile
): Promise<void> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const today = getTodayDateString();
      const yesterday = getYesterdayDateString();
      const localStreak = getStreakData();

      // Check both authenticated UUID and any legacy deterministic UUID for the same email
      const legacyId = user.email
        ? emailToDeterministicUuid(user.email)
        : null;

      const { data: existingStats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let remoteStats = existingStats;
      if (!remoteStats && legacyId && legacyId !== user.id) {
        const { data: legacyStats } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", legacyId)
          .maybeSingle();
        if (legacyStats) {
          remoteStats = legacyStats;
        }
      }

      // 1. Merge Streak & Profile Info
      let mergedStreak: StreakData = { ...localStreak };

      if (remoteStats) {
        const remoteDate: string | null = remoteStats.last_study_date || null;
        const remoteStreakCount: number = remoteStats.current_streak || 1;
        const remoteTodayCount: number = remoteStats.today_reviewed_count || 0;

        if (remoteDate === today && localStreak.lastStudyDate === today) {
          mergedStreak = {
            currentStreak: Math.max(
              localStreak.currentStreak,
              remoteStreakCount
            ),
            lastStudyDate: today,
            todayReviewedCount: Math.max(
              localStreak.todayReviewedCount,
              remoteTodayCount
            ),
          };
        } else if (remoteDate === today) {
          mergedStreak = {
            currentStreak: remoteStreakCount,
            lastStudyDate: today,
            todayReviewedCount: remoteTodayCount,
          };
        } else if (localStreak.lastStudyDate === today) {
          const nextStreak =
            remoteDate === yesterday
              ? Math.max(localStreak.currentStreak, remoteStreakCount + 1)
              : Math.max(localStreak.currentStreak, remoteStreakCount);
          mergedStreak = {
            currentStreak: nextStreak,
            lastStudyDate: today,
            todayReviewedCount: localStreak.todayReviewedCount,
          };
        } else if (remoteDate === yesterday) {
          mergedStreak = {
            currentStreak: remoteStreakCount,
            lastStudyDate: yesterday,
            todayReviewedCount: 0,
          };
        } else {
          mergedStreak = {
            currentStreak: Math.max(
              localStreak.currentStreak,
              remoteStreakCount
            ),
            lastStudyDate: remoteDate || localStreak.lastStudyDate,
            todayReviewedCount: 0,
          };
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.STREAK,
          JSON.stringify(mergedStreak)
        );
      }

      const finalFullName =
        user.full_name || remoteStats?.full_name || "Học viên SpeakFlow";
      const finalAvatarUrl =
        user.avatar_url || remoteStats?.avatar_url || undefined;

      await supabase.from("user_stats").upsert(
        {
          user_id: user.id,
          email: user.email,
          full_name: finalFullName,
          avatar_url: finalAvatarUrl || null,
          current_streak: mergedStreak.currentStreak,
          last_study_date: mergedStreak.lastStudyDate,
          today_reviewed_count: mergedStreak.todayReviewedCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      // 2. Pull remote `user_card_progress` & merge with local practiced cards
      const userIdsToFetch =
        legacyId && legacyId !== user.id ? [user.id, legacyId] : [user.id];

      const { data: remoteProgressRows } = await supabase
        .from("user_card_progress")
        .select("*")
        .in("user_id", userIdsToFetch);

      const remoteMap = new Map<
        string,
        {
          card_id: string;
          box: number;
          interval_days: number;
          ease_factor: number;
          next_review_at: string;
          last_practiced_at: string;
        }
      >();

      if (remoteProgressRows && remoteProgressRows.length > 0) {
        for (const row of remoteProgressRows) {
          const existing = remoteMap.get(row.card_id);
          if (
            !existing ||
            new Date(row.last_practiced_at).getTime() >
              new Date(existing.last_practiced_at).getTime()
          ) {
            remoteMap.set(row.card_id, row);
          }
        }
      }

      const { cards: localCards } = ensureLocalSeed();
      const rowsToUpsert: Array<{
        user_id: string;
        card_id: string;
        box: number;
        interval_days: number;
        ease_factor: number;
        next_review_at: string;
        last_practiced_at: string;
      }> = [];

      const mergedCards = localCards.map((card) => {
        const remoteProg = remoteMap.get(card.id);
        const localPracticed =
          card.last_practiced_at !== null || card.box > 1;

        if (remoteProg && localPracticed) {
          const remoteTime = new Date(
            remoteProg.last_practiced_at || 0
          ).getTime();
          const localTime = new Date(card.last_practiced_at || 0).getTime();

          if (localTime > remoteTime) {
            rowsToUpsert.push({
              user_id: user.id,
              card_id: card.id,
              box: card.box,
              interval_days: card.interval_days,
              ease_factor: card.ease_factor,
              next_review_at: card.next_review_at,
              last_practiced_at:
                card.last_practiced_at || new Date().toISOString(),
            });
            return card;
          } else {
            return {
              ...card,
              box: remoteProg.box,
              interval_days: remoteProg.interval_days,
              ease_factor: remoteProg.ease_factor,
              next_review_at: remoteProg.next_review_at,
              last_practiced_at: remoteProg.last_practiced_at,
            };
          }
        } else if (remoteProg) {
          return {
            ...card,
            box: remoteProg.box,
            interval_days: remoteProg.interval_days,
            ease_factor: remoteProg.ease_factor,
            next_review_at: remoteProg.next_review_at,
            last_practiced_at: remoteProg.last_practiced_at,
          };
        } else if (localPracticed) {
          rowsToUpsert.push({
            user_id: user.id,
            card_id: card.id,
            box: card.box,
            interval_days: card.interval_days,
            ease_factor: card.ease_factor,
            next_review_at: card.next_review_at,
            last_practiced_at:
              card.last_practiced_at || new Date().toISOString(),
          });
          return card;
        }

        return card;
      });

      // Also migrate any legacy rows that belonged to legacyId into user.id
      if (legacyId && legacyId !== user.id && remoteProgressRows) {
        for (const r of remoteProgressRows) {
          if (
            r.user_id === legacyId &&
            !rowsToUpsert.some((u) => u.card_id === r.card_id)
          ) {
            rowsToUpsert.push({
              user_id: user.id,
              card_id: r.card_id,
              box: r.box,
              interval_days: r.interval_days,
              ease_factor: r.ease_factor,
              next_review_at: r.next_review_at,
              last_practiced_at: r.last_practiced_at,
            });
          }
        }
      }

      if (rowsToUpsert.length > 0) {
        await supabase
          .from("user_card_progress")
          .upsert(rowsToUpsert, { onConflict: "user_id,card_id" });
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.CARDS,
          JSON.stringify(mergedCards)
        );
        memoryCachedCards = mergedCards;
      }

      const syncedProfile: UserProfile = {
        ...user,
        full_name: finalFullName,
        avatar_url: finalAvatarUrl,
        last_synced_at: new Date().toISOString(),
      };
      saveStoredUserProfile(syncedProfile, true);
    } catch {
      // Ignore network errors cleanly
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

export function getInitialLocalData(): { decks: Deck[]; cards: Card[] } {
  return ensureLocalSeed();
}

export function getInitialAccountProgressSummary(): AccountProgressSummary {
  const { cards } = ensureLocalSeed();
  const user = getStoredUserProfile();
  const streak = getStreakData();

  const practicedCards = cards.filter(
    (c) => c.last_practiced_at !== null || c.box > 1
  ).length;
  const masteredCards = cards.filter(
    (c) => c.box >= 3 || c.interval_days >= 3
  ).length;
  const dueCards = cards.filter((c) => isCardDue(c)).length;

  return {
    totalCards: cards.length,
    practicedCards,
    masteredCards,
    dueCards,
    currentStreak: streak.currentStreak,
    todayReviewedCount: streak.todayReviewedCount,
    lastStudyDate: streak.lastStudyDate,
    lastSyncedAt: user?.last_synced_at || null,
  };
}

/**
 * Get a complete summary of the current user's saved progress
 */
export async function getAccountProgressSummary(): Promise<AccountProgressSummary> {
  const [cards, user] = await Promise.all([getCards(), getCurrentUser()]);
  const streak = getStreakData();

  const practicedCards = cards.filter(
    (c) => c.last_practiced_at !== null || c.box > 1
  ).length;
  const masteredCards = cards.filter(
    (c) => c.box >= 3 || c.interval_days >= 3
  ).length;
  const dueCards = cards.filter((c) => isCardDue(c)).length;

  return {
    totalCards: cards.length,
    practicedCards,
    masteredCards,
    dueCards,
    currentStreak: streak.currentStreak,
    todayReviewedCount: streak.todayReviewedCount,
    lastStudyDate: streak.lastStudyDate,
    lastSyncedAt: user?.last_synced_at || null,
  };
}

// ============================================================================
// CORE DATA SERVICE LAYER (DECKS, CARDS & PER-USER SRS PROGRESS)
// ============================================================================

let memoryCachedDecks: Deck[] | null = null;
let memoryCachedCards: Card[] | null = null;

export function invalidateMemorySeedCache(): void {
  memoryCachedDecks = null;
  memoryCachedCards = null;
}

/**
 * Initialize localStorage with seed data if empty (memoized in RAM for instant microsecond access)
 */
function ensureLocalSeed(): { decks: Deck[]; cards: Card[] } {
  if (typeof window === "undefined") {
    return { decks: SEED_DECKS, cards: SEED_CARDS };
  }

  if (memoryCachedDecks && memoryCachedCards) {
    return { decks: memoryCachedDecks, cards: memoryCachedCards };
  }

  let decks: Deck[] = [];
  let cards: Card[] = [];

  try {
    const rawDecks = window.localStorage.getItem(STORAGE_KEYS.DECKS);
    if (rawDecks) {
      decks = JSON.parse(rawDecks);
    }
    if (!Array.isArray(decks) || decks.length === 0) {
      decks = SEED_DECKS;
      window.localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
    } else {
      const seedDeckMap = new Map(SEED_DECKS.map((d) => [d.id, d]));
      let decksChanged = false;
      decks = decks.map((d) => {
        const seedDeck = seedDeckMap.get(d.id);
        if (
          seedDeck &&
          (d.title !== seedDeck.title || d.description !== seedDeck.description)
        ) {
          decksChanged = true;
          return {
            ...d,
            title: seedDeck.title,
            description: seedDeck.description,
          };
        }
        return d;
      });
      if (decksChanged) {
        window.localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
      }
    }
  } catch {
    decks = SEED_DECKS;
    window.localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
  }

  try {
    const rawCards = window.localStorage.getItem(STORAGE_KEYS.CARDS);
    if (rawCards) {
      cards = JSON.parse(rawCards);
    }
    if (!Array.isArray(cards) || cards.length === 0) {
      cards = SEED_CARDS;
      window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    } else {
      const existingIds = new Set(cards.map((c) => c.id));
      const missingSeedCards = SEED_CARDS.filter(
        (sc) => !existingIds.has(sc.id)
      );
      if (missingSeedCards.length > 0) {
        cards = [...cards, ...missingSeedCards];
        window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
      }
    }
  } catch {
    cards = SEED_CARDS;
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  }

  memoryCachedDecks = decks;
  memoryCachedCards = cards;
  return { decks, cards };
}

/**
 * Fetch all decks (from Supabase with seamless fallback to localStorage)
 */
export async function getDecks(): Promise<Deck[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        if (data.length > 0) {
          return data as Deck[];
        }
        const { data: seededDecks, error: seedErr } = await supabase
          .from("decks")
          .upsert(SEED_DECKS, { onConflict: "id" })
          .select("*");
        if (!seedErr && seededDecks && seededDecks.length > 0) {
          return seededDecks as Deck[];
        }
      }
    } catch {
      // Fallback to local
    }
  }

  return ensureLocalSeed().decks;
}

/**
 * Fetch all cards (optionally filtered by deck_id) + merge logged-in Google user's personal SRS progress
 */
export async function getCards(deckId?: string): Promise<Card[]> {
  const activeUser = getStoredUserProfile() || (await getCurrentUser());
  if (activeUser?.provider === "demo") {
    const { cards } = ensureLocalSeed();
    return deckId ? cards.filter((c) => c.deck_id === deckId) : cards;
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase.from("cards").select("*");
      if (deckId) {
        query = query.eq("deck_id", deckId);
      }
      const { data, error } = await query;
      if (!error && data) {
        let baseCards: Card[] = data as Card[];

        if (!deckId && baseCards.length < SEED_CARDS.length) {
          await supabase.from("decks").upsert(SEED_DECKS, { onConflict: "id" });
          const existingIds = new Set(baseCards.map((c) => c.id));
          const missingSeedCards = SEED_CARDS.filter(
            (sc) => !existingIds.has(sc.id)
          );
          if (missingSeedCards.length > 0) {
            const { data: insertedCards, error: seedErr } = await supabase
              .from("cards")
              .upsert(missingSeedCards, { onConflict: "id" })
              .select("*");
            if (!seedErr && insertedCards && insertedCards.length > 0) {
              baseCards = [...baseCards, ...(insertedCards as Card[])];
            }
          }
        } else if (deckId) {
          const expectedSeedForDeck = SEED_CARDS.filter(
            (sc) => sc.deck_id === deckId
          );
          const existingIds = new Set(baseCards.map((c) => c.id));
          const missingForDeck = expectedSeedForDeck.filter(
            (sc) => !existingIds.has(sc.id)
          );
          if (missingForDeck.length > 0) {
            await supabase
              .from("decks")
              .upsert(SEED_DECKS, { onConflict: "id" });
            const { data: insertedDeckCards, error: seedErr } = await supabase
              .from("cards")
              .upsert(missingForDeck, { onConflict: "id" })
              .select("*");
            if (!seedErr && insertedDeckCards && insertedDeckCards.length > 0) {
              baseCards = [...baseCards, ...(insertedDeckCards as Card[])];
            }
          }
        }

        // If a Google user is logged in, overlay their personal `user_card_progress`
        if (activeUser && baseCards.length > 0) {
          const { data: progressData } = await supabase
            .from("user_card_progress")
            .select("*")
            .eq("user_id", activeUser.id);

          if (progressData && progressData.length > 0) {
            const progressMap = new Map(
              progressData.map((p) => [p.card_id, p])
            );
            baseCards = baseCards.map((card) => {
              const userProg = progressMap.get(card.id);
              if (!userProg) return card;
              return {
                ...card,
                box: userProg.box,
                interval_days: userProg.interval_days,
                ease_factor: userProg.ease_factor,
                next_review_at: userProg.next_review_at,
                last_practiced_at: userProg.last_practiced_at,
              };
            });
          } else {
            // Reset any card progress on baseCards that might have come from anonymous table updates
            baseCards = baseCards.map((card) => ({
              ...card,
              box: 1,
              interval_days: 0,
              ease_factor: 2.5,
              last_practiced_at: null,
            }));
          }
        }

        if (!deckId && typeof window !== "undefined" && baseCards.length > 0) {
          window.localStorage.setItem(
            STORAGE_KEYS.CARDS,
            JSON.stringify(baseCards)
          );
          memoryCachedCards = baseCards;
        }

        if (baseCards.length > 0) {
          return baseCards;
        }
      }
    } catch {
      // Fallback to local
    }
  }

  const { cards } = ensureLocalSeed();
  if (deckId) {
    return cards.filter((c) => c.deck_id === deckId);
  }
  return cards;
}

/**
 * Fetch cards due for SRS review right now
 */
export async function getDueCards(deckId?: string): Promise<Card[]> {
  const cards = await getCards(deckId);
  return cards
    .filter((card) => isCardDue(card))
    .sort(
      (a, b) =>
        new Date(a.next_review_at).getTime() -
        new Date(b.next_review_at).getTime()
    );
}

/**
 * Update a card's SRS values after user rating (saves to per-user table if logged in + updates user_stats)
 */
export async function submitCardReview(
  card: Card,
  rating: SRSRating
): Promise<Card> {
  const srsUpdate = calculateNextSRS(card, rating);
  const updatedCard: Card = {
    ...card,
    ...srsUpdate,
  };

  let latestStreak: StreakData | null = null;

  // Always update localStorage cache
  if (typeof window !== "undefined") {
    const { cards } = ensureLocalSeed();
    const nextCards = cards.map((c) => (c.id === card.id ? updatedCard : c));
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(nextCards));
    memoryCachedCards = nextCards;
    latestStreak = recordStudyActivity(1);
  }

  const supabase = getSupabaseClient();
  const activeUser = (await getCurrentUser()) || getStoredUserProfile();

  if (supabase) {
    try {
      if (activeUser) {
        // Save to per-user progress table
        await supabase.from("user_card_progress").upsert(
          {
            user_id: activeUser.id,
            card_id: card.id,
            box: srsUpdate.box,
            interval_days: srsUpdate.interval_days,
            ease_factor: srsUpdate.ease_factor,
            next_review_at: srsUpdate.next_review_at,
            last_practiced_at: srsUpdate.last_practiced_at,
          },
          { onConflict: "user_id,card_id" }
        );

        if (latestStreak) {
          await supabase.from("user_stats").upsert(
            {
              user_id: activeUser.id,
              email: activeUser.email,
              full_name: activeUser.full_name,
              avatar_url: activeUser.avatar_url || null,
              current_streak: latestStreak.currentStreak,
              last_study_date: latestStreak.lastStudyDate,
              today_reviewed_count: latestStreak.todayReviewedCount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }

        saveStoredUserProfile(
          {
            ...activeUser,
            last_synced_at: new Date().toISOString(),
          },
          false
        );
      } else {
        // Anonymous global card table update
        await supabase
          .from("cards")
          .update({
            box: srsUpdate.box,
            interval_days: srsUpdate.interval_days,
            ease_factor: srsUpdate.ease_factor,
            next_review_at: srsUpdate.next_review_at,
            last_practiced_at: srsUpdate.last_practiced_at,
          })
          .eq("id", card.id);
      }
    } catch {
      // Already saved in localStorage
    }
  }

  return updatedCard;
}

/**
 * Save progress & streak after completing a 60-Second Reflex Drill session
 */
export async function saveReflexDrillProgress(
  drillItems: Array<{ card: Card; passed: boolean; score: number }>
): Promise<void> {
  const count = Math.max(1, drillItems.length);
  const latestStreak = recordStudyActivity(count);
  const nowIso = new Date().toISOString();

  // Update local cards last_practiced_at for practiced items
  if (typeof window !== "undefined" && drillItems.length > 0) {
    const { cards } = ensureLocalSeed();
    const practicedMap = new Map(drillItems.map((item) => [item.card.id, item]));
    const nextCards = cards.map((c) => {
      const item = practicedMap.get(c.id);
      if (!item) return c;
      if (item.passed && c.box === 1) {
        const srsUpdate = calculateNextSRS(c, "good");
        return { ...c, ...srsUpdate };
      }
      return {
        ...c,
        last_practiced_at: nowIso,
      };
    });
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(nextCards));
    memoryCachedCards = nextCards;
  }

  const supabase = getSupabaseClient();
  const activeUser = (await getCurrentUser()) || getStoredUserProfile();

  if (supabase && activeUser) {
    try {
      await supabase.from("user_stats").upsert(
        {
          user_id: activeUser.id,
          email: activeUser.email,
          full_name: activeUser.full_name,
          avatar_url: activeUser.avatar_url || null,
          current_streak: latestStreak.currentStreak,
          last_study_date: latestStreak.lastStudyDate,
          today_reviewed_count: latestStreak.todayReviewedCount,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

      if (drillItems.length > 0) {
        const progressRows = drillItems.map((item) => {
          if (item.passed && item.card.box === 1) {
            const srs = calculateNextSRS(item.card, "good");
            return {
              user_id: activeUser.id,
              card_id: item.card.id,
              box: srs.box,
              interval_days: srs.interval_days,
              ease_factor: srs.ease_factor,
              next_review_at: srs.next_review_at,
              last_practiced_at: nowIso,
            };
          }
          return {
            user_id: activeUser.id,
            card_id: item.card.id,
            box: item.card.box,
            interval_days: item.card.interval_days,
            ease_factor: item.card.ease_factor,
            next_review_at: item.card.next_review_at,
            last_practiced_at: nowIso,
          };
        });

        await supabase
          .from("user_card_progress")
          .upsert(progressRows, { onConflict: "user_id,card_id" });
      }

      saveStoredUserProfile(
        {
          ...activeUser,
          last_synced_at: nowIso,
        },
        true
      );
    } catch {
      // Ignore network errors
    }
  }
}

/**
 * Create a new custom card
 */
export async function addCard(
  newCardInput: Omit<
    Card,
    | "id"
    | "box"
    | "interval_days"
    | "ease_factor"
    | "next_review_at"
    | "last_practiced_at"
  >
): Promise<Card> {
  const nowIso = new Date().toISOString();
  const newCard: Card = {
    ...newCardInput,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  };

  if (typeof window !== "undefined") {
    const { cards } = ensureLocalSeed();
    const updated = [newCard, ...cards];
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(updated));
    memoryCachedCards = updated;
  }

  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();
  if (supabase) {
    try {
      const payload = activeUser
        ? { ...newCard, user_id: activeUser.id }
        : newCard;
      const { data, error } = await supabase
        .from("cards")
        .insert([payload])
        .select()
        .single();
      if (!error && data) {
        return data as Card;
      }
    } catch {
      // Fallback already persisted in localStorage
    }
  }

  return newCard;
}

/**
 * Batch import multiple cards (from JSON or CSV)
 */
export async function importCardsBatch(
  items: Array<{
    deck_id?: string;
    phrase_en: string;
    ipa?: string;
    meaning_vi: string;
    sentence_en: string;
    sentence_vi: string;
    context_note?: string;
  }>,
  defaultDeckId: string
): Promise<Card[]> {
  const nowIso = new Date().toISOString();
  const createdCards: Card[] = items
    .filter((item) => item.phrase_en && item.sentence_en && item.sentence_vi)
    .map((item, idx) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${idx}`,
      deck_id: item.deck_id || defaultDeckId,
      phrase_en: item.phrase_en.trim(),
      ipa: item.ipa?.trim() || "/.../",
      meaning_vi: item.meaning_vi?.trim() || item.sentence_vi.trim(),
      sentence_en: item.sentence_en.trim(),
      sentence_vi: item.sentence_vi.trim(),
      context_note:
        item.context_note?.trim() ||
        "Cụm từ tự thêm để luyện phản xạ giao tiếp.",
      box: 1,
      interval_days: 0,
      ease_factor: 2.5,
      next_review_at: nowIso,
      last_practiced_at: null,
    }));

  if (createdCards.length === 0) return [];

  if (typeof window !== "undefined") {
    const { cards } = ensureLocalSeed();
    const updated = [...createdCards, ...cards];
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(updated));
    memoryCachedCards = updated;
  }

  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();
  if (supabase) {
    try {
      const payload = activeUser
        ? createdCards.map((c) => ({ ...c, user_id: activeUser.id }))
        : createdCards;
      await supabase.from("cards").insert(payload);
    } catch {
      // Fallback already saved locally
    }
  }

  return createdCards;
}

/**
 * Delete a card by ID
 */
export async function deleteCard(cardId: string): Promise<void> {
  if (typeof window !== "undefined") {
    const { cards } = ensureLocalSeed();
    const filtered = cards.filter((c) => c.id !== cardId);
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(filtered));
    memoryCachedCards = filtered;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("cards").delete().eq("id", cardId);
    } catch {
      // ignore
    }
  }
}

/**
 * Reset local data back to default seed cards
 */
export function resetLocalToSeed(): void {
  if (typeof window === "undefined") return;
  const freshNow = new Date().toISOString();
  const resetCards = SEED_CARDS.map((c) => ({
    ...c,
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: freshNow,
    last_practiced_at: null,
  }));
  window.localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(SEED_DECKS));
  window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(resetCards));
  memoryCachedDecks = SEED_DECKS;
  memoryCachedCards = resetCards;
}

/**
 * Daily Streak tracking
 */
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getStreakData(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 1, lastStudyDate: null, todayReviewedCount: 0 };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!raw) {
      return { currentStreak: 1, lastStudyDate: null, todayReviewedCount: 0 };
    }
    const parsed: StreakData = JSON.parse(raw);
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();

    if (parsed.lastStudyDate === today) {
      return parsed;
    }
    if (parsed.lastStudyDate === yesterday) {
      return {
        currentStreak: parsed.currentStreak,
        lastStudyDate: parsed.lastStudyDate,
        todayReviewedCount: 0,
      };
    }
    return {
      currentStreak: 1,
      lastStudyDate: parsed.lastStudyDate,
      todayReviewedCount: 0,
    };
  } catch {
    return { currentStreak: 1, lastStudyDate: null, todayReviewedCount: 0 };
  }
}

export function recordStudyActivity(incrementCount = 1): StreakData {
  if (typeof window === "undefined") {
    return {
      currentStreak: 1,
      lastStudyDate: null,
      todayReviewedCount: incrementCount,
    };
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const current = getStreakData();

  let nextStreak = current.currentStreak || 1;
  let todayCount = current.todayReviewedCount || 0;

  if (current.lastStudyDate === today) {
    todayCount += incrementCount;
  } else if (current.lastStudyDate === yesterday) {
    nextStreak += 1;
    todayCount = incrementCount;
  } else {
    nextStreak = 1;
    todayCount = incrementCount;
  }

  const updated: StreakData = {
    currentStreak: nextStreak,
    lastStudyDate: today,
    todayReviewedCount: todayCount,
  };

  window.localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
  return updated;
}
