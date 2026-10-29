import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Card, Deck, SEED_CARDS, SEED_DECKS } from "./seedData";
import { calculateNextSRS, isCardDue, SRSRating } from "./srs";

const STORAGE_KEYS = {
  DECKS: "speakflow_decks_v1",
  CARDS: "speakflow_cards_v1",
  STREAK: "speakflow_streak_v1",
  FORCE_LOCAL: "speakflow_force_local_v1",
  USER_PROFILE: "speakflow_user_profile_v1",
};

const DEFAULT_SUPABASE_URL = "https://ncfudvrowukvppppexcf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "sb_publishable_R4qlwEYBtVqTCeNHKH6HdQ_29XF8ceW";

export interface StreakData {
  currentStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  todayReviewedCount: number;
}

export interface UserProfile {
  id: string; // UUID from Supabase Google Auth
  email: string;
  full_name: string;
  avatar_url?: string;
  provider: "google";
  last_synced_at?: string;
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

  return {
    id: u.id,
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
    provider: "google",
    last_synced_at:
      existingProfile?.last_synced_at || new Date().toISOString(),
  };
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
// GOOGLE OAUTH & CLOUD USER PROFILE MANAGEMENT
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

  return {
    id: payload.sub,
    email,
    full_name: fullName,
    avatar_url: avatarUrl,
    provider: "google",
    last_synced_at: new Date().toISOString(),
  };
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
        return parsed;
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
    window.localStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile)
    );
    if (notify) {
      const sig = `${profile.id}|${profile.email}|${profile.full_name}|${
        profile.avatar_url || ""
      }|${profile.last_synced_at || ""}`;
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
 * Get active logged-in Google user from Supabase OAuth session (and sync profile + progress)
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return getStoredUserProfile();
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

/**
 * Initialize localStorage with seed data if empty
 */
function ensureLocalSeed(): { decks: Deck[]; cards: Card[] } {
  if (typeof window === "undefined") {
    return { decks: SEED_DECKS, cards: SEED_CARDS };
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
  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile() || (await getCurrentUser());

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
