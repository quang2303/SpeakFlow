import type {
  LearningDay,
  LearningGoal,
  LearningPlan,
  LearningTask,
  TaskStatus,
} from "./types";
import { getStoredUserProfile, getSupabaseClient } from "@/lib/dataService";

const STORAGE_KEYS = {
  GOAL: "speakflow_learning_goal_v1",
  PLAN: "speakflow_learning_plan_v1",
  PROGRESS: "speakflow_task_progress_v1",
  OUTBOX: "speakflow_pending_plan_sync_v1",
};

function getStoragePrefix(): string {
  const user = getStoredUserProfile();
  return user?.id ? `user_${user.id}_` : "guest_";
}

/**
 * Get active learning goal for current user
 */
export function getActiveGoal(): LearningGoal | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.GOAL}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LearningGoal;
  } catch {
    return null;
  }
}

/**
 * Save or update learning goal
 */
export async function saveGoal(goal: LearningGoal): Promise<LearningGoal> {
  const activeUser = getStoredUserProfile();
  const goalWithUser: LearningGoal = {
    ...goal,
    user_id: activeUser ? activeUser.id : null,
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.GOAL}`;
    window.localStorage.setItem(key, JSON.stringify(goalWithUser));
  }

  const supabase = getSupabaseClient();
  if (supabase && activeUser) {
    try {
      await supabase.from("learning_goals").upsert({
        id: goalWithUser.id,
        user_id: activeUser.id,
        title: goalWithUser.title,
        description: goalWithUser.description,
        primary_goal: goalWithUser.primary_goal,
        custom_goal_text: goalWithUser.custom_goal_text || null,
        current_level: goalWithUser.current_level,
        target_level: goalWithUser.target_level,
        daily_minutes: goalWithUser.daily_minutes,
        days_per_week: goalWithUser.days_per_week,
        rest_days: goalWithUser.rest_days || [],
        preferred_skills: goalWithUser.preferred_skills || [],
        start_date: goalWithUser.start_date,
        target_date: goalWithUser.target_date,
        duration_days: goalWithUser.duration_days,
        status: goalWithUser.status,
        placement_test_result: goalWithUser.placement_test_result || null,
        updated_at: goalWithUser.updated_at,
      });
    } catch {
      // Offline fallback already stored locally
    }
  }

  return goalWithUser;
}

/**
 * Get active learning plan for current user
 */
export function getActivePlan(): LearningPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.PLAN}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LearningPlan;
  } catch {
    return null;
  }
}

/**
 * Save or update learning plan
 */
export async function savePlan(plan: LearningPlan): Promise<LearningPlan> {
  const activeUser = getStoredUserProfile();
  const planWithUser: LearningPlan = {
    ...plan,
    user_id: activeUser ? activeUser.id : null,
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.PLAN}`;
    window.localStorage.setItem(key, JSON.stringify(planWithUser));

    // Dispatch auth changed event so Dashboard & Profile update immediately
    try {
      window.dispatchEvent(new Event("speakflow-auth-changed"));
    } catch {
      // ignore
    }
  }

  const supabase = getSupabaseClient();
  if (supabase && activeUser) {
    try {
      await supabase.from("learning_plans").upsert({
        id: planWithUser.id,
        user_id: activeUser.id,
        goal_id: planWithUser.goal_id,
        title: planWithUser.title,
        description: planWithUser.description,
        total_days: planWithUser.total_days,
        current_day: planWithUser.current_day,
        plan_version: planWithUser.plan_version,
        status: planWithUser.status,
        ai_provider: planWithUser.ai_provider,
        phases: planWithUser.phases,
        days: planWithUser.days,
        updated_at: planWithUser.updated_at,
      });
    } catch {
      // Offline fallback already stored locally
    }
  }

  return planWithUser;
}

/**
 * Complete a specific task in the plan
 * Verification ensures task was completed legitimately (e.g. by practicing or clicking complete)
 */
export async function completeTask(
  taskId: string,
  dayNumber: number,
  verificationType: "study_log" | "srs_review" | "roleplay_turn" | "user_confirm" = "user_confirm"
): Promise<{ plan: LearningPlan; dayCompleted: boolean }> {
  const plan = getActivePlan();
  if (!plan) throw new Error("Chưa có lộ trình học nào được kích hoạt.");

  let dayCompleted = false;

  const updatedDays = plan.days.map((day) => {
    if (day.day_number !== dayNumber) return day;

    const updatedTasks = day.tasks.map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        status: "completed" as TaskStatus,
        completed_at: new Date().toISOString(),
        verified_via: verificationType,
      };
    });

    // Check if all non-rest tasks in this day are now completed
    const allDone = updatedTasks.every(
      (t) => t.status === "completed" || t.status === "skipped"
    );

    if (allDone) {
      dayCompleted = true;
    }

    return {
      ...day,
      tasks: updatedTasks,
      status: allDone ? ("completed" as const) : day.status,
    };
  });

  // If this day is completed, unlock next active day's tasks
  if (dayCompleted && plan.current_day === dayNumber) {
    const nextDayNum = plan.current_day + 1;
    if (nextDayNum <= plan.total_days) {
      const nextDay = updatedDays.find((d) => d.day_number === nextDayNum);
      if (nextDay && !nextDay.is_rest_day) {
        nextDay.status = "current";
        nextDay.tasks = nextDay.tasks.map((t) => ({
          ...t,
          status: "available",
        }));
      }
    }
  }

  const updatedPlan: LearningPlan = {
    ...plan,
    days: updatedDays,
    updated_at: new Date().toISOString(),
  };

  await savePlan(updatedPlan);
  return { plan: updatedPlan, dayCompleted };
}

/**
 * Skip a task (with legitimate user intent)
 */
export async function skipTask(taskId: string, dayNumber: number): Promise<LearningPlan> {
  const plan = getActivePlan();
  if (!plan) throw new Error("Chưa có lộ trình học nào được kích hoạt.");

  const updatedDays = plan.days.map((day) => {
    if (day.day_number !== dayNumber) return day;
    return {
      ...day,
      tasks: day.tasks.map((task) =>
        task.id === taskId ? { ...task, status: "skipped" as TaskStatus } : task
      ),
    };
  });

  const updatedPlan: LearningPlan = {
    ...plan,
    days: updatedDays,
    updated_at: new Date().toISOString(),
  };

  return await savePlan(updatedPlan);
}

/**
 * Re-open a task to study again
 */
export async function reopenTask(taskId: string, dayNumber: number): Promise<LearningPlan> {
  const plan = getActivePlan();
  if (!plan) throw new Error("Chưa có lộ trình học nào được kích hoạt.");

  const updatedDays = plan.days.map((day) => {
    if (day.day_number !== dayNumber) return day;
    return {
      ...day,
      tasks: day.tasks.map((task) =>
        task.id === taskId ? { ...task, status: "available" as TaskStatus } : task
      ),
      status: "current" as const,
    };
  });

  const updatedPlan: LearningPlan = {
    ...plan,
    days: updatedDays,
    updated_at: new Date().toISOString(),
  };

  return await savePlan(updatedPlan);
}

/**
 * Advance plan day pointer manually
 */
export async function advanceToNextDay(): Promise<LearningPlan | null> {
  const plan = getActivePlan();
  if (!plan) return null;

  if (plan.current_day < plan.total_days) {
    const nextDayNum = plan.current_day + 1;
    const updatedDays = plan.days.map((d) => {
      if (d.day_number === nextDayNum && !d.is_rest_day) {
        return {
          ...d,
          status: "current" as const,
          tasks: d.tasks.map((t) => ({ ...t, status: "available" as TaskStatus })),
        };
      }
      return d;
    });

    const updatedPlan: LearningPlan = {
      ...plan,
      current_day: nextDayNum,
      days: updatedDays,
      updated_at: new Date().toISOString(),
    };

    return await savePlan(updatedPlan);
  }

  return plan;
}
