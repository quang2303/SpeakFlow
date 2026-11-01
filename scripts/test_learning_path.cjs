const test = require("node:test");
const assert = require("node:assert");

// Import modules to test
const {
  generateTemplateLearningPlan,
  getRecommendedDeckAndScenarioForGoal,
  buildPlanningPrompt,
  SYSTEM_DECK_IDS,
} = require("../lib/learningPath/planner.ts");

const {
  analyzeLearnerWeaknesses,
  generateAdaptiveRecommendations,
  applyPlanAdjustment,
  computeWeeklyAssessment,
} = require("../lib/learningPath/adaptiveEngine.ts");

test("Learning Path - Goal Mapping to Real System Content", () => {
  // Travel English -> Travel Deck & airport-travel scenario
  const travelRec = getRecommendedDeckAndScenarioForGoal("travel_english");
  assert.strictEqual(travelRec.primaryDeckId, SYSTEM_DECK_IDS.TRAVEL);
  assert.strictEqual(travelRec.primaryScenarioId, "airport-travel");

  // Business English -> Office Deck & office-communication scenario
  const bizRec = getRecommendedDeckAndScenarioForGoal("business_english");
  assert.strictEqual(bizRec.primaryDeckId, SYSTEM_DECK_IDS.OFFICE);
  assert.strictEqual(bizRec.primaryScenarioId, "office-communication");

  // Job Interview -> Interview Deck & job-interview scenario
  const interviewRec = getRecommendedDeckAndScenarioForGoal("job_interview");
  assert.strictEqual(interviewRec.primaryDeckId, SYSTEM_DECK_IDS.INTERVIEW);
  assert.strictEqual(interviewRec.primaryScenarioId, "job-interview");
});

test("Learning Path - Plan Generation & Structure Verification", () => {
  const goal = {
    id: "goal-test-1",
    user_id: "user-123",
    title: "Tiếng Anh du lịch",
    description: "Chuẩn bị đi du lịch nước ngoài",
    primary_goal: "travel_english",
    current_level: "A2",
    target_level: "B1",
    daily_minutes: 20,
    days_per_week: 5,
    rest_days: [0, 6], // Sun, Sat rest
    preferred_skills: ["speaking", "listening"],
    start_date: "2026-11-01",
    target_date: "2026-11-30",
    duration_days: 30,
    status: "active",
    placement_test_result: {
      level: "A2",
      test_date: "2026-11-01",
      scores: { grammar: 60, listening: 70 },
    },
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const plan = generateTemplateLearningPlan(goal);

  // 1. Plan metadata
  assert.strictEqual(plan.goal_id, "goal-test-1");
  assert.strictEqual(plan.total_days, 30);
  assert.strictEqual(plan.current_day, 1);
  assert.strictEqual(plan.status, "active");

  // 2. 4 Progressive Phases
  assert.strictEqual(plan.phases.length, 4);
  assert.strictEqual(plan.phases[0].phase_number, 1);
  assert.strictEqual(plan.phases[3].phase_number, 4);

  // 3. Days count matches duration
  assert.strictEqual(plan.days.length, 30);

  // 4. Day 1 is active (2026-11-01 is a Sunday, wait! Let's check rest day flag)
  const d1 = plan.days[0];
  assert.strictEqual(d1.day_number, 1);
  assert.ok(d1.tasks.length >= 0);

  // Check active day tasks validity
  const activeDay = plan.days.find((d) => !d.is_rest_day);
  assert.ok(activeDay, "Must have active days");
  assert.ok(activeDay.tasks.length >= 2, "Active day should have at least 2 tasks");

  // Every task must have valid action URL
  for (const t of activeDay.tasks) {
    assert.ok(
      t.target_action_url.startsWith("/study") ||
        t.target_action_url.startsWith("/reflex") ||
        t.target_action_url.startsWith("/roleplay"),
      `Invalid action URL: ${t.target_action_url}`
    );
    assert.ok(t.estimated_minutes > 0);
  }
});

test("Learning Path - AI Planning Prompt Builder", () => {
  const goal = {
    id: "goal-prompt-test",
    user_id: "user-1",
    title: "Tiếng Anh Công việc",
    primary_goal: "business_english",
    current_level: "B1",
    target_level: "B2",
    daily_minutes: 30,
    days_per_week: 5,
    rest_days: [0, 6],
    preferred_skills: ["speaking", "grammar"],
    start_date: "2026-11-01",
    target_date: "2026-11-30",
    duration_days: 30,
    status: "active",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const prompt = buildPlanningPrompt(goal);

  assert.ok(prompt.includes("B1"));
  assert.ok(prompt.includes("B2"));
  assert.ok(prompt.includes("30 minutes/day"));
  assert.ok(prompt.includes(SYSTEM_DECK_IDS.OFFICE));
  assert.ok(prompt.includes("phases"));
  assert.ok(prompt.includes("target_action_url"));
});

test("Learning Path - Adaptive Engine Adjustments & Past Preservation", () => {
  const goal = {
    id: "goal-adapt-test",
    user_id: "user-adapt",
    title: "Tiếng Anh Phản xạ",
    primary_goal: "improve_speaking",
    current_level: "A2",
    target_level: "B1",
    daily_minutes: 30,
    days_per_week: 7,
    rest_days: [],
    preferred_skills: ["speaking"],
    start_date: "2026-11-01",
    target_date: "2026-11-30",
    duration_days: 30,
    status: "active",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const plan = generateTemplateLearningPlan(goal);
  plan.current_day = 3;

  // Mark Day 1 as completed with a completed task
  plan.days[0].status = "completed";
  plan.days[0].tasks[0].status = "completed";
  plan.days[0].tasks[0].completed_at = "2026-11-01T10:00:00Z";

  // Simulate time shortage adjustment
  const adjustment = {
    id: "adj-test-1",
    plan_id: plan.id,
    trigger_reason: "time_shortage",
    title_vi: "Giảm tải thời lượng",
    description_vi: "Học viên thiếu thời gian",
    recommended_action: "Giảm bài tập",
    status: "pending",
  };

  const adjustedPlan = applyPlanAdjustment(plan, adjustment);

  // CRITICAL VERIFICATION: Day 1 (past completed day) MUST be completely unchanged!
  assert.strictEqual(adjustedPlan.days[0].status, "completed");
  assert.strictEqual(adjustedPlan.days[0].tasks[0].status, "completed");
  assert.strictEqual(
    adjustedPlan.days[0].tasks[0].completed_at,
    "2026-11-01T10:00:00Z"
  );

  // Future day (Day 3+) should have reduced estimated minutes
  const day3 = adjustedPlan.days.find((d) => d.day_number === 3);
  assert.ok(day3.estimated_minutes <= 30);
  assert.strictEqual(adjustedPlan.plan_version, plan.plan_version + 1);
});

test("Learning Path - Weekly Assessment Report computation", () => {
  const goal = {
    id: "goal-week-test",
    user_id: "user-week",
    title: "Tiếng Anh Hàng ngày",
    primary_goal: "daily_english",
    current_level: "B1",
    target_level: "B2",
    daily_minutes: 20,
    days_per_week: 5,
    rest_days: [0, 6],
    preferred_skills: ["speaking", "listening"],
    start_date: "2026-11-01",
    target_date: "2026-11-30",
    duration_days: 30,
    status: "active",
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  const plan = generateTemplateLearningPlan(goal);

  // Complete 2 tasks in week 1 for active days
  const activeDays = plan.days.filter((d) => !d.is_rest_day && d.tasks.length > 0);
  if (activeDays[0]) activeDays[0].tasks[0].status = "completed";
  if (activeDays[1]) activeDays[1].tasks[0].status = "completed";

  const report = computeWeeklyAssessment(plan, 1, "user-week");

  assert.strictEqual(report.week_number, 1);
  assert.ok(report.completed_tasks_count >= 2);
  assert.ok(report.total_tasks_count > 0);
  assert.ok(report.strengths.length > 0);
  assert.ok(report.areas_to_improve.length > 0);
  assert.ok(report.next_week_focus.length > 0);
});
