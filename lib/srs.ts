import { Card } from "./seedData";

export type SRSRating = "again" | "hard" | "good" | "easy";

export interface SRSUpdateResult {
  box: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string;
}

/**
 * Simplified SM-2 + Leitner Box Spaced Repetition Algorithm
 * Ratings:
 * - "again" -> Quên (1p): Resets interval to 0 days (due in 1 minute), box = 1
 * - "hard"  -> Ngập ngừng (1 ngày): Minimum 1 day, slightly lower ease
 * - "good"  -> Nhớ được (3 ngày): Base 3 days or interval * ease_factor, box + 1
 * - "easy"  -> Phản xạ ngay (7 ngày): Base 7 days or interval * ease_factor * 1.3, box + 1
 */
export function calculateNextSRS(
  card: Pick<Card, "box" | "interval_days" | "ease_factor">,
  rating: SRSRating
): SRSUpdateResult {
  const now = new Date();
  let box = card.box || 1;
  let interval = card.interval_days || 0;
  let ease = card.ease_factor || 2.5;

  let nextReviewDate = new Date(now);

  switch (rating) {
    case "again":
      box = 1;
      interval = 0;
      ease = Math.max(1.3, Number((ease - 0.2).toFixed(2)));
      // Review again in 1 minute
      nextReviewDate = new Date(now.getTime() + 60 * 1000);
      break;

    case "hard":
      box = Math.max(1, box);
      interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
      ease = Math.max(1.3, Number((ease - 0.15).toFixed(2)));
      nextReviewDate.setDate(now.getDate() + interval);
      break;

    case "good":
      box = Math.min(5, box + 1);
      if (interval === 0) {
        interval = 3;
      } else {
        interval = Math.max(3, Math.round(interval * ease));
      }
      nextReviewDate.setDate(now.getDate() + interval);
      break;

    case "easy":
      box = Math.min(5, box + 1);
      if (interval === 0) {
        interval = 7;
      } else {
        interval = Math.max(7, Math.round(interval * ease * 1.3));
      }
      ease = Math.min(3.0, Number((ease + 0.15).toFixed(2)));
      nextReviewDate.setDate(now.getDate() + interval);
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
 * Preview label for each rating button on the Study Screen
 */
export function getRatingPreviewLabel(
  card: Pick<Card, "box" | "interval_days" | "ease_factor">,
  rating: SRSRating
): string {
  if (rating === "again") return "1p";
  const result = calculateNextSRS(card, rating);
  return `${result.interval_days} ngày`;
}

/**
 * Check if a card is due for review right now
 */
export function isCardDue(card: Card): boolean {
  if (!card.next_review_at) return true;
  return new Date(card.next_review_at).getTime() <= Date.now();
}

/**
 * Generate a first-letter hint for Active Recall
 * e.g., "I haven't made up my mind yet." -> "I h_____ m___ u_ m_ m___ y__."
 */
export function generateFirstLetterHint(sentence: string): string {
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
