import type {
  AdaptiveAdjustment,
  LearningDay,
  LearningPlan,
  WeeklyAssessmentReport,
} from "./types";

export interface LearnerWeaknessAnalysis {
  srsBox1Ratio: number; // Ratio of cards in Box 1 (forgetting/hard)
  mispronouncedWords: string[];
  recurringGrammarErrors: Array<{
    errorType: string;
    original: string;
    corrected: string;
    explanationVi: string;
  }>;
  recentTaskCompletionRate: number; // 0 to 1
  suggestedActionType?: AdaptiveAdjustment["trigger_reason"];
}

// Lazy safe loader for client environment
function getRuntimeMetrics(userId?: string) {
  if (typeof window === "undefined") return null;
  try {
    const { getStudentProfileMetrics } = require("@/lib/dataService");
    return getStudentProfileMetrics(userId);
  } catch {
    return null;
  }
}

function getRuntimeTutorSessions() {
  if (typeof window === "undefined") return [];
  try {
    const { getStoredSessions } = require("@/lib/roleplayService");
    return getStoredSessions();
  } catch {
    return [];
  }
}

/**
 * Analyzes real learning data from SRS, speech recognition logs, and AI Tutor sessions
 */
export function analyzeLearnerWeaknesses(
  plan?: LearningPlan | null,
  userId?: string,
  overrides?: {
    srsBox1Ratio?: number;
    mispronouncedWords?: string[];
    recurringGrammarErrors?: Array<{
      errorType: string;
      original: string;
      corrected: string;
      explanationVi: string;
    }>;
  }
): LearnerWeaknessAnalysis {
  const metrics = overrides?.srsBox1Ratio !== undefined ? null : getRuntimeMetrics(userId);
  const tutorSessions = overrides?.recurringGrammarErrors ? [] : getRuntimeTutorSessions();

  // 1. SRS weakness: ratio of box 1 cards vs total cards
  let srsBox1Ratio = 0;
  if (overrides?.srsBox1Ratio !== undefined) {
    srsBox1Ratio = overrides.srsBox1Ratio;
  } else if (metrics) {
    const totalCards = metrics.totalCards || 0;
    const box1Count = metrics.box1Count || 0;
    srsBox1Ratio = totalCards > 0 ? box1Count / totalCards : 0;
  }

  // 2. Mispronounced words from recent speech practice
  const mispronouncedWords =
    overrides?.mispronouncedWords ||
    (metrics?.redWords ? metrics.redWords.slice(0, 5) : []);

  // 3. Recurring grammar errors from past AI Tutor sessions
  const recurringGrammarErrors: LearnerWeaknessAnalysis["recurringGrammarErrors"] =
    overrides?.recurringGrammarErrors || [];

  if (!overrides?.recurringGrammarErrors) {
    for (const session of tutorSessions) {
      if (session.summary?.grammarFeedback) {
        for (const item of session.summary.grammarFeedback) {
          if (item.original && item.corrected) {
            recurringGrammarErrors.push(item);
          }
        }
      }
    }
  }

  // 4. Task completion rate in current plan
  let recentTaskCompletionRate = 1.0;
  if (plan && plan.days.length > 0) {
    const pastDays = plan.days.filter(
      (d) => d.day_number < plan.current_day && !d.is_rest_day
    );
    if (pastDays.length > 0) {
      const completedDays = pastDays.filter((d) => d.status === "completed").length;
      recentTaskCompletionRate = completedDays / pastDays.length;
    }
  }

  // Determine top priority trigger reason
  let suggestedActionType: AdaptiveAdjustment["trigger_reason"] | undefined;
  if (recentTaskCompletionRate < 0.5) {
    suggestedActionType = "time_shortage";
  } else if (srsBox1Ratio > 0.35) {
    suggestedActionType = "srs_struggles";
  } else if (recurringGrammarErrors.length >= 2) {
    suggestedActionType = "frequent_tutor_errors";
  } else if (recentTaskCompletionRate >= 0.9 && srsBox1Ratio < 0.15) {
    suggestedActionType = "fast_progress";
  }

  return {
    srsBox1Ratio,
    mispronouncedWords,
    recurringGrammarErrors: recurringGrammarErrors.slice(0, 4),
    recentTaskCompletionRate,
    suggestedActionType,
  };
}

/**
 * Generates actionable adaptive recommendations for the learner
 */
export function generateAdaptiveRecommendations(
  plan: LearningPlan,
  userId?: string,
  overrides?: {
    srsBox1Ratio?: number;
    mispronouncedWords?: string[];
    recurringGrammarErrors?: Array<{
      errorType: string;
      original: string;
      corrected: string;
      explanationVi: string;
    }>;
  }
): AdaptiveAdjustment[] {
  const analysis = analyzeLearnerWeaknesses(plan, userId, overrides);
  const adjustments: AdaptiveAdjustment[] = [];

  // 1. Time shortage recommendation: reduce load if user is falling behind
  if (analysis.recentTaskCompletionRate < 0.5) {
    adjustments.push({
      id: `adj-time-${Date.now()}`,
      plan_id: plan.id,
      trigger_reason: "time_shortage",
      title_vi: "Điều chỉnh thời lượng học nhẹ nhàng hơn",
      description_vi: `Bạn đã hoàn tất khoảng ${Math.round(
        analysis.recentTaskCompletionRate * 100
      )}% số nhiệm vụ gần đây. Để tránh quá tải và duy trì thói quen bền vững, AI đề xuất giảm thời gian mỗi ngày xuống 15 phút.`,
      recommended_action: "Giảm thời lượng bài học hàng ngày để dễ hoàn thành hơn.",
      status: "pending",
    });
  }

  // 2. SRS struggles recommendation: more review, fewer new cards
  if (analysis.srsBox1Ratio > 0.35) {
    adjustments.push({
      id: `adj-srs-${Date.now()}`,
      plan_id: plan.id,
      trigger_reason: "srs_struggles",
      title_vi: "Tăng cường củng cố từ vựng trong Hộp 1",
      description_vi:
        "Bạn có khá nhiều từ vựng đang ở Hộp 1 (cần ôn lại). AI đề xuất ưu tiên ôn tập Flashcard trước khi học thêm các mẫu câu mới.",
      recommended_action: "Bổ sung phiên ôn tập ngắt quãng 5 phút vào đầu mỗi ngày.",
      status: "pending",
    });
  }

  // 3. AI Tutor recurring errors: targeted grammar/collocation practice
  if (analysis.recurringGrammarErrors.length > 0) {
    const firstErr = analysis.recurringGrammarErrors[0];
    adjustments.push({
      id: `adj-grammar-${Date.now()}`,
      plan_id: plan.id,
      trigger_reason: "frequent_tutor_errors",
      title_vi: "Khắc phục lỗi diễn đạt qua AI Tutor",
      description_vi: `AI Tutor ghi nhận điểm cần lưu ý: "${firstErr.original}" → nên dùng "${firstErr.corrected}". ${firstErr.explanationVi}`,
      recommended_action: "Thực hành thêm 1 lượt đối thoại tình huống với AI Tutor để sửa dứt điểm lỗi này.",
      status: "pending",
    });
  }

  // 4. Fast progress: offer accelerated challenges
  if (analysis.recentTaskCompletionRate >= 0.95 && analysis.srsBox1Ratio < 0.15) {
    adjustments.push({
      id: `adj-fast-${Date.now()}`,
      plan_id: plan.id,
      trigger_reason: "fast_progress",
      title_vi: "Tăng tốc độ phản xạ nâng cao",
      description_vi:
        "Bạn đang hoàn thành bài học rất xuất sắc với tỷ lệ ghi nhớ cao! AI đề xuất bổ sung thử thách phản xạ nhanh 60 giây để đẩy nhanh tiến độ.",
      recommended_action: "Mở khóa thêm các bài tập phản xạ 60 giây nâng cao.",
      status: "pending",
    });
  }

  return adjustments;
}

/**
 * Applies an adaptive adjustment to future days of the plan
 * CRITICAL RULE: Preserves all past completed tasks and progress!
 */
export function applyPlanAdjustment(
  plan: LearningPlan,
  adjustment: AdaptiveAdjustment
): LearningPlan {
  const currentDayNum = plan.current_day;

  const updatedDays = plan.days.map((day) => {
    // DO NOT touch past days or completed days
    if (day.day_number < currentDayNum || day.status === "completed") {
      return day;
    }

    if (day.is_rest_day) return day;

    const modifiedTasks = [...day.tasks];

    if (adjustment.trigger_reason === "time_shortage") {
      // Reduce task lengths or keep only top 2 essential tasks
      return {
        ...day,
        estimated_minutes: Math.max(10, Math.floor(day.estimated_minutes * 0.75)),
        tasks: modifiedTasks.slice(0, 2),
      };
    }

    if (adjustment.trigger_reason === "srs_struggles") {
      // Ensure first task is SRS review with enhanced note
      if (modifiedTasks.length > 0 && modifiedTasks[0].task_type === "srs_review") {
        modifiedTasks[0] = {
          ...modifiedTasks[0],
          title: "Ôn tập Flashcard củng cố (Tăng cường)",
          description: "Tập trung ôn các câu đã từng đánh giá 'Again' để chuyển lên Hộp 2.",
          estimated_minutes: modifiedTasks[0].estimated_minutes + 3,
        };
      }
      return {
        ...day,
        tasks: modifiedTasks,
      };
    }

    return day;
  });

  return {
    ...plan,
    days: updatedDays,
    plan_version: plan.plan_version + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Computes a weekly assessment report for completed days
 */
export function computeWeeklyAssessment(
  plan: LearningPlan,
  weekNumber: number,
  userId?: string
): WeeklyAssessmentReport {
  const metrics = getRuntimeMetrics(userId);
  const weekDays = plan.days.filter((d) => d.week_number === weekNumber);

  let completedTasksCount = 0;
  let totalTasksCount = 0;
  let activeStudyDays = 0;

  for (const day of weekDays) {
    totalTasksCount += day.tasks.length;
    const doneTasks = day.tasks.filter((t) => t.status === "completed").length;
    completedTasksCount += doneTasks;
    if (doneTasks > 0) activeStudyDays++;
  }

  const startDate = weekDays[0]?.date || new Date().toISOString().slice(0, 10);
  const endDate = weekDays[weekDays.length - 1]?.date || startDate;

  return {
    week_number: weekNumber,
    start_date: startDate,
    end_date: endDate,
    active_study_days: activeStudyDays,
    completed_tasks_count: completedTasksCount,
    total_tasks_count: totalTasksCount,
    reviewed_cards_count: metrics?.practicedCount || completedTasksCount * 5,
    new_cards_learned: metrics?.box23Count || Math.floor(completedTasksCount * 2),
    avg_accuracy_score: metrics?.avgPronunciation || 85,
    strengths: [
      "Duy trì thói quen học tập đều đặn trong tuần.",
      "Tiếp thu tốt các mẫu câu giao tiếp cơ bản.",
    ],
    areas_to_improve: [
      "Cần luyện tập phát âm rõ ràng hơn các âm đuôi (ending sounds).",
      "Tiếp tục củng cố các câu trong Hộp 1 để chuyển lên Hộp 2.",
    ],
    next_week_focus: "Mở rộng phản xạ qua kịch bản đối thoại hai chiều với AI Tutor.",
    generated_at: new Date().toISOString(),
  };
}
