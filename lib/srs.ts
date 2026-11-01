import type { Card } from "./seedData";

export type SRSRating = "again" | "hard" | "good" | "easy";

export interface SRSUpdateResult {
  box: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string;
}

export interface SRSCalculationOptions {
  learningStepMinutes?: number; // Minutes for short-term "again" review step (default 10)
  now?: Date;
}

export const SRS_CONSTANTS = {
  MIN_BOX: 1,
  MAX_BOX: 5,
  MIN_EASE: 1.3,
  MAX_EASE: 3.0,
  DEFAULT_EASE: 2.5,
  LEARNING_STEP_MINUTES: 10,
};

/**
 * Sanitize box number into bounds [1..5]
 */
export function sanitizeSRSBox(box: unknown): number {
  const num = typeof box === "number" && !isNaN(box) ? Math.floor(box) : 1;
  return Math.min(SRS_CONSTANTS.MAX_BOX, Math.max(SRS_CONSTANTS.MIN_BOX, num));
}

/**
 * Sanitize ease factor into bounds [1.3..3.0]
 */
export function sanitizeSRSEase(ease: unknown): number {
  const num = typeof ease === "number" && !isNaN(ease) ? ease : SRS_CONSTANTS.DEFAULT_EASE;
  return Math.min(SRS_CONSTANTS.MAX_EASE, Math.max(SRS_CONSTANTS.MIN_EASE, Number(num.toFixed(2))));
}

/**
 * Sanitize interval days into non-negative integers
 */
export function sanitizeSRSInterval(interval: unknown): number {
  const num = typeof interval === "number" && !isNaN(interval) ? Math.floor(interval) : 0;
  return Math.max(0, num);
}

/**
 * Pure calculation function for SRS state transition
 */
export function computeSRSState(
  card: {
    box?: number;
    interval_days?: number;
    ease_factor?: number;
    last_practiced_at?: string | null;
  },
  rating: SRSRating,
  options?: SRSCalculationOptions
): SRSUpdateResult {
  const now = options?.now ? new Date(options.now) : new Date();
  const learningStepMinutes = options?.learningStepMinutes ?? SRS_CONSTANTS.LEARNING_STEP_MINUTES;

  let box = sanitizeSRSBox(card.box);
  let interval = sanitizeSRSInterval(card.interval_days);
  let ease = sanitizeSRSEase(card.ease_factor);

  // Prevent exponential interval inflation if user reviews the same card repeatedly in the same day
  const isReviewedToday = Boolean(
    card.last_practiced_at &&
      new Date(card.last_practiced_at).toDateString() === now.toDateString()
  );

  let nextReviewDate = new Date(now);

  switch (rating) {
    case "again":
      // Forgotten: Reset to Box 1, interval to 0 days, decrease ease
      box = 1;
      interval = 0;
      ease = sanitizeSRSEase(ease - 0.2);
      // Scheduled for short-term review step (default 10 minutes)
      nextReviewDate = new Date(now.getTime() + learningStepMinutes * 60 * 1000);
      break;

    case "hard":
      // Hesitant: Keep current box (at least 1)
      box = Math.max(1, box);
      if (!isReviewedToday) {
        interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
        ease = sanitizeSRSEase(ease - 0.15);
      }
      nextReviewDate.setDate(now.getDate() + Math.max(1, interval));
      break;

    case "good":
      // Successfully remembered: Progress box + 1 (up to Box 5)
      if (!isReviewedToday) {
        box = Math.min(SRS_CONSTANTS.MAX_BOX, box + 1);
        if (interval === 0) {
          interval = 3;
        } else {
          interval = Math.max(3, Math.round(interval * ease));
        }
      }
      nextReviewDate.setDate(now.getDate() + Math.max(1, interval));
      break;

    case "easy":
      // Instant recall: Progress box + 1, increase ease
      if (!isReviewedToday) {
        box = Math.min(SRS_CONSTANTS.MAX_BOX, box + 1);
        if (interval === 0) {
          interval = 7;
        } else {
          interval = Math.max(7, Math.round(interval * ease * 1.3));
        }
        ease = sanitizeSRSEase(ease + 0.15);
      }
      nextReviewDate.setDate(now.getDate() + Math.max(1, interval));
      break;
  }

  return {
    box,
    interval_days: interval,
    ease_factor: ease,
    next_review_at: nextReviewDate.toISOString(),
    last_practiced_at: now.toISOString(),
  };
}

/**
 * Primary SRS calculator for SpeakFlow (SM-2 combined with Leitner 5-box)
 */
export function calculateNextSRS(
  card: Pick<Card, "box" | "interval_days" | "ease_factor"> & {
    last_practiced_at?: string | null;
  },
  rating: SRSRating,
  now?: Date
): SRSUpdateResult {
  return computeSRSState(card, rating, { now });
}

/**
 * Preview label for each rating button on the Study Screen
 */
export function getRatingPreviewLabel(
  card: Pick<Card, "box" | "interval_days" | "ease_factor"> & {
    last_practiced_at?: string | null;
  },
  rating: SRSRating
): string {
  if (rating === "again") return "10p";
  const result = calculateNextSRS(card, rating);
  return `${result.interval_days} ngày`;
}

/**
 * Check if a card is due for review right now
 */
export function isCardDue(card: Card, now = Date.now()): boolean {
  if (!card) return false;
  if (!card.next_review_at) return true;
  const time = new Date(card.next_review_at).getTime();
  if (isNaN(time)) return true;
  return time <= now;
}

/**
 * Generate a first-letter hint for Active Recall
 * e.g., "I haven't made up my mind yet." -> "I h_____ m___ u_ m_ m___ y__."
 */
export function generateFirstLetterHint(sentence: string): string {
  if (!sentence || typeof sentence !== "string") return "";
  return sentence
    .split(" ")
    .map((word) => {
      if (word.length <= 1) return word;
      const firstChar = word[0];
      const rest = word.slice(1).replace(/[a-zA-Z]/g, "_");
      return firstChar + rest;
    })
    .join(" ");
}
