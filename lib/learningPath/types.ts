import type { CEFRLevel } from "@/lib/ai/types";

export type { CEFRLevel };

export type LearningGoalType =
  | "daily_english"
  | "travel_english"
  | "business_english"
  | "job_interview"
  | "academic_english"
  | "improve_speaking"
  | "improve_listening"
  | "vocabulary_building"
  | "general_english"
  | "custom";

export type SkillPriority =
  | "speaking"
  | "listening"
  | "vocabulary"
  | "grammar"
  | "pronunciation"
  | "reading";

export type DailyMinutes = 10 | 15 | 20 | 30 | 45 | 60;
export type DaysPerWeek = 3 | 4 | 5 | 6 | 7;

export interface LearningGoal {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  primary_goal: LearningGoalType;
  custom_goal_text?: string;
  current_level: CEFRLevel;
  target_level: CEFRLevel;
  daily_minutes: DailyMinutes;
  days_per_week: DaysPerWeek;
  rest_days: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  preferred_skills: SkillPriority[];
  ai_determined_skills?: boolean;
  start_date: string; // YYYY-MM-DD
  target_date: string; // YYYY-MM-DD
  duration_days: number; // e.g. 30, 45, 60, 90
  status: "active" | "paused" | "completed" | "archived";
  // Ready for Placement Test integration in future phase (Prompt 04 - Section 12)
  placement_test_result?: {
    level: CEFRLevel;
    test_date: string;
    scores?: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
}

export type TaskType =
  | "srs_review"
  | "new_vocabulary"
  | "shadowing"
  | "reflex"
  | "roleplay"
  | "listening";

export type TaskStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "skipped";

export interface LearningTask {
  id: string;
  day_number: number;
  task_type: TaskType;
  title: string;
  description: string;
  estimated_minutes: number;
  target_action_url: string; // e.g. /study?level=A2, /reflex, /roleplay?scenario=restaurant
  target_deck_id?: string;
  target_scenario_id?: string;
  target_level?: CEFRLevel;
  status: TaskStatus;
  completed_at?: string;
  actual_minutes?: number;
  verified_via?: "study_log" | "srs_review" | "roleplay_turn" | "user_confirm";
}

export interface LearningDay {
  day_number: number;
  phase_number: number;
  week_number: number;
  date?: string; // YYYY-MM-DD
  is_rest_day?: boolean;
  learning_objective: string;
  estimated_minutes: number;
  tasks: LearningTask[];
  status: "upcoming" | "current" | "completed" | "skipped";
  summary?: string;
}

export interface LearningPhase {
  phase_number: number;
  title: string;
  description: string;
  start_day: number;
  end_day: number;
  milestones: string[];
}

export interface LearningPlan {
  id: string;
  user_id: string | null;
  goal_id: string;
  title: string;
  description: string;
  total_days: number;
  current_day: number;
  plan_version: number;
  status: "active" | "paused" | "completed";
  ai_provider: string;
  is_mock?: boolean;
  phases: LearningPhase[];
  days: LearningDay[];
  created_at: string;
  updated_at: string;
}

export interface AdaptiveAdjustment {
  id: string;
  plan_id: string;
  trigger_reason:
    | "srs_struggles"
    | "frequent_tutor_errors"
    | "time_shortage"
    | "fast_progress"
    | "goal_changed";
  title_vi: string;
  description_vi: string;
  recommended_action: string;
  action_payload?: Record<string, any>;
  applied_at?: string;
  status: "pending" | "applied" | "dismissed";
}

export interface WeeklyAssessmentReport {
  week_number: number;
  start_date: string;
  end_date: string;
  active_study_days: number;
  completed_tasks_count: number;
  total_tasks_count: number;
  reviewed_cards_count: number;
  new_cards_learned: number;
  avg_accuracy_score: number;
  strengths: string[];
  areas_to_improve: string[];
  next_week_focus: string;
  generated_at: string;
}
