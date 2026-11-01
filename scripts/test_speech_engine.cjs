const test = require("node:test");
const assert = require("node:assert");

const {
  evaluatePronunciation,
  stripWordPunctuation,
  expandTokenContraction,
  normalizeSpeechText,
} = require("../lib/speech.ts");

test("Speech Engine - Normalization and Contraction expansion", (t) => {
  assert.strictEqual(stripWordPunctuation("Hello,"), "hello");
  assert.strictEqual(stripWordPunctuation("don't"), "dont");
  assert.strictEqual(stripWordPunctuation("“World!”"), "world");

  assert.strictEqual(expandTokenContraction("I'm"), "i am");
  assert.strictEqual(expandTokenContraction("can't"), "cannot");
  assert.strictEqual(expandTokenContraction("gonna"), "going to");
  assert.strictEqual(expandTokenContraction("haven't"), "have not");
});

test("Speech Engine - Exact 100% match", (t) => {
  const target = "I am right on track with my project.";
  const spoken = "I am right on track with my project.";

  const result = evaluatePronunciation(target, spoken);
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.sentenceMatchScore, 100);
  assert.strictEqual(result.level, "excellent");
  assert.strictEqual(result.missingWords.length, 0);
  assert.strictEqual(result.assessmentType, "speech_recognition_text_match");
});

test("Speech Engine - Bidirectional contraction equivalence", (t) => {
  // Target uses expanded form, spoken uses contracted form
  const target = "I do not know what you are talking about.";
  const spoken = "I don't know what you're talking about.";

  const result = evaluatePronunciation(target, spoken);
  // Both "do not" <-> "don't" and "you are" <-> "you're" should match
  assert.strictEqual(result.score, 100);
  assert.strictEqual(result.level, "excellent");
  assert.strictEqual(result.missingWords.length, 0);
});

test("Speech Engine - Missing words detection", (t) => {
  const target = "Could I get an iced latte please?";
  const spoken = "Could I get latte please";

  const result = evaluatePronunciation(target, spoken);
  assert.ok(result.score < 100);
  assert.ok(result.missingWords.includes("an") || result.missingWords.includes("iced"));
});

test("Speech Engine - Extra spoken words detection", (t) => {
  const target = "Good morning.";
  const spoken = "Hello good morning everyone.";

  const result = evaluatePronunciation(target, spoken);
  assert.ok(result.extraWords.length > 0);
  assert.ok(result.extraWords.includes("hello") || result.extraWords.includes("everyone"));
});

test("Speech Engine - Empty or noise input handling", (t) => {
  const target = "How are you doing today?";
  const emptyRes = evaluatePronunciation(target, "");
  assert.strictEqual(emptyRes.score, 0);
  assert.strictEqual(emptyRes.level, "retry");
  assert.strictEqual(emptyRes.missingWords.length, 5);

  const emptyTarget = evaluatePronunciation("", "Hello");
  assert.strictEqual(emptyTarget.score, 100);
});
