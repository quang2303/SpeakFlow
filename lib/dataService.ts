import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Card, Deck, SEED_CARDS, SEED_DECKS } from "./seedData";
import { calculateNextSRS, isCardDue, SRSRating } from "./srs";

const STORAGE_KEYS = {
  DECKS: "speakflow_decks_v1",
  CARDS: "speakflow_cards_v1",
  STREAK: "speakflow_streak_v1",
  FORCE_LOCAL: "speakflow_force_local_v1",
};

const DEFAULT_SUPABASE_URL = "https://ncfudvrowukvppppexcf.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "sb_publishable_R4qlwEYBtVqTCeNHKH6HdQ_29XF8ceW";

export interface StreakData {
  currentStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  todayReviewedCount: number;
}

export type StorageMode = "supabase" | "local";

let supabaseInstance: SupabaseClient | null = null;

function resolveSupabaseCredentials(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
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
}

export function isForceLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEYS.FORCE_LOCAL) === "true";
}

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
        // Table exists in Supabase but is empty -> auto-seed initial decks
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
 * Fetch all cards (optionally filtered by deck_id)
 */
export async function getCards(deckId?: string): Promise<Card[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from("cards").select("*");
      if (deckId) {
        query = query.eq("deck_id", deckId);
      }
      const { data, error } = await query;
      if (!error && data) {
        if (data.length > 0) {
          return data as Card[];
        }
        if (!deckId) {
          // Table exists in Supabase but is empty -> auto-seed initial cards
          await supabase.from("decks").upsert(SEED_DECKS, { onConflict: "id" });
          const { data: seededCards, error: seedErr } = await supabase
            .from("cards")
            .upsert(SEED_CARDS, { onConflict: "id" })
            .select("*");
          if (!seedErr && seededCards && seededCards.length > 0) {
            return seededCards as Card[];
          }
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
 * Update a card's SRS values after user rating
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

  // Always update localStorage cache
  if (typeof window !== "undefined") {
    const { cards } = ensureLocalSeed();
    const nextCards = cards.map((c) => (c.id === card.id ? updatedCard : c));
    window.localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(nextCards));
    recordStudyActivity();
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
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
 * Daily Streak tracking in localStorage
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
