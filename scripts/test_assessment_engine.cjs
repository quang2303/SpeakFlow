const test = require("node:test");
const assert = require("node:assert");

// Import assessment engine modules
const {
  getAllQuestions,
  getQuestionsForTestMode,
  sanitizeQuestionForClient,
  getQuestionById,
} = require("../lib/assessment/questionBank.ts");

const {
  scoreObjectiveQuestion,
  scoreSpeakingQuestion,
  computeSkillSummaries,
  computeOverallScore,
} = require("../lib/assessment/scoring.ts");

const {
  estimateCefrProfile,
} = require("../lib/assessment/cefrEstimator.ts");

const {
  evaluateAssessmentSubmission,
} = require("../lib/assessment/adaptiveEngine.ts");

test("Placement Test - Question Bank Integrity & Sanitization", () => {
  const all = getAllQuestions();
  assert.ok(all.length >= 20, "Question bank should contain at least 20 authentic questions");

  // Verify CEFR coverage
  const levels = new Set(all.map((q) => q.level));
  assert.ok(levels.has("A1"), "Must cover A1");
  assert.ok(levels.has("A2"), "Must cover A2");
  assert.ok(levels.has("B1"), "Must cover B1");
  assert.ok(levels.has("B2"), "Must cover B2");
  assert.ok(levels.has("C1"), "Must cover C1");

  // Verify Skill coverage
  const skills = new Set(all.map((q) => q.skill));
  assert.ok(skills.has("grammar"), "Must cover grammar");
  assert.ok(skills.has("vocabulary"), "Must cover vocabulary");
  assert.ok(skills.has("reading"), "Must cover reading");
  assert.ok(skills.has("listening"), "Must cover listening");
  assert.ok(skills.has("speaking"), "Must cover speaking");

  // Verify client sanitization: answers and explanations MUST be removed
  const sample = all[0];
  const sanitized = sanitizeQuestionForClient(sample);
  assert.strictEqual(sanitized.id, sample.id);
  assert.strictEqual(sanitized.correctAnswer, undefined, "correctAnswer must be hidden from client");
  assert.strictEqual(sanitized.explanationVi, undefined, "explanationVi must be hidden from client");

  // Verify Mode questions
  const quickQuestions = getQuestionsForTestMode("quick");
  assert.ok(quickQuestions.length >= 10 && quickQuestions.length <= 16, "Quick mode should have 10-16 questions");

  const gvQuestions = getQuestionsForTestMode("grammar_vocab");
  assert.ok(gvQuestions.every((q) => q.skill === "grammar" || q.skill === "vocabulary"));

  const speakQuestions = getQuestionsForTestMode("speaking_only");
  assert.ok(speakQuestions.every((q) => q.skill === "speaking"));
});

test("Placement Test - Objective & Speaking Scoring Verification", () => {
  const gQuestion = getQuestionById("g_a1_01"); // answer: "C"
  assert.ok(gQuestion, "Question g_a1_01 must exist");

  // Correct objective answer
  const correctEval = scoreObjectiveQuestion(gQuestion, "C");
  assert.strictEqual(correctEval.isCorrect, true);
  assert.strictEqual(correctEval.score, 100);

  // Lowercase & whitespace tolerance
  const caseEval = scoreObjectiveQuestion(gQuestion, " c ");
  assert.strictEqual(caseEval.isCorrect, true);
  assert.strictEqual(caseEval.score, 100);

  // Wrong objective answer
  const wrongEval = scoreObjectiveQuestion(gQuestion, "A");
  assert.strictEqual(wrongEval.isCorrect, false);
  assert.strictEqual(wrongEval.score, 0);

  // Speaking Read Aloud scoring
  const sReadQ = getQuestionById("s_a1_01");
  assert.ok(sReadQ, "Question s_a1_01 must exist");

  const highSpeech = scoreSpeakingQuestion(sReadQ, "Hello my name is Alex and I live in Hanoi", 92);
  assert.strictEqual(highSpeech.isCorrect, true);
  assert.strictEqual(highSpeech.score, 92);

  const lowSpeech = scoreSpeakingQuestion(sReadQ, "Hello Hanoi", 40);
  assert.strictEqual(lowSpeech.isCorrect, false);
  assert.strictEqual(lowSpeech.score, 40);

  // Skipped / empty speaking
  const emptySpeech = scoreSpeakingQuestion(sReadQ, "");
  assert.strictEqual(emptySpeech.isCorrect, false);
  assert.strictEqual(emptySpeech.score, 0);
});

test("Placement Test - Dynamic Weight Reallocation for Skipped Skills", () => {
  const dummyQuestions = [
    getQuestionById("g_a1_01"),
    getQuestionById("v_a1_01"),
    getQuestionById("r_a2_01"),
    getQuestionById("l_a1_01"),
    getQuestionById("s_a1_01"),
  ].filter(Boolean);

  // User answers Grammar, Vocab, Reading, Listening, but skips Speaking (no mic)
  const responses = {
    g_a1_01: { questionId: "g_a1_01", skill: "grammar", userAnswer: "C", isCorrect: true, score: 100 },
    v_a1_01: { questionId: "v_a1_01", skill: "vocabulary", userAnswer: "A", isCorrect: true, score: 100 },
    r_a2_01: { questionId: "r_a2_01", skill: "reading", userAnswer: "C", isCorrect: true, score: 100 },
    l_a1_01: { questionId: "l_a1_01", skill: "listening", userAnswer: "C", isCorrect: true, score: 100 },
    // Speaking omitted
  };

  const skillSummaries = computeSkillSummaries(dummyQuestions, responses);

  assert.strictEqual(skillSummaries.grammar.isAssessed, true);
  assert.strictEqual(skillSummaries.grammar.score, 100);
  assert.strictEqual(skillSummaries.speaking.isAssessed, false);
  assert.strictEqual(skillSummaries.speaking.score, 0);

  // Overall score should reallocate speaking's 20% weight to the 4 assessed skills
  // so overall score should remain 100, NOT dragged down to 80!
  const overall = computeOverallScore(skillSummaries, "full");
  assert.strictEqual(overall, 100, "Skipped skill weight must be reallocated proportionally");
});

test("Placement Test - CEFR Estimation & Confidence Logic", () => {
  const dummySkills = {
    grammar: { skill: "grammar", skillLabelVi: "", score: 85, questionsCount: 4, correctCount: 4, isAssessed: true, levelEstimate: "B2" },
    vocabulary: { skill: "vocabulary", skillLabelVi: "", score: 90, questionsCount: 4, correctCount: 4, isAssessed: true, levelEstimate: "C1" },
    reading: { skill: "reading", skillLabelVi: "", score: 80, questionsCount: 4, correctCount: 3, isAssessed: true, levelEstimate: "B2" },
    listening: { skill: "listening", skillLabelVi: "", score: 75, questionsCount: 4, correctCount: 3, isAssessed: true, levelEstimate: "B2" },
    speaking: { skill: "speaking", skillLabelVi: "", score: 70, questionsCount: 4, correctCount: 3, isAssessed: true, levelEstimate: "B1" },
  };

  const dummyResponses = new Array(20).fill(null).map((_, i) => ({
    questionId: `q_${i}`,
    skill: "grammar",
    userAnswer: "A",
    isCorrect: true,
    score: 80,
  }));

  // Overall score 80 -> estimated CEFR C1, confidence high
  const profileHigh = estimateCefrProfile(80, dummySkills, dummyResponses);
  assert.strictEqual(profileHigh.estimatedLevel, "C1");
  assert.strictEqual(profileHigh.confidence, "high");
  assert.ok(profileHigh.strengths.length > 0, "Must generate Vietnamese strengths");
  assert.ok(profileHigh.recommendations.length > 0, "Must generate actionable recommendations");

  // Moderate score 55 -> B1
  const profileMid = estimateCefrProfile(55, dummySkills, dummyResponses.slice(0, 12));
  assert.strictEqual(profileMid.estimatedLevel, "B1");
  assert.strictEqual(profileMid.confidence, "medium");

  // Beginner score 25 -> A1
  const profileLow = estimateCefrProfile(25, dummySkills, dummyResponses.slice(0, 5));
  assert.strictEqual(profileLow.estimatedLevel, "A1");
  assert.strictEqual(profileLow.confidence, "low");
});

test("Placement Test - Full Adaptive Submission & Evaluation Pipeline", () => {
  const userResponses = {
    g_a1_01: { answer: "C" },
    g_a2_01: { answer: "B" },
    v_a1_01: { answer: "A" },
    v_a2_01: { answer: "A" },
    r_a2_01: { answer: "C" },
    l_a1_01: { answer: "C" },
    s_a1_01: { answer: "Hello my name is Alex and I live in Hanoi", speechMatchScore: 95 },
  };

  const result = evaluateAssessmentSubmission(
    "quick",
    userResponses,
    "user-test-uuid",
    360,
    {
      getAllQuestions,
      scoreObjectiveQuestion,
      scoreSpeakingQuestion,
      computeSkillSummaries,
      computeOverallScore,
      estimateCefrProfile,
    }
  );

  assert.ok(result.id.startsWith("eval_"));
  assert.ok(result.attemptId.startsWith("att_"));
  assert.strictEqual(result.userId, "user-test-uuid");
  assert.strictEqual(result.durationSeconds, 360);
  assert.strictEqual(result.isComplete, true);
  assert.strictEqual(result.correctAnswersCount, 7);
  assert.strictEqual(result.overallScore, 99);
  assert.strictEqual(result.estimatedCefrLevel, "C2");
  assert.ok(result.responses.length === 7);
});
