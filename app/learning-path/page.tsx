"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  BookOpen,
  Mic,
  Zap,
  Bot,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Pause,
  Play,
  Settings,
  AlertTriangle,
  TrendingUp,
  Layers,
  Flame,
  ChevronDown,
  ChevronUp,
  Sliders,
  X,
  Loader2,
  Award,
} from "lucide-react";
import { getStoredUserProfile, UserProfile } from "@/lib/dataService";
import AccountLockScreen from "@/components/AccountLockScreen";
import RequireAuthBarrier from "@/components/RequireAuthBarrier";
import { getLatestAssessmentResult } from "@/lib/assessment/assessmentService";
import type { AssessmentResult } from "@/lib/assessment/types";
import {
  AdaptiveAdjustment,
  CEFRLevel,
  DailyMinutes,
  DaysPerWeek,
  LearningDay,
  LearningGoal,
  LearningGoalType,
  LearningPlan,
  LearningTask,
  SkillPriority,
  TaskStatus,
} from "@/lib/learningPath/types";
import {
  GOAL_TITLES_VI,
  SKILL_LABELS_VI,
  generateTemplateLearningPlan,
} from "@/lib/learningPath/planner";
import {
  advanceToNextDay,
  completeTask,
  getActiveGoal,
  getActivePlan,
  reopenTask,
  saveGoal,
  savePlan,
  skipTask,
} from "@/lib/learningPath/service";
import {
  applyPlanAdjustment,
  generateAdaptiveRecommendations,
} from "@/lib/learningPath/adaptiveEngine";

const GOAL_OPTIONS: Array<{
  type: LearningGoalType;
  title: string;
  description: string;
  icon: any;
}> = [
  {
    type: "daily_english",
    title: "Giao tiếp hàng ngày",
    description: "Tự tin trò chuyện, kết bạn và xử lý tình huống đời sống.",
    icon: Flame,
  },
  {
    type: "travel_english",
    title: "Tiếng Anh du lịch",
    description: "Sân bay, khách sạn, nhà hàng, hỏi đường và mua sắm.",
    icon: Compass,
  },
  {
    type: "business_english",
    title: "Công việc & Đàm phán",
    description: "Họp hành, viết email, báo cáo tiến độ và đàm phán hợp đồng.",
    icon: TrendingUp,
  },
  {
    type: "job_interview",
    title: "Phỏng vấn xin việc",
    description: "Giới thiệu bản thân, chia sẻ kinh nghiệm và deal lương.",
    icon: Award,
  },
  {
    type: "improve_speaking",
    title: "Bứt phá phản xạ nói",
    description: "Tập trung tối đa vào tốc độ phản xạ và sự lưu loát.",
    icon: Mic,
  },
  {
    type: "improve_listening",
    title: "Nâng cao kỹ năng nghe",
    description: "Luyện tai bắt âm bản xứ và hiểu ngữ cảnh nhanh chóng.",
    icon: BookOpen,
  },
  {
    type: "vocabulary_building",
    title: "Mở rộng vốn từ vựng",
    description: "Cụm từ phrasal verbs, idioms và collocations tự nhiên.",
    icon: Layers,
  },
  {
    type: "general_english",
    title: "Phát triển toàn diện",
    description: "Cân bằng cả 4 kỹ năng nghe, nói, phản xạ và ghi nhớ.",
    icon: Sparkles,
  },
];

export default function LearningPathPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Active Plan & Goal
  const [activeGoal, setActiveGoal] = useState<LearningGoal | null>(null);
  const [activePlan, setActivePlan] = useState<LearningPlan | null>(null);

  // Active View Tab: "today" | "roadmap" | "settings"
  const [activeTab, setActiveTab] = useState<"today" | "roadmap" | "settings">(
    "today"
  );

  // Wizard state (when no plan exists or creating new)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planPreview, setPlanPreview] = useState<LearningPlan | null>(null);

  // Wizard Form values
  const [wizCurrentLevel, setWizCurrentLevel] = useState<CEFRLevel>("B1");
  const [wizTargetLevel, setWizTargetLevel] = useState<CEFRLevel>("B2");
  const [wizGoalType, setWizGoalType] =
    useState<LearningGoalType>("daily_english");
  const [wizCustomGoal, setWizCustomGoal] = useState("");
  const [wizDailyMinutes, setWizDailyMinutes] = useState<DailyMinutes>(20);
  const [wizDaysPerWeek, setWizDaysPerWeek] = useState<DaysPerWeek>(5);
  const [wizRestDays, setWizRestDays] = useState<number[]>([0, 6]); // Sun, Sat
  const [wizDurationDays, setWizDurationDays] = useState<number>(30);
  const [wizSkills, setWizSkills] = useState<SkillPriority[]>([
    "speaking",
    "listening",
  ]);

  // Adaptive recommendations state
  const [adaptiveAdjustments, setAdaptiveAdjustments] = useState<
    AdaptiveAdjustment[]
  >([]);
  const [applyingAdjId, setApplyingAdjId] = useState<string | null>(null);

  // Selected Day in Roadmap View
  const [selectedRoadmapDayNum, setSelectedRoadmapDayNum] = useState<number>(1);
  const [latestAssessment, setLatestAssessment] = useState<AssessmentResult | null>(null);

  // Load state on mount
  useEffect(() => {
    const user = getStoredUserProfile();
    setCurrentUser(user);
    setLatestAssessment(getLatestAssessmentResult(user?.id));

    const goal = getActiveGoal();
    const plan = getActivePlan();

    setActiveGoal(goal);
    setActivePlan(plan);

    if (!plan) {
      setIsWizardOpen(true);
    } else {
      setSelectedRoadmapDayNum(plan.current_day);
      // Load adaptive recommendations
      const adjs = generateAdaptiveRecommendations(plan, user?.id);
      setAdaptiveAdjustments(adjs);
    }

    const authHandler = () => {
      const u = getStoredUserProfile();
      setCurrentUser(u);
      setActiveGoal(getActiveGoal());
      setLatestAssessment(getLatestAssessmentResult(u?.id));
      const p = getActivePlan();
      setActivePlan(p);
      if (p) {
        setAdaptiveAdjustments(generateAdaptiveRecommendations(p, u?.id));
      }
    };
    window.addEventListener("speakflow-auth-changed", authHandler);
    return () => window.removeEventListener("speakflow-auth-changed", authHandler);
  }, []);

  function handleToggleSkill(skill: SkillPriority) {
    if (wizSkills.includes(skill)) {
      if (wizSkills.length > 1) {
        setWizSkills(wizSkills.filter((s) => s !== skill));
      }
    } else {
      setWizSkills([...wizSkills, skill]);
    }
  }

  function handleToggleRestDay(dayIndex: number) {
    if (wizRestDays.includes(dayIndex)) {
      setWizRestDays(wizRestDays.filter((d) => d !== dayIndex));
    } else {
      setWizRestDays([...wizRestDays, dayIndex]);
    }
  }

  // Generate Plan Preview in Wizard Step 5
  async function handleBuildPlanPreview() {
    setIsGeneratingPlan(true);

    const newGoal: LearningGoal = {
      id: `goal-${Date.now()}`,
      user_id: currentUser ? currentUser.id : null,
      title: GOAL_TITLES_VI[wizGoalType] || "Mục tiêu học tập",
      description: wizCustomGoal || GOAL_TITLES_VI[wizGoalType],
      primary_goal: wizGoalType,
      custom_goal_text: wizCustomGoal,
      current_level: wizCurrentLevel,
      target_level: wizTargetLevel,
      daily_minutes: wizDailyMinutes,
      days_per_week: wizDaysPerWeek,
      rest_days: wizRestDays,
      preferred_skills: wizSkills,
      start_date: new Date().toISOString().slice(0, 10),
      target_date: new Date(Date.now() + wizDurationDays * 86400000)
        .toISOString()
        .slice(0, 10),
      duration_days: wizDurationDays,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Call server AI planning API
      const res = await fetch("/api/learning-path/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: newGoal }),
      });

      if (res.ok) {
        const plan = (await res.json()) as LearningPlan;
        setPlanPreview(plan);
      } else {
        // Fallback to local template planner
        const fallback = generateTemplateLearningPlan(newGoal);
        setPlanPreview(fallback);
      }
    } catch {
      const fallback = generateTemplateLearningPlan(newGoal);
      setPlanPreview(fallback);
    } finally {
      setIsGeneratingPlan(false);
      setWizardStep(5);
    }
  }

  // Activate the plan
  async function handleActivatePlan() {
    if (!planPreview) return;

    const newGoal: LearningGoal = {
      id: planPreview.goal_id,
      user_id: currentUser ? currentUser.id : null,
      title: planPreview.title,
      description: planPreview.description,
      primary_goal: wizGoalType,
      custom_goal_text: wizCustomGoal,
      current_level: wizCurrentLevel,
      target_level: wizTargetLevel,
      daily_minutes: wizDailyMinutes,
      days_per_week: wizDaysPerWeek,
      rest_days: wizRestDays,
      preferred_skills: wizSkills,
      start_date: new Date().toISOString().slice(0, 10),
      target_date: new Date(Date.now() + wizDurationDays * 86400000)
        .toISOString()
        .slice(0, 10),
      duration_days: wizDurationDays,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveGoal(newGoal);
    await savePlan(planPreview);

    setActiveGoal(newGoal);
    setActivePlan(planPreview);
    setSelectedRoadmapDayNum(planPreview.current_day);
    setIsWizardOpen(false);
    setActiveTab("today");
    setAdaptiveAdjustments(
      generateAdaptiveRecommendations(planPreview, currentUser?.id)
    );
  }

  // Task actions
  async function handleCompleteTask(taskId: string, dayNumber: number) {
    if (!activePlan) return;
    const { plan: updatedPlan } = await completeTask(
      taskId,
      dayNumber,
      "user_confirm"
    );
    setActivePlan(updatedPlan);
  }

  async function handleSkipTask(taskId: string, dayNumber: number) {
    if (!activePlan) return;
    const updatedPlan = await skipTask(taskId, dayNumber);
    setActivePlan(updatedPlan);
  }

  async function handleReopenTask(taskId: string, dayNumber: number) {
    if (!activePlan) return;
    const updatedPlan = await reopenTask(taskId, dayNumber);
    setActivePlan(updatedPlan);
  }

  async function handleAdvanceDay() {
    const nextPlan = await advanceToNextDay();
    if (nextPlan) {
      setActivePlan(nextPlan);
      setSelectedRoadmapDayNum(nextPlan.current_day);
    }
  }

  // Apply Adaptive Adjustment
  async function handleApplyAdjustment(adj: AdaptiveAdjustment) {
    if (!activePlan) return;
    setApplyingAdjId(adj.id);
    try {
      const adjusted = applyPlanAdjustment(activePlan, adj);
      await savePlan(adjusted);
      setActivePlan(adjusted);
      setAdaptiveAdjustments((prev) => prev.filter((a) => a.id !== adj.id));
    } finally {
      setApplyingAdjId(null);
    }
  }

  function getTaskIcon(taskType: string) {
    switch (taskType) {
      case "srs_review":
      case "new_vocabulary":
        return BookOpen;
      case "shadowing":
        return Mic;
      case "reflex":
        return Zap;
      case "roleplay":
        return Bot;
      default:
        return Sparkles;
    }
  }

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  if (!currentUser) {
    return (
      <RequireAuthBarrier
        title="Đăng nhập để vào Lộ trình cá nhân AI"
        description="Đăng nhập tài khoản để AI xây dựng và theo dõi lộ trình học tập thích ứng cá nhân hóa cho bạn."
        redirectUrl="/learning-path"
      />
    );
  }

  // Current Day info
  const currentDayData: LearningDay | undefined = activePlan?.days.find(
    (d) => d.day_number === activePlan.current_day
  );

  const completedTasksCount =
    currentDayData?.tasks.filter((t) => t.status === "completed").length || 0;
  const totalTasksCount = currentDayData?.tasks.length || 0;
  const dayProgressPercent =
    totalTasksCount > 0
      ? Math.round((completedTasksCount / totalTasksCount) * 100)
      : 0;

  // Overall Plan Progress
  const totalPlanTasks =
    activePlan?.days.reduce((acc, d) => acc + d.tasks.length, 0) || 1;
  const totalPlanCompleted =
    activePlan?.days.reduce(
      (acc, d) =>
        acc + d.tasks.filter((t) => t.status === "completed").length,
      0
    ) || 0;
  const overallProgressPercent = Math.round(
    (totalPlanCompleted / totalPlanTasks) * 100
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* =========================================================================
          TOP HEADER: BRAND & VIEW NAVIGATION
      ========================================================================= */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Lộ trình học cá nhân hóa
              </h1>
              {activePlan?.is_mock && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Adaptive
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {activePlan
                ? `${activePlan.title} • Tiến độ ${overallProgressPercent}%`
                : "Thiết lập kế hoạch học tập riêng theo năng lực & quỹ thời gian"}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Only if plan exists) */}
        {activePlan && (
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "today"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
              <span>Hôm nay học gì</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roadmap")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "roadmap"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Toàn bộ lộ trình</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Điều chỉnh</span>
              {adaptiveAdjustments.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {adaptiveAdjustments.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: TODAY'S TASKS VIEW (TRANG NHIỆM VỤ HÔM NAY - MÀN HÌNH CHÍNH)
      ========================================================================= */}
      {activePlan && activeTab === "today" && !isWizardOpen && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Daily Progress Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-50/90 via-white to-emerald-50/50 border border-brand-200/90 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-100/80 px-2.5 py-0.5 rounded-md">
                    Ngày {activePlan.current_day} / {activePlan.total_days}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Trình độ {activeGoal?.current_level || "B1"} →{" "}
                    {activeGoal?.target_level || "B2"}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {currentDayData?.is_rest_day
                    ? "Hôm nay là Ngày nghỉ phục hồi 🌿"
                    : currentDayData?.learning_objective || "Nhiệm vụ hôm nay"}
                </h2>
                <p className="text-xs text-slate-600">
                  {currentDayData?.is_rest_day
                    ? currentDayData.summary ||
                      "Hãy thư giãn để não bộ củng cố các câu đã học!"
                    : `Ngân sách: ${currentDayData?.estimated_minutes || 20} phút • Hoàn thành ${completedTasksCount}/${totalTasksCount} bài học`}
                </p>
              </div>

              {/* Progress Ring / Bar */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {dayProgressPercent}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">
                    Tiến độ hôm nay
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-brand-500 transition-all duration-500"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% ${dayProgressPercent}%, 0 ${dayProgressPercent}%)`,
                    }}
                  />
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      dayProgressPercent === 100
                        ? "text-emerald-600"
                        : "text-slate-300"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${dayProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Today's Tasks List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span>Danh sách nhiệm vụ cần làm:</span>
              </h3>
              {dayProgressPercent === 100 && (
                <button
                  type="button"
                  onClick={handleAdvanceDay}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors"
                >
                  <span>Chuyển sang Ngày {activePlan.current_day + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {currentDayData?.is_rest_day ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  Hôm nay bạn không có nhiệm vụ bắt buộc
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Não bộ cần thời gian nghỉ ngơi để thuật toán Spaced Repetition củng cố các vùng nhớ dài hạn. Nếu vẫn muốn học thêm, bạn có thể bấm chuyển ngày tiếp theo bên dưới.
                </p>
                <button
                  type="button"
                  onClick={handleAdvanceDay}
                  className="px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors"
                >
                  Học trước ngày mai →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {currentDayData?.tasks.map((task, idx) => {
                  const TaskIcon = getTaskIcon(task.task_type);
                  const isDone = task.status === "completed";
                  const isSkipped = task.status === "skipped";

                  return (
                    <div
                      key={task.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
                        isDone
                          ? "bg-slate-50/80 border-slate-200 text-slate-500"
                          : "bg-white border-slate-200/90 hover:border-brand-300"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-brand-50 text-brand-600"
                          }`}
                        >
                          {isDone ? (
                            <Check className="w-5 h-5 text-emerald-600 font-bold" />
                          ) : (
                            <TaskIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400">
                              Bài {idx + 1}
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isDone
                                  ? "line-through text-slate-500"
                                  : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {task.estimated_minutes} phút
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isDone ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleReopenTask(task.id, activePlan.current_day)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Học lại</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleSkipTask(task.id, activePlan.current_day)
                              }
                              className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium"
                              title="Bỏ qua bài này hôm nay"
                            >
                              Bỏ qua
                            </button>

                            <Link
                              href={task.target_action_url}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>Bắt đầu học</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleCompleteTask(
                                  task.id,
                                  activePlan.current_day
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold transition-colors"
                              title="Xác nhận đã học xong bài này"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Xong</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: ROADMAP / TIMELINE VIEW (TOÀN BỘ LỘ TRÌNH THEO GIAI ĐOẠN)
      ========================================================================= */}
      {activePlan && activeTab === "roadmap" && !isWizardOpen && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Phases Progress Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {activePlan.phases.map((phase) => {
              const isCurrentPhase =
                activePlan.current_day >= phase.start_day &&
                activePlan.current_day <= phase.end_day;
              const isCompletedPhase = activePlan.current_day > phase.end_day;

              return (
                <div
                  key={phase.phase_number}
                  className={`p-4 rounded-2xl border space-y-2 transition-all ${
                    isCurrentPhase
                      ? "bg-brand-50/70 border-brand-300 ring-1 ring-brand-400 shadow-xs"
                      : isCompletedPhase
                      ? "bg-slate-50 border-slate-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                      Giai đoạn {phase.phase_number}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Ngày {phase.start_day}–{phase.end_day}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {phase.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {phase.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Days Grid Navigator */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Lịch trình 30 ngày (Bấm vào ngày để xem chi tiết bài học):
              </span>
              <span className="text-xs text-brand-600 font-semibold">
                Đang ở Ngày {activePlan.current_day}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
              {activePlan.days.map((day) => {
                const isSelected = selectedRoadmapDayNum === day.day_number;
                const isCurrent = day.day_number === activePlan.current_day;
                const isDone = day.status === "completed";
                const isRest = day.is_rest_day;

                return (
                  <button
                    key={day.day_number}
                    type="button"
                    onClick={() => setSelectedRoadmapDayNum(day.day_number)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative ${
                      isSelected
                        ? "bg-brand-600 text-white border-brand-600 shadow-xs scale-105 z-10"
                        : isCurrent
                        ? "bg-brand-50 border-brand-400 text-brand-700 font-bold ring-2 ring-brand-300"
                        : isDone
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                        : isRest
                        ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold">{day.day_number}</span>
                    <span className="text-[9px] mt-0.5 truncate max-w-full">
                      {isRest ? "Nghỉ" : isDone ? "✓ Xong" : `${day.estimated_minutes}m`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Inspector */}
            {(() => {
              const inspDay = activePlan.days.find(
                (d) => d.day_number === selectedRoadmapDayNum
              );
              if (!inspDay) return null;

              return (
                <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                        Chi tiết Ngày {inspDay.day_number} (Giai đoạn {inspDay.phase_number})
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {inspDay.learning_objective}
                      </h4>
                    </div>
                    {inspDay.is_rest_day && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-xs font-semibold">
                        Ngày nghỉ
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {inspDay.tasks.map((task, tIdx) => (
                      <div
                        key={task.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">
                            {tIdx + 1}. {task.title} ({task.estimated_minutes} phút)
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            {task.description}
                          </p>
                        </div>
                        <Link
                          href={task.target_action_url}
                          className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs shrink-0"
                        >
                          Mở bài học
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: ADAPTIVE SETTINGS & AI RECOMMENDATIONS VIEW
      ========================================================================= */}
      {activePlan && activeTab === "settings" && !isWizardOpen && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* AI Adaptive Recommendations List */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Đề xuất thích ứng từ AI (Adaptive Learning Engine):
              </span>
              <span className="text-xs text-slate-400">
                Phân tích dựa trên kết quả SRS và AI Tutor
              </span>
            </div>

            {adaptiveAdjustments.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  Lộ trình học đang vận hành rất cân bằng!
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chưa phát hiện điểm nghẽn về thời gian hoặc tỷ lệ quên thẻ bất thường.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {adaptiveAdjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        {adj.title_vi}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleApplyAdjustment(adj)}
                        disabled={applyingAdjId === adj.id}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
                      >
                        {applyingAdjId === adj.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Áp dụng ngay</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {adj.description_vi}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan Re-creation & Actions */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Quản lý mục tiêu & kế hoạch:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">Mục tiêu hiện tại:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {activeGoal?.title || "Giao tiếp hàng ngày"}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {activeGoal?.daily_minutes} phút/ngày • {activeGoal?.days_per_week} ngày/tuần
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
                <span className="text-slate-400 font-semibold">Tạo lộ trình mới:</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsWizardOpen(true);
                    setWizardStep(1);
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thiết lập lại mục tiêu & Lộ trình mới</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          WIZARD VIEW: 5-STEP GOAL & PREFERENCE ONBOARDING
      ========================================================================= */}
      {isWizardOpen && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-200">
          {/* Wizard Step Progress Indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Bước {wizardStep} / 5
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
                {wizardStep === 1 && "Xác định Trình độ hiện tại & Mục tiêu"}
                {wizardStep === 2 && "Chọn Mục tiêu giao tiếp trọng tâm"}
                {wizardStep === 3 && "Thiết lập Thời gian & Lịch học trong tuần"}
                {wizardStep === 4 && "Chọn Kỹ năng ưu tiên"}
                {wizardStep === 5 && "Bản xem trước Lộ trình cá nhân hóa"}
              </h2>
            </div>
            {activePlan && (
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* STEP 1: CEFR Level */}
          {wizardStep === 1 && (
            <div className="space-y-5">
              {latestAssessment && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0">
                      {latestAssessment.estimatedCefrLevel}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Đề xuất từ bài kiểm tra xếp lớp ({latestAssessment.overallScore}/100 điểm)
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Khuyên học cấp độ {latestAssessment.recommendedLearningLevel} • Khoảng: {latestAssessment.possibleLevelRange}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWizCurrentLevel(latestAssessment.recommendedLearningLevel);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors shadow-2xs"
                  >
                    Áp dụng trình độ này
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Trình độ hiện tại của bạn:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFRLevel[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setWizCurrentLevel(lvl)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          wizCurrentLevel === lvl
                            ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs ring-1 ring-brand-400"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-base font-bold">{lvl}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {lvl === "A1" && "Mới bắt đầu"}
                          {lvl === "A2" && "Sơ cấp"}
                          {lvl === "B1" && "Trung cấp"}
                          {lvl === "B2" && "Trung cao"}
                          {lvl === "C1" && "Cao cấp"}
                          {lvl === "C2" && "Thành thạo"}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Trình độ mục tiêu mong muốn đạt được:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {(["A2", "B1", "B2", "C1", "C2"] as CEFRLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setWizTargetLevel(lvl)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        wizTargetLevel === lvl
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs ring-1 ring-emerald-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-base font-bold">{lvl}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mục tiêu</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Goal Selection */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((g) => {
                  const Icon = g.icon;
                  const active = wizGoalType === g.type;

                  return (
                    <button
                      key={g.type}
                      type="button"
                      onClick={() => setWizGoalType(g.type)}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        active
                          ? "bg-brand-50/80 border-brand-300 ring-1 ring-brand-400 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          active
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900">
                          {g.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {g.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Goal Input */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs">
                <label className="font-semibold text-slate-700">
                  Mô tả thêm về mục tiêu cá nhân (tùy chọn):
                </label>
                <input
                  type="text"
                  value={wizCustomGoal}
                  onChange={(e) => setWizCustomGoal(e.target.value)}
                  placeholder="VD: Cần giao tiếp tiếng Anh chuẩn bị đi công tác Singapore trong 2 tháng tới..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Time & Days */}
          {wizardStep === 3 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Thời gian học mỗi ngày:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {([10, 15, 20, 30, 45, 60] as DailyMinutes[]).map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setWizDailyMinutes(min)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        wizDailyMinutes === min
                          ? "bg-brand-50 border-brand-300 text-brand-700 font-bold ring-1 ring-brand-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-base font-bold">{min}m</p>
                      <p className="text-[10px] text-slate-400">phút/ngày</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Chọn các ngày nghỉ trong tuần (nếu có):
                </label>
                <div className="grid grid-cols-7 gap-1.5 text-xs">
                  {[
                    { label: "CN", idx: 0 },
                    { label: "T2", idx: 1 },
                    { label: "T3", idx: 2 },
                    { label: "T4", idx: 3 },
                    { label: "T5", idx: 4 },
                    { label: "T6", idx: 5 },
                    { label: "T7", idx: 6 },
                  ].map((d) => {
                    const isRest = wizRestDays.includes(d.idx);
                    return (
                      <button
                        key={d.idx}
                        type="button"
                        onClick={() => handleToggleRestDay(d.idx)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          isRest
                            ? "bg-slate-100 text-slate-500 border-slate-300"
                            : "bg-brand-50 text-brand-700 border-brand-300"
                        }`}
                      >
                        {d.label}
                        <span className="block text-[9px] font-normal mt-0.5">
                          {isRest ? "Nghỉ" : "Học"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Thời lượng toàn bộ lộ trình:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setWizDurationDays(days)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        wizDurationDays === days
                          ? "bg-brand-50 border-brand-300 text-brand-700 font-bold ring-1 ring-brand-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-base font-bold">{days} ngày</p>
                      <p className="text-[10px] text-slate-400">
                        {days === 30
                          ? "1 tháng tăng tốc"
                          : days === 60
                          ? "2 tháng vững chắc"
                          : "Tiến độ chuẩn"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Preferred Skills */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Chọn các kỹ năng bạn muốn AI ưu tiên rèn luyện:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    "speaking",
                    "listening",
                    "vocabulary",
                    "grammar",
                    "pronunciation",
                    "reading",
                  ] as SkillPriority[]
                ).map((skill) => {
                  const selected = wizSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleToggleSkill(skill)}
                      className={`p-3.5 rounded-2xl border text-left font-bold text-xs transition-all flex items-center justify-between ${
                        selected
                          ? "bg-brand-50 border-brand-300 text-brand-700 ring-1 ring-brand-400"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{SKILL_LABELS_VI[skill]}</span>
                      {selected && <Check className="w-4 h-4 text-brand-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Gợi ý từ AI Architecture:
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Đối với mục tiêu giao tiếp, SpeakFlow luôn tự động kết hợp <strong>Active Recall (Flashcard SRS)</strong> và <strong>Shadowing Studio</strong> trong mỗi ngày học để tối ưu hóa khả năng phản xạ tự nhiên.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Plan Preview & Confirmation */}
          {wizardStep === 5 && planPreview && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-5 bg-gradient-to-br from-brand-50/90 to-emerald-50/60 border border-brand-200 rounded-3xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700">
                  Lộ trình đã sẵn sàng kích hoạt:
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {planPreview.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {planPreview.description}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 font-semibold">
                  <span>⏱️ {wizDailyMinutes} phút/ngày</span>
                  <span>📅 {wizDurationDays} ngày</span>
                  <span>🎯 {wizCurrentLevel} → {wizTargetLevel}</span>
                </div>
              </div>

              {/* 4 Phases Overview */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  4 Giai đoạn phát triển:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {planPreview.phases.map((ph) => (
                    <div
                      key={ph.phase_number}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900">
                          {ph.phase_number}. {ph.title}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Ngày {ph.start_day}–{ph.end_day}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {ph.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {wizardStep > 1 && wizardStep < 5 ? (
              <button
                type="button"
                onClick={() => setWizardStep(wizardStep - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            ) : wizardStep === 5 ? (
              <button
                type="button"
                onClick={() => setWizardStep(4)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
              >
                Chỉnh sửa lại
              </button>
            ) : (
              <div />
            )}

            {wizardStep < 4 && (
              <button
                type="button"
                onClick={() => setWizardStep(wizardStep + 1)}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {wizardStep === 4 && (
              <button
                type="button"
                onClick={handleBuildPlanPreview}
                disabled={isGeneratingPlan}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI đang phân bổ lộ trình...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Tạo lộ trình với AI</span>
                  </>
                )}
              </button>
            )}

            {wizardStep === 5 && (
              <button
                type="button"
                onClick={handleActivatePlan}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                <span>Kích hoạt Lộ trình học ngay</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
