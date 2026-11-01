import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, Deck } from "../seedData";
import type {
  PendingCardAction,
  PendingDeckAction,
  PendingProgressAction,
  PendingStudyLogAction,
  ProgressSnapshot,
  UserProfile,
} from "./types";

export const OUTBOX_STORAGE_KEYS = {
  PENDING_CARDS: "speakflow_pending_cards_v1",
  PENDING_DECKS: "speakflow_pending_decks_v1",
  PENDING_PROGRESS: "speakflow_pending_progress_v1",
  PENDING_LOGS: "speakflow_pending_logs_v1",
};

const MAX_RETRY_COUNT = 5;

// ============================================================================
// 1. CARDS OUTBOX QUEUE
// ============================================================================

export function getPendingCardActions(): PendingCardAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_CARDS);
    return raw ? (JSON.parse(raw) as PendingCardAction[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingCard(
  action: Omit<PendingCardAction, "id" | "timestamp" | "retryCount">
): PendingCardAction {
  const item: PendingCardAction = {
    ...action,
    id: `pending-card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPendingCardActions();
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

// ============================================================================
// 2. DECKS OUTBOX QUEUE
// ============================================================================

export function getPendingDeckActions(): PendingDeckAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_DECKS);
    return raw ? (JSON.parse(raw) as PendingDeckAction[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingDeck(
  action: Omit<PendingDeckAction, "id" | "timestamp" | "retryCount">
): PendingDeckAction {
  const item: PendingDeckAction = {
    ...action,
    id: `pending-deck-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
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
      // ignore
    }
  }

  return item;
}

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

// ============================================================================
// 3. PROGRESS OUTBOX QUEUE (SRS REVIEWS)
// ============================================================================

export function getPendingProgressActions(): PendingProgressAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_PROGRESS);
    return raw ? (JSON.parse(raw) as PendingProgressAction[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingProgress(
  action: Omit<PendingProgressAction, "id" | "timestamp" | "retryCount">
): PendingProgressAction {
  const item: PendingProgressAction = {
    ...action,
    id: `pending-prog-${action.userId}-${action.cardId}-${Date.now()}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPendingProgressActions();
      // Replace older pending progress for same user and card
      const filtered = current.filter(
        (p) => !(p.userId === action.userId && p.cardId === action.cardId)
      );
      const next = [...filtered, item];
      window.localStorage.setItem(
        OUTBOX_STORAGE_KEYS.PENDING_PROGRESS,
        JSON.stringify(next)
      );
    } catch {
      // ignore
    }
  }

  return item;
}

export function removePendingProgressActions(idsToRemove: string[]): void {
  if (typeof window === "undefined" || idsToRemove.length === 0) return;
  try {
    const current = getPendingProgressActions();
    const set = new Set(idsToRemove);
    const remaining = current.filter((p) => !set.has(p.id));
    window.localStorage.setItem(
      OUTBOX_STORAGE_KEYS.PENDING_PROGRESS,
      JSON.stringify(remaining)
    );
  } catch {
    // ignore
  }
}

// ============================================================================
// 4. STUDY LOGS OUTBOX QUEUE
// ============================================================================

export function getPendingStudyLogActions(): PendingStudyLogAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_STORAGE_KEYS.PENDING_LOGS);
    return raw ? (JSON.parse(raw) as PendingStudyLogAction[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePendingStudyLog(
  action: Omit<PendingStudyLogAction, "id" | "timestamp" | "retryCount">
): PendingStudyLogAction {
  const item: PendingStudyLogAction = {
    ...action,
    id: action.log.id || `pending-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  if (typeof window !== "undefined") {
    try {
      const current = getPendingStudyLogActions();
      const next = [...current.filter((l) => l.id !== item.id), item];
      window.localStorage.setItem(
        OUTBOX_STORAGE_KEYS.PENDING_LOGS,
        JSON.stringify(next)
      );
    } catch {
      // ignore
    }
  }

  return item;
}

export function removePendingStudyLogActions(idsToRemove: string[]): void {
  if (typeof window === "undefined" || idsToRemove.length === 0) return;
  try {
    const current = getPendingStudyLogActions();
    const set = new Set(idsToRemove);
    const remaining = current.filter((l) => !set.has(l.id));
    window.localStorage.setItem(
      OUTBOX_STORAGE_KEYS.PENDING_LOGS,
      JSON.stringify(remaining)
    );
  } catch {
    // ignore
  }
}

// ============================================================================
// 5. CONFLICT RESOLUTION ENGINE (Multi-Device / Offline Merge)
// ============================================================================

/**
 * Resolves progress conflict between a local device record and a remote cloud record.
 * Rules:
 * 1. Primary rule: Fresher `last_practiced_at` wins (reflects recent memory recall).
 * 2. Safety-First Rule: If reviews occurred within 2 hours of each other and one side
 *    is `box === 1` (Again / forgotten), ALWAYS preserve the forgotten state (box 1 / earlier next_review).
 *    A learner should NEVER have a forgotten card marked as remembered by an out-of-order sync.
 * 3. Tie-breaker: If identical timestamps, lower box wins (conservative review interval).
 */
export function resolveCardProgressConflict(
  local: ProgressSnapshot,
  remote: ProgressSnapshot
): { winner: "local" | "remote"; merged: ProgressSnapshot } {
  const localTime = new Date(local.last_practiced_at || 0).getTime();
  const remoteTime = new Date(remote.last_practiced_at || 0).getTime();

  const timeDiffMs = Math.abs(localTime - remoteTime);
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  // Safety-first check: if reviews happened closely and one is box 1 (Again), pick box 1
  if (timeDiffMs <= TWO_HOURS_MS) {
    if (local.box === 1 && remote.box > 1) {
      return { winner: "local", merged: local };
    }
    if (remote.box === 1 && local.box > 1) {
      return { winner: "remote", merged: remote };
    }
  }

  // Normal recency rule
  if (localTime > remoteTime) {
    return { winner: "local", merged: local };
  } else if (remoteTime > localTime) {
    return { winner: "remote", merged: remote };
  }

  // Equal timestamps: pick lower box (conservative safety)
  if (local.box <= remote.box) {
    return { winner: "local", merged: local };
  }
  return { winner: "remote", merged: remote };
}

// ============================================================================
// 6. OUTBOX DRAIN / FLUSH DISPATCHER
// ============================================================================

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
 * Flush all pending offline outbox changes (decks, cards, user progress, study logs) to Supabase cloud.
 */
export async function flushPendingOutboxSync(
  supabase: SupabaseClient,
  activeUser?: UserProfile | null
): Promise<{
  cardsSynced: number;
  decksSynced: number;
  progressSynced: number;
  logsSynced: number;
  errors: number;
}> {
  let cardsSynced = 0;
  let decksSynced = 0;
  let progressSynced = 0;
  let logsSynced = 0;
  let errors = 0;

  // 1. Flush Pending Decks
  const pendingDecks = getPendingDeckActions();
  if (pendingDecks.length > 0) {
    const completedDeckActionIds: string[] = [];

    for (const item of pendingDecks) {
      if ((item.retryCount || 0) >= MAX_RETRY_COUNT) {
        completedDeckActionIds.push(item.id);
        continue;
      }
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
            item.retryCount = (item.retryCount || 0) + 1;
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
            item.retryCount = (item.retryCount || 0) + 1;
            errors++;
          }
        }
      } catch {
        item.retryCount = (item.retryCount || 0) + 1;
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
      if ((item.retryCount || 0) >= MAX_RETRY_COUNT) {
        completedCardActionIds.push(item.id);
        continue;
      }
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
            item.retryCount = (item.retryCount || 0) + 1;
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
            item.retryCount = (item.retryCount || 0) + 1;
            errors++;
          }
        }
      } catch {
        item.retryCount = (item.retryCount || 0) + 1;
        errors++;
      }
    }

    if (completedCardActionIds.length > 0) {
      removePendingCardActions(completedCardActionIds);
    }
  }

  // 3. Flush Pending Progress (user_card_progress)
  if (activeUser?.id) {
    const pendingProg = getPendingProgressActions().filter(
      (p) => p.userId === activeUser.id
    );
    if (pendingProg.length > 0) {
      const completedProgIds: string[] = [];
      const rowsToUpsert = pendingProg
        .filter((p) => (p.retryCount || 0) < MAX_RETRY_COUNT)
        .map((p) => ({
          user_id: p.userId,
          card_id: p.cardId,
          box: p.box,
          interval_days: p.interval_days,
          ease_factor: p.ease_factor,
          next_review_at: p.next_review_at,
          last_practiced_at: p.last_practiced_at,
        }));

      if (rowsToUpsert.length > 0) {
        try {
          const { error } = await supabase
            .from("user_card_progress")
            .upsert(rowsToUpsert, { onConflict: "user_id,card_id" });

          if (!error) {
            completedProgIds.push(...pendingProg.map((p) => p.id));
            progressSynced += rowsToUpsert.length;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      // Mark dropped max retries
      const expiredIds = pendingProg
        .filter((p) => (p.retryCount || 0) >= MAX_RETRY_COUNT)
        .map((p) => p.id);
      completedProgIds.push(...expiredIds);

      if (completedProgIds.length > 0) {
        removePendingProgressActions(completedProgIds);
      }
    }
  }

  // 4. Flush Pending Study Logs (study_logs)
  if (activeUser?.id) {
    const pendingLogs = getPendingStudyLogActions().filter(
      (l) => l.userId === activeUser.id
    );
    if (pendingLogs.length > 0) {
      const completedLogIds: string[] = [];
      const rowsToInsert = pendingLogs
        .filter((l) => (l.retryCount || 0) < MAX_RETRY_COUNT)
        .map((l) => ({
          id: l.log.id,
          user_id: l.userId,
          user_name: l.log.user_name || activeUser.full_name,
          user_email: l.log.user_email || activeUser.email,
          mode: l.log.mode,
          card_id: l.log.card_id || null,
          phrase_en: l.log.phrase_en,
          sentence_en: l.log.sentence_en,
          spoken_text: l.log.spoken_text || null,
          score: l.log.score,
          rating: l.log.rating || null,
          mispronounced_words: l.log.mispronounced_words || [],
          created_at: l.log.created_at,
        }));

      if (rowsToInsert.length > 0) {
        try {
          const { error } = await supabase
            .from("study_logs")
            .upsert(rowsToInsert, { onConflict: "id" });

          if (!error) {
            completedLogIds.push(...pendingLogs.map((l) => l.id));
            logsSynced += rowsToInsert.length;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      }

      const expiredLogIds = pendingLogs
        .filter((l) => (l.retryCount || 0) >= MAX_RETRY_COUNT)
        .map((l) => l.id);
      completedLogIds.push(...expiredLogIds);

      if (completedLogIds.length > 0) {
        removePendingStudyLogActions(completedLogIds);
      }
    }
  }

  return { cardsSynced, decksSynced, progressSynced, logsSynced, errors };
}

// ============================================================================
// 7. ONLINE SYNC LISTENER
// ============================================================================

let isOnlineListenerAttached = false;

export function initOnlineSyncListener(
  triggerSync: () => Promise<void>
): () => void {
  if (typeof window === "undefined" || isOnlineListenerAttached) {
    return () => {};
  }

  isOnlineListenerAttached = true;
  const onlineHandler = () => {
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
