const test = require("node:test");
const assert = require("node:assert");

// Import modules to test
const {
  buildTutorSystemPrompt,
  buildSessionSummaryPrompt,
  getCEFRGuidance,
  getCorrectionGuidance,
} = require("../lib/ai/prompts.ts");

const {
  ROLEPLAY_SCENARIOS,
  getScenarioById,
  getDefaultScenario,
} = require("../lib/ai/scenarios.ts");

const { MockAIProvider } = require("../lib/ai/providers/mockProvider.ts");
const {
  checkRateLimit,
  sanitizeHistory,
} = require("../lib/ai/safety.ts");

test("AI Tutor - Scenarios Catalog integrity", () => {
  // Must have at least 12 standard scenarios
  assert.ok(ROLEPLAY_SCENARIOS.length >= 12, "Should have 12 scenarios");

  const requiredIds = [
    "daily-conversation",
    "restaurant",
    "hotel",
    "airport-travel",
    "shopping",
    "hospital",
    "job-interview",
    "office-communication",
    "business-english",
    "meeting-presentation",
    "making-friends",
    "phone-conversation",
  ];

  for (const id of requiredIds) {
    const s = getScenarioById(id);
    assert.ok(s, `Scenario ${id} must exist`);
    assert.ok(s.title && s.titleVi, `${id} must have English and Vietnamese titles`);
    assert.ok(s.starterAiPrompt && s.starterAiPromptVi, `${id} must have starter prompts`);
    assert.ok(s.defaultUserRole && s.defaultAiRole, `${id} must have role pairs`);
    assert.ok(["A1", "A2", "B1", "B2", "C1", "C2"].includes(s.recommendedLevel));
  }

  const defaultScen = getDefaultScenario();
  assert.strictEqual(defaultScen.id, "daily-conversation");
});

test("AI Tutor - CEFR Level and Correction Mode Prompt Generation", () => {
  // 1. A1 prompt
  const a1Guidance = getCEFRGuidance("A1");
  assert.ok(a1Guidance.includes("A1 (Beginner)"));
  assert.ok(a1Guidance.includes("short"));

  // 2. C1 prompt
  const c1Guidance = getCEFRGuidance("C1");
  assert.ok(c1Guidance.includes("C1 (Advanced)"));
  assert.ok(c1Guidance.includes("sophisticated"));

  // 3. Correction modes
  const gentle = getCorrectionGuidance("gentle");
  assert.ok(gentle.includes("GENTLE CORRECTION"));
  assert.ok(gentle.includes("Never interrupt"));

  const intensive = getCorrectionGuidance("intensive");
  assert.ok(intensive.includes("INTENSIVE CORRECTION"));
  assert.ok(intensive.includes("betterAlternative"));

  // 4. Full system prompt
  const prompt = buildTutorSystemPrompt({
    scenarioTitle: "At the Restaurant",
    scenarioContext: "Diner ordering dinner",
    userRole: "Diner",
    aiRole: "Waiter",
    level: "A2",
    correctionMode: "standard",
  });

  assert.ok(prompt.includes("At the Restaurant"));
  assert.ok(prompt.includes("Diner"));
  assert.ok(prompt.includes("Waiter"));
  assert.ok(prompt.includes("A2 (Elementary)"));
  assert.ok(prompt.includes("replyEn"));
  assert.ok(prompt.includes("tutorCorrection"));
});

test("AI Tutor - History Sanitization & Rate Limiter", () => {
  // Test history truncation (max 8 messages)
  const longHistory = Array.from({ length: 15 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Message ${i}`,
  }));

  const sanitized = sanitizeHistory(longHistory);
  assert.strictEqual(sanitized.length, 8);
  assert.strictEqual(sanitized[7].content, "Message 14");

  // Rate limiter check
  const testIp = "test-rate-ip-999";
  for (let i = 0; i < 25; i++) {
    const res = checkRateLimit(testIp);
    assert.strictEqual(res.allowed, true);
  }

  // 26th request within same window should be blocked
  const blockedRes = checkRateLimit(testIp);
  assert.strictEqual(blockedRes.allowed, false);
  assert.ok(blockedRes.retryAfterSeconds > 0);
});

test("AI Tutor - Mock Provider error detection & schema compliance", async () => {
  const provider = new MockAIProvider();

  // Test 1: "very like" error detection
  const reply1 = await provider.generateReply({
    userMessage: "I very like this dish so much.",
    level: "A2",
    correctionMode: "standard",
  });

  assert.strictEqual(reply1.source, "mock");
  assert.strictEqual(reply1.isMock, true);
  assert.ok(reply1.replyEn && reply1.replyVi);
  assert.ok(reply1.tutorCorrection);
  assert.strictEqual(reply1.tutorCorrection.hasError, true);
  assert.strictEqual(reply1.tutorCorrection.errorType, "vocabulary");
  assert.strictEqual(
    reply1.tutorCorrection.correctedSentence,
    "I really like this dish so much."
  );

  // Test 2: "I am agree" error detection
  const reply2 = await provider.generateReply({
    userMessage: "I am agree with your opinion.",
    level: "B1",
    correctionMode: "standard",
  });

  assert.ok(reply2.tutorCorrection);
  assert.strictEqual(reply2.tutorCorrection.hasError, true);
  assert.strictEqual(reply2.tutorCorrection.errorType, "grammar");
  assert.strictEqual(
    reply2.tutorCorrection.correctedSentence,
    "I agree with your opinion."
  );

  // Test 3: clean sentence
  const reply3 = await provider.generateReply({
    userMessage: "Could you please bring me the bill?",
    level: "B1",
    correctionMode: "gentle",
  });

  assert.strictEqual(reply3.tutorCorrection, null);
});

test("AI Tutor - Session Summary generation", async () => {
  const provider = new MockAIProvider();

  const summary = await provider.generateSummary({
    scenarioTitle: "Job Interview",
    cefrLevel: "B2",
    durationSeconds: 180,
    history: [
      {
        role: "user",
        content: "I very like coding.",
        correction: {
          hasError: true,
          errorType: "vocabulary",
          originalSentence: "I very like coding.",
          correctedSentence: "I really like coding.",
          explanationVi: 'Dùng "really like" thay vì "very like".',
          severity: "medium",
        },
      },
      { role: "assistant", content: "That is great to hear." },
      { role: "user", content: "I have 3 years of experience in React." },
    ],
  });

  assert.strictEqual(summary.topic, "Job Interview");
  assert.strictEqual(summary.cefrLevel, "B2");
  assert.strictEqual(summary.turnsCount, 2);
  assert.strictEqual(summary.durationSeconds, 180);
  assert.ok(summary.accomplishmentScore >= 65);
  assert.ok(summary.strengths.length > 0);
  assert.ok(summary.grammarFeedback.length >= 1);
  assert.strictEqual(summary.grammarFeedback[0].original, "I very like coding.");
  assert.strictEqual(summary.grammarFeedback[0].corrected, "I really like coding.");
  assert.ok(summary.keyTakeawayCards.length > 0);
  assert.strictEqual(summary.keyTakeawayCards[0].level, "B2");
});
