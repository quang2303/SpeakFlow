import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
  id: string; // UUID
  email: string;
  full_name: string;
  avatar_url?: string;
  provider: "google" | "cloud";
}

export type StorageMode = "supabase" | "local";

let supabaseInstance: SupabaseClient | null = null;

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
 * Generate a deterministic UUID from an email string so the same Gmail
 * maps to the exact same UUID across PC and Mobile devices.
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

/**
 * Get or initialize the Supabase client if configured and not forced to local mode
 */
export function getSupabaseClient(): SupabaseClient | null {
  const creds = resolveSupabaseCredentials();
  if (!creds) return null;

  if (typeof window !== "undefined") {
    const forceLocal = window.localStorage.getItem(STORAGE_KEYS.FORCE_LOCAL);
    if (forceLocal === "true") return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(creds.url, creds.key);
  }
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
  window.dispatchEvent(new Event("speakflow-auth-changed"));
}

export function isForceLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEYS.FORCE_LOCAL) === "true";
}

// ============================================================================
// GOOGLE AUTH & CLOUD USER PROFILE MANAGEMENT
// ============================================================================

export function getStoredUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function saveStoredUserProfile(profile: UserProfile | null): void {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } else {
    window.localStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(profile)
    );
  }
  window.dispatchEvent(new Event("speakflow-auth-changed"));
}

/**
 * Get active logged-in user (checks Supabase OAuth session first, then stored Google/Cloud profile)
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || "",
          full_name:
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split("@")[0] ||
            "Học viên SpeakFlow",
          avatar_url:
            u.user_metadata?.avatar_url || u.user_metadata?.picture || undefined,
          provider: "google",
        };
        saveStoredUserProfile(profile);
        return profile;
      }
    } catch {
      // Fallback to stored profile
    }
  }
  return getStoredUserProfile();
}

/**
 * Trigger Supabase Google OAuth Sign-In
 */
export async function signInWithGoogleOAuth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      error: "Đang ở chế độ Local. Hãy bật chế độ Supabase Cloud trước.",
    };
  }

  try {
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Không thể kết nối Google OAuth",
    };
  }
}

/**
 * Instant Google / Gmail Cloud Sync Sign-In (Works immediately even before Google OAuth Client ID is configured in Supabase)
 * Syncs all learning progress & streaks to `user_card_progress` and `user_stats` on Supabase by Gmail!
 */
export async function signInWithGmailCloudSync(
  email: string,
  fullName?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName =
    fullName?.trim() ||
    cleanEmail
      .split("@")[0]
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const userId = emailToDeterministicUuid(cleanEmail);
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    displayName
  )}&backgroundColor=0284c7,4f46e5,059669`;

  const profile: UserProfile = {
    id: userId,
    email: cleanEmail,
    full_name: displayName,
    avatar_url: avatarUrl,
    provider: "cloud",
  };

  saveStoredUserProfile(profile);
  await syncUserProgressWithCloud(profile);
  return profile;
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  saveStoredUserProfile(null);
}

/**
 * Sync local practiced cards & streak with Supabase `user_card_progress` and `user_stats`
 */
export async function syncUserProgressWithCloud(
  user: UserProfile
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    // 1. Sync user_stats (streak)
    const localStreak = getStreakData();
    const { data: existingStats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingStats) {
      const mergedStreak: StreakData = {
        currentStreak: Math.max(
          localStreak.currentStreak,
          existingStats.current_streak || 1
        ),
        lastStudyDate:
          existingStats.last_study_date || localStreak.lastStudyDate,
        todayReviewedCount: Math.max(
          localStreak.todayReviewedCount,
          existingStats.today_reviewed_count || 0
        ),
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.STREAK,
          JSON.stringify(mergedStreak)
        );
      }
      await supabase.from("user_stats").upsert({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url || null,
        current_streak: mergedStreak.currentStreak,
        last_study_date: mergedStreak.lastStudyDate,
        today_reviewed_count: mergedStreak.todayReviewedCount,
        updated_at: new Date().toISOString(),
      });
    } else {
      await supabase.from("user_stats").upsert({
        user_id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url || null,
        current_streak: localStreak.currentStreak,
        last_study_date: localStreak.lastStudyDate,
        today_reviewed_count: localStreak.todayReviewedCount,
        updated_at: new Date().toISOString(),
      });
    }

    // 2. Push any locally practiced cards to `user_card_progress`
    const { cards: localCards } = ensureLocalSeed();
    const practicedLocal = localCards.filter(
      (c) => c.last_practiced_at !== null || c.box > 1
    );

    if (practicedLocal.length > 0) {
      const rows = practicedLocal.map((c) => ({
        user_id: user.id,
        card_id: c.id,
        box: c.box,
        interval_days: c.interval_days,
        ease_factor: c.ease_factor,
        next_review_at: c.next_review_at,
        last_practiced_at: c.last_practiced_at || new Date().toISOString(),
      }));
      await supabase
        .from("user_card_progress")
        .upsert(rows, { onConflict: "user_id,card_id" });
    }
  } catch {
    // Ignore network errors cleanly
  }
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
      // Sync deck titles/descriptions from SEED_DECKS if updated
      const seedDeckMap = new Map(SEED_DECKS.map((d) => [d.id, d]));
      let decksChanged = false;
      decks = decks.map((d) => {
        const seedDeck = seedDeckMap.get(d.id);
        if (seedDeck && (d.title !== seedDeck.title || d.description !== seedDeck.description)) {
          decksChanged = true;
          return { ...d, title: seedDeck.title, description: seedDeck.description };
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
      // Auto-merge any newly added SEED_CARDS while preserving existing SRS progress
      const existingIds = new Set(cards.map((c) => c.id));
      const missingSeedCards = SEED_CARDS.filter((sc) => !existingIds.has(sc.id));
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
 * Fetch all cards (optionally filtered by deck_id) + merge logged-in user's personal SRS progress
 */
export async function getCards(deckId?: string): Promise<Card[]> {
  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();

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

        // If a user is logged in, overlay their personal `user_card_progress`
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
          }
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
 * Update a card's SRS values after user rating (saves to per-user table if logged in + card table)
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
    latestStreak = recordStudyActivity();
  }

  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();

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
          await supabase.from("user_stats").upsert({
            user_id: activeUser.id,
            email: activeUser.email,
            full_name: activeUser.full_name,
            avatar_url: activeUser.avatar_url || null,
            current_streak: latestStreak.currentStreak,
            last_study_date: latestStreak.lastStudyDate,
            today_reviewed_count: latestStreak.todayReviewedCount,
            updated_at: new Date().toISOString(),
          });
        }
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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cards")
        .insert([newCard])
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
  if (supabase) {
    try {
      await supabase.from("cards").insert(createdCards);
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
 * Reset local data back to default 30 seed cards
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

export function recordStudyActivity(): StreakData {
  if (typeof window === "undefined") {
    return { currentStreak: 1, lastStudyDate: null, todayReviewedCount: 1 };
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const current = getStreakData();

  let nextStreak = current.currentStreak || 1;
  let todayCount = current.todayReviewedCount || 0;

  if (current.lastStudyDate === today) {
    todayCount += 1;
  } else if (current.lastStudyDate === yesterday) {
    nextStreak += 1;
    todayCount = 1;
  } else {
    nextStreak = 1;
    todayCount = 1;
  }

  const updated: StreakData = {
    currentStreak: nextStreak,
    lastStudyDate: today,
    todayReviewedCount: todayCount,
  };

  window.localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
  return updated;
}
