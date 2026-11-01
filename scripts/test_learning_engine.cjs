const test = require("node:test");
const assert = require("node:assert");

// Import pure calculations
// We test against the logic of computeSRSState, isCardDue, resolveCardProgressConflict
const {
  computeSRSState,
  isCardDue,
  sanitizeSRSBox,
  sanitizeSRSEase,
  sanitizeSRSInterval,
  SRS_CONSTANTS,
} = require("../lib/srs.ts");

const { resolveCardProgressConflict } = require("../lib/services/syncService.ts");
const {
  evaluateStreakStatus,
  computeNextStreakAfterStudy,
} = require("../lib/services/streakService.ts");

test("Streak Engine - Continuity and breakage logic", (t) => {
  const today = "2026-11-01";
  const yesterday = "2026-10-31";
  const twoDaysAgo = "2026-10-30";

  // 1. Studied today: active_today
  const activeToday = evaluateStreakStatus(
    { currentStreak: 5, lastStudyDate: today, todayReviewedCount: 3 },
    today,
    yesterday
  );
  assert.strictEqual(activeToday.streakStatus, "active_today");
  assert.strictEqual(activeToday.currentStreak, 5);
  assert.strictEqual(activeToday.isStreakActiveToday, true);

  // 2. Studied yesterday, but not yet today: at_risk
  const atRisk = evaluateStreakStatus(
    { currentStreak: 5, lastStudyDate: yesterday, todayReviewedCount: 4 },
    today,
    yesterday
  );
  assert.strictEqual(atRisk.streakStatus, "at_risk");
  assert.strictEqual(atRisk.currentStreak, 5);
  assert.strictEqual(atRisk.todayReviewedCount, 0);
  assert.strictEqual(atRisk.isStreakActiveToday, false);

  // 3. Missed 2 days ago: broken (streak lost to 0)
  const broken = evaluateStreakStatus(
    { currentStreak: 10, lastStudyDate: twoDaysAgo, todayReviewedCount: 1 },
    today,
    yesterday
  );
  assert.strictEqual(broken.streakStatus, "broken");
  assert.strictEqual(broken.currentStreak, 0);
  assert.strictEqual(broken.isStreakActiveToday, false);

  // 4. Studied first card today when at_risk: streak increments from 5 to 6
  const updatedConsecutive = computeNextStreakAfterStudy(atRisk, today, yesterday, 1);
  assert.strictEqual(updatedConsecutive.currentStreak, 6);
  assert.strictEqual(updatedConsecutive.todayReviewedCount, 1);
  assert.strictEqual(updatedConsecutive.lastStudyDate, today);

  // 5. Studied another card today when active: streak remains 6, count increments to 2
  const updatedSameDay = computeNextStreakAfterStudy(updatedConsecutive, today, yesterday, 1);
  assert.strictEqual(updatedSameDay.currentStreak, 6);
  assert.strictEqual(updatedSameDay.todayReviewedCount, 2);

  // 6. Studied after broken streak: restarts fresh streak of 1
  const restarted = computeNextStreakAfterStudy(broken, today, yesterday, 1);
  assert.strictEqual(restarted.currentStreak, 1);
  assert.strictEqual(restarted.todayReviewedCount, 1);
});

test("SRS Engine - New card first review transitions", (t) => {
  const baseCard = { box: 1, interval_days: 0, ease_factor: 2.5, last_practiced_at: null };
  const mockNow = new Date("2026-11-01T10:00:00Z");

  // 1. Again: reset to box 1, interval 0, due in 10 mins, ease -0.2
  const againRes = computeSRSState(baseCard, "again", { now: mockNow });
  assert.strictEqual(againRes.box, 1);
  assert.strictEqual(againRes.interval_days, 0);
  assert.strictEqual(againRes.ease_factor, 2.3);
  assert.strictEqual(new Date(againRes.next_review_at).getTime(), mockNow.getTime() + 10 * 60 * 1000);

  // 2. Hard: box 1, interval 1, ease -0.15
  const hardRes = computeSRSState(baseCard, "hard", { now: mockNow });
  assert.strictEqual(hardRes.box, 1);
  assert.strictEqual(hardRes.interval_days, 1);
  assert.strictEqual(hardRes.ease_factor, 2.35);

  // 3. Good: box 2, interval 3, ease unchanged
  const goodRes = computeSRSState(baseCard, "good", { now: mockNow });
  assert.strictEqual(goodRes.box, 2);
  assert.strictEqual(goodRes.interval_days, 3);
  assert.strictEqual(goodRes.ease_factor, 2.5);

  // 4. Easy: box 2, interval 7, ease +0.15
  const easyRes = computeSRSState(baseCard, "easy", { now: mockNow });
  assert.strictEqual(easyRes.box, 2);
  assert.strictEqual(easyRes.interval_days, 7);
  assert.strictEqual(easyRes.ease_factor, 2.65);
});

test("SRS Engine - Max box limit (Box 5)", (t) => {
  const box5Card = { box: 5, interval_days: 21, ease_factor: 2.5, last_practiced_at: "2026-10-10T10:00:00Z" };
  const mockNow = new Date("2026-11-01T10:00:00Z");

  // Good on Box 5 should remain in Box 5 (never exceed 5)
  const goodRes = computeSRSState(box5Card, "good", { now: mockNow });
  assert.strictEqual(goodRes.box, 5);

  // Easy on Box 5 should remain in Box 5
  const easyRes = computeSRSState(box5Card, "easy", { now: mockNow });
  assert.strictEqual(easyRes.box, 5);

  // Again on Box 5 should drop card straight back to Box 1 and interval 0
  const againRes = computeSRSState(box5Card, "again", { now: mockNow });
  assert.strictEqual(againRes.box, 1);
  assert.strictEqual(againRes.interval_days, 0);
});

test("SRS Engine - Same-day multiple review inflation guard", (t) => {
  const cardMorning = {
    box: 2,
    interval_days: 3,
    ease_factor: 2.5,
    last_practiced_at: "2026-11-01T08:00:00.000Z",
  };
  // Review again at 2 PM on the SAME day
  const mockAfternoon = new Date("2026-11-01T14:00:00.000Z");

  const repeatGood = computeSRSState(cardMorning, "good", { now: mockAfternoon });
  // Box and interval must NOT compound or multiply again on same calendar day
  assert.strictEqual(repeatGood.box, 2);
  assert.strictEqual(repeatGood.interval_days, 3);
  assert.strictEqual(repeatGood.ease_factor, 2.5);
});

test("SRS Engine - Boundary sanitization for missing or invalid values", (t) => {
  assert.strictEqual(sanitizeSRSBox(-1), 1);
  assert.strictEqual(sanitizeSRSBox(10), 5);
  assert.strictEqual(sanitizeSRSBox("invalid"), 1);

  assert.strictEqual(sanitizeSRSEase(0.5), 1.3);
  assert.strictEqual(sanitizeSRSEase(4.5), 3.0);
  assert.strictEqual(sanitizeSRSEase(null), 2.5);

  assert.strictEqual(sanitizeSRSInterval(-5), 0);
  assert.strictEqual(sanitizeSRSInterval("invalid"), 0);
  assert.strictEqual(sanitizeSRSInterval(12.7), 12);
});

test("SRS Engine - isCardDue checks", (t) => {
  const now = new Date("2026-11-01T12:00:00Z").getTime();

  // Past due date
  assert.strictEqual(isCardDue({ next_review_at: "2026-11-01T10:00:00Z" }, now), true);
  // Future date
  assert.strictEqual(isCardDue({ next_review_at: "2026-11-01T14:00:00Z" }, now), false);
  // Missing next_review_at -> due immediately
  assert.strictEqual(isCardDue({}, now), true);
  assert.strictEqual(isCardDue(null, now), false);
});

test("Sync Engine - Conflict Resolution with Safety-First Principle", (t) => {
  // Scenario 1: Device A reviewed "Good" at 10:00 (Box 3), Device B reviewed "Again" at 10:30 (Box 1)
  const localProg = {
    box: 3,
    interval_days: 7,
    ease_factor: 2.5,
    next_review_at: "2026-11-08T10:00:00Z",
    last_practiced_at: "2026-11-01T10:00:00Z",
  };
  const remoteProg = {
    box: 1,
    interval_days: 0,
    ease_factor: 2.3,
    next_review_at: "2026-11-01T10:40:00Z",
    last_practiced_at: "2026-11-01T10:30:00Z",
  };

  const conflict = resolveCardProgressConflict(localProg, remoteProg);
  // Safety First: because remote has box 1 within 2 hours, forgotten state must win!
  assert.strictEqual(conflict.winner, "remote");
  assert.strictEqual(conflict.merged.box, 1);

  // Scenario 2: Standard recency when reviews are separated by days
  const oldLocal = {
    box: 2,
    interval_days: 3,
    ease_factor: 2.5,
    next_review_at: "2026-10-25T10:00:00Z",
    last_practiced_at: "2026-10-22T10:00:00Z",
  };
  const newRemote = {
    box: 3,
    interval_days: 6,
    ease_factor: 2.5,
    next_review_at: "2026-11-05T10:00:00Z",
    last_practiced_at: "2026-10-30T10:00:00Z",
  };
  const recencyRes = resolveCardProgressConflict(oldLocal, newRemote);
  assert.strictEqual(recencyRes.winner, "remote");
  assert.strictEqual(recencyRes.merged.box, 3);
});
