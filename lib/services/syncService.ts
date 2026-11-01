import { SupabaseClient } from "@supabase/supabase-js";
import { Card, Deck } from "../seedData";
import { PendingCardAction, PendingDeckAction, UserProfile } from "./types";

export const OUTBOX_STORAGE_KEYS = {
  PENDING_CARDS: "speakflow_pending_cards_v1",
  PENDING_DECKS: "speakflow_pending_decks_v1",
};

/**
 * Get all pending card actions stored offline
 */
export function getPendingCardActions(): PendingCardAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_CARDS);
    return raw ? (JSON.parse(raw) as PendingCardAction[]) : [];
  } catch {
    return [];
  }
}

/**
 * Get all pending deck actions stored offline
 */
export function getPendingDeckActions(): PendingDeckAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_DECKS);
    return raw ? (JSON.parse(raw) as PendingDeckAction[]) : [];
  } catch {
    return [];
  }
}

/**
 * Enqueue a card action to be synced when network is available
 */
export function enqueuePendingCard(
  action: Omit<PendingCardAction, "id" | "timestamp">
): PendingCardAction {
  const item: PendingCardAction = {
    ...action,
    id: `pending-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPendingCardActions();
      // Replace existing pending action for same card if present
      const targetCardId = action.cardId || action.card?.id;
      const filtered = targetCardId
        ? current.filter((c) => (c.cardId || c.card?.id) !== targetCardId)
        : current;
      const next = [...filtered, item];
      window.localStorage.setItem(
        OUTBOX_STORAGE_KEYS.PENDING_CARDS,
        JSON.stringify(next)
      );
    } catch {
      // ignore local storage errors
    }
  }

  return item;
}

/**
 * Enqueue a deck action to be synced when network is available
 */
export function enqueuePendingDeck(
  action: Omit<PendingDeckAction, "id" | "timestamp">
): PendingDeckAction {
  const item: PendingDeckAction = {
    ...action,
    id: `pending-deck-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPendingDeckActions();
      const targetDeckId = action.deckId || action.deck?.id;
      const filtered = targetDeckId
        ? current.filter((d) => (d.deckId || d.deck?.id) !== targetDeckId)
        : current;
      const next = [...filtered, item];
      window.localStorage.setItem(
        OUTBOX_STORAGE_KEYS.PENDING_DECKS,
        JSON.stringify(next)
      );
    } catch {
      // ignore local storage errors
    }
  }

  return item;
}

/**
 * Remove executed card actions from outbox
 */
export function removePendingCardActions(idsToRemove: string[]): void {
  if (typeof window === "undefined" || idsToRemove.length === 0) return;
  try {
    const current = getPendingCardActions();
    const set = new Set(idsToRemove);
    const remaining = current.filter((c) => !set.has(c.id));
    window.localStorage.setItem(
      OUTBOX_STORAGE_KEYS.PENDING_CARDS,
      JSON.stringify(remaining)
    );
  } catch {
    // ignore
  }
}

/**
 * Remove executed deck actions from outbox
 */
export function removePendingDeckActions(idsToRemove: string[]): void {
  if (typeof window === "undefined" || idsToRemove.length === 0) return;
  try {
    const current = getPendingDeckActions();
    const set = new Set(idsToRemove);
    const remaining = current.filter((d) => !set.has(d.id));
    window.localStorage.setItem(
      OUTBOX_STORAGE_KEYS.PENDING_DECKS,
      JSON.stringify(remaining)
    );
  } catch {
    // ignore
  }
}

/**
 * Sanitize card object before inserting into Supabase
 */
function sanitizeCardPayload(card: Card, activeUserId?: string | null): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: card.id,
    deck_id: card.deck_id,
    phrase_en: card.phrase_en,
    ipa: card.ipa || "/.../",
    meaning_vi: card.meaning_vi,
    sentence_en: card.sentence_en,
    sentence_vi: card.sentence_vi,
    context_note: card.context_note || "",
    variations: card.variations || [],
    level: card.level || "B1",
  };
  if (activeUserId || card.user_id) {
    payload.user_id = activeUserId || card.user_id;
  }
  return payload;
}

/**
 * Flush all pending offline outbox changes to Supabase cloud.
 * Run automatically when network restores or during regular sync.
 */
export async function flushPendingOutboxSync(
  supabase: SupabaseClient,
  activeUser?: UserProfile | null
): Promise<{ cardsSynced: number; decksSynced: number; errors: number }> {
  let cardsSynced = 0;
  let decksSynced = 0;
  let errors = 0;

  // 1. Flush Pending Decks
  const pendingDecks = getPendingDeckActions();
  if (pendingDecks.length > 0) {
    const completedDeckActionIds: string[] = [];

    for (const item of pendingDecks) {
      try {
        if (item.action === "create" || item.action === "update") {
          if (!item.deck) continue;
          const deckPayload: Record<string, unknown> = {
            id: item.deck.id,
            title: item.deck.title,
            description: item.deck.description,
            icon: item.deck.icon || "BookOpen",
          };
          if (activeUser?.id || item.deck.user_id) {
            deckPayload.user_id = activeUser?.id || item.deck.user_id;
          }

          const { error } = await supabase
            .from("decks")
            .upsert(deckPayload, { onConflict: "id" });

          if (!error) {
            completedDeckActionIds.push(item.id);
            decksSynced++;
          } else {
            errors++;
          }
        } else if (item.action === "delete") {
          const deckId = item.deckId || item.deck?.id;
          if (!deckId) continue;

          let query = supabase.from("decks").delete().eq("id", deckId);
          if (activeUser?.role !== "admin" && activeUser?.id) {
            query = query.eq("user_id", activeUser.id);
          }
          const { error } = await query;
          if (!error) {
            completedDeckActionIds.push(item.id);
            decksSynced++;
          } else {
            errors++;
          }
        }
      } catch {
        errors++;
      }
    }

    if (completedDeckActionIds.length > 0) {
      removePendingDeckActions(completedDeckActionIds);
    }
  }

  // 2. Flush Pending Cards
  const pendingCards = getPendingCardActions();
  if (pendingCards.length > 0) {
    const completedCardActionIds: string[] = [];

    for (const item of pendingCards) {
      try {
        if (item.action === "create" || item.action === "update") {
          if (!item.card) continue;
          const payload = sanitizeCardPayload(item.card, activeUser?.id);
          const { error } = await supabase
            .from("cards")
            .upsert(payload, { onConflict: "id" });

          if (!error) {
            completedCardActionIds.push(item.id);
            cardsSynced++;
          } else {
            errors++;
          }
        } else if (item.action === "delete") {
          const cardId = item.cardId || item.card?.id;
          if (!cardId) continue;

          let query = supabase.from("cards").delete().eq("id", cardId);
          if (activeUser?.role !== "admin" && activeUser?.id) {
            query = query.eq("user_id", activeUser.id);
          }
          const { error } = await query;
          if (!error) {
            completedCardActionIds.push(item.id);
            cardsSynced++;
          } else {
            errors++;
          }
        }
      } catch {
        errors++;
      }
    }

    if (completedCardActionIds.length > 0) {
      removePendingCardActions(completedCardActionIds);
    }
  }

  return { cardsSynced, decksSynced, errors };
}

/**
 * Register a global listener for the 'online' event to flush outbox automatically.
 */
let isOnlineListenerAttached = false;

export function initOnlineSyncListener(
  triggerSync: () => Promise<void>
): () => void {
  if (typeof window === "undefined" || isOnlineListenerAttached) {
    return () => {};
  }

  isOnlineListenerAttached = true;
  const onlineHandler = () => {
    // Small delay to ensure network handshake settles
    setTimeout(() => {
      void triggerSync();
    }, 1500);
  };

  window.addEventListener("online", onlineHandler);
  return () => {
    window.removeEventListener("online", onlineHandler);
    isOnlineListenerAttached = false;
  };
}
