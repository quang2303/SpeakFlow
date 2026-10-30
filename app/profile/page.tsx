"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Mic,
  Clock,
  Sparkles,
  Volume2,
  CheckCircle2,
  Edit3,
  Check,
  X,
  Shield,
  GraduationCap,
  Cloud,
  RefreshCw,
  LogOut,
  LogIn,
  Zap,
  BookOpen,
  Layers,
  ChevronRight,
  Settings,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  getCurrentUser,
  getStoredUserProfile,
  signOutUser,
  updateUserDisplayName,
  getStreakData,
  getStudentProfileMetrics,
  AdminStudentMetrics,
  UserProfile,
  resetLocalToSeed,
  syncUserProgressWithCloud,
} from "@/lib/dataService";
import { UserAvatar } from "@/components/AuthModal";
import { speakEnglish } from "@/lib/speech";

const THEME_OPTIONS = [
  { id: "emerald", label: "Xanh Mint", dotColor: "bg-emerald-500", ringColor: "ring-emerald-400" },
  { id: "sky", label: "Xanh Da Trời", dotColor: "bg-sky-500", ringColor: "ring-sky-400" },
  { id: "coral", label: "Cam Nắng", dotColor: "bg-orange-500", ringColor: "ring-orange-400" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<AdminStudentMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Learning preferences
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>("emerald");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadData = useCallback(async () => {
    const cachedUser = getStoredUserProfile();
    setUser(cachedUser);
    setNameInput(cachedUser?.full_name || "Quang Đức");

    const m = getStudentProfileMetrics(cachedUser?.id);
    setMetrics(m);

    // Fetch fresh user
    const freshUser = await getCurrentUser();
    if (freshUser) {
      setUser(freshUser);
      setNameInput(freshUser.full_name || "Quang Đức");
      const freshMetrics = getStudentProfileMetrics(freshUser.id);
      setMetrics(freshMetrics);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();

    // Preferences from localStorage
    try {
      const savedGoal = localStorage.getItem("speakflow_daily_goal");
      if (savedGoal) setDailyGoal(Number(savedGoal));

      const savedRate = localStorage.getItem("speakflow_speech_rate");
      if (savedRate) setSpeechRate(Number(savedRate));

      const savedTheme = localStorage.getItem("speakflow_color_theme") || "emerald";
      setCurrentTheme(savedTheme);
    } catch {
      // ignore
    }

    const handleAuthChange = () => {
      void loadData();
    };
    window.addEventListener("speakflow-auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("speakflow-auth-changed", handleAuthChange);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [loadData]);

  // Handle Save Display Name
  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const updated = await updateUserDisplayName(trimmed);
      if (updated) {
        setUser(updated);
        setIsEditingName(false);
      }
    } finally {
      setSavingName(false);
    }
  }

  // Handle Play Pronunciation
  function handlePlayAudio(text: string, rate: number = 0.9) {
    setPlayingWord(text);
    speakEnglish(text, rate, () => {
      setPlayingWord(null);
    });
  }

  // Save Goal
  function handleSelectGoal(goal: number) {
    setDailyGoal(goal);
    try {
      localStorage.setItem("speakflow_daily_goal", String(goal));
    } catch {
      // ignore
    }
  }

  // Save Speech Rate
  function handleSelectRate(rate: number) {
    setSpeechRate(rate);
    try {
      localStorage.setItem("speakflow_speech_rate", String(rate));
    } catch {
      // ignore
    }
    speakEnglish("This is how your pronunciation guide will sound.", rate);
  }

  // Switch Theme
  function handleSelectTheme(themeId: string) {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem("speakflow_color_theme", themeId);
      document.documentElement.setAttribute("data-theme", themeId);
    } catch {
      // ignore
    }
  }

  // Cloud Sync
  async function handleCloudSync() {
    if (!user) return;
    setSyncingCloud(true);
    try {
      await syncUserProgressWithCloud(user);
      await loadData();
    } finally {
      setSyncingCloud(false);
    }
  }

  // Reset Progress
  function handleResetProgress() {
    resetLocalToSeed();
    setShowResetConfirm(false);
    void loadData();
  }

  // Logout
  async function handleLogout() {
    await signOutUser();
    router.push("/login");
  }

  const displayName = user?.full_name || "Quang Đức";
  const email = user?.email || "chungducquang2@gmail.com";
  const streak = metrics?.streak ?? getStreakData().currentStreak;
  const masteredCount = metrics?.masteredCount ?? 0;
  const totalCards = metrics?.totalCards ?? 100;
  const progressPercent = metrics?.progressPercent ?? Math.round((masteredCount / totalCards) * 100);
  const avgPronunciation = metrics?.avgPronunciation ?? 88;
  const totalMinutes = metrics?.totalMinutes ?? 45;
  const box1 = metrics?.box1Count ?? 70;
  const box23 = metrics?.box23Count ?? 20;
  const box45 = metrics?.box45Count ?? 10;
  const redWords = metrics?.redWordDetails ?? [];
  const recentLogs = metrics?.recentLogs ?? [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto space-y-7">
      {/* ================= BREADCRUMB & BACK ================= */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Trang chủ</span>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
              title="Đổi sang tài khoản khác"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Đổi tài khoản</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>

      {/* ================= A. THẺ HỒ SƠ HỌC VIÊN (PROFILE HERO) ================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar with Status */}
          <div className="relative shrink-0">
            {user ? (
              <UserAvatar
                user={user}
                sizeClass="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-2xl font-bold shadow-md shadow-brand-500/10"
                showOnlineDot={user.status !== "locked"}
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-3xl font-bold shadow-md shadow-brand-500/15">
                QĐ
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
              title="Tài khoản đang hoạt động"
            >
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Name + Inline Edit */}
            <div className="flex items-center gap-3 flex-wrap">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-brand-400 bg-white text-slate-900 font-bold text-xl sm:text-2xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    placeholder="Nhập tên học viên..."
                    autoFocus
                    disabled={savingName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSaveName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition-colors"
                    title="Lưu tên"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setNameInput(displayName);
                    }}
                    disabled={savingName}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Hủy"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {displayName}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Đổi tên hiển thị"
                    aria-label="Đổi tên hiển thị"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Email & Persona */}
            <p className="text-sm text-slate-500 font-medium">
              {email}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-semibold border border-brand-200/60">
                <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                <span>{user?.role === "admin" ? "Quản trị viên" : "Học viên SpeakFlow"}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đang hoạt động</span>
              </span>

              <button
                type="button"
                onClick={handleCloudSync}
                disabled={syncingCloud}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold border border-sky-200/60 transition-colors"
                title="Nhấn để đồng bộ dữ liệu với Supabase Cloud"
              >
                <Cloud className={`w-3.5 h-3.5 ${syncingCloud ? "animate-spin" : ""}`} />
                <span>{syncingCloud ? "Đang đồng bộ..." : "Supabase Cloud"}</span>
              </button>
            </div>
          </div>

          {/* Quick Study Action */}
          <div className="shrink-0 w-full sm:w-auto flex sm:flex-col gap-2">
            <Link
              href="/study"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Học tiếp ngay</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="sm:w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= B. BỘ CHỈ SỐ NĂNG LỰC CỐT LÕI (KEY METRICS) ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Streak */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Chuỗi học tập</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {streak} <span className="text-xs font-semibold text-slate-500">ngày</span>
            </p>
            <div className="flex items-center gap-1 mt-2.5" title="Điểm danh 7 ngày qua">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${
                    i >= 7 - streak ? "bg-amber-500" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Metric 2: Mẫu câu thành thạo */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mẫu câu thành thạo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {masteredCount} <span className="text-xs font-semibold text-slate-500">/ {totalCards} câu</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Đạt {progressPercent}% toàn kho mẫu câu
            </p>
          </div>
        </div>

        {/* Metric 3: Phát âm AI trung bình */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Phát âm AI chuẩn</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {avgPronunciation}%
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {avgPronunciation >= 80 ? "Phát âm rất rõ ràng" : "Cần rèn thêm âm cuối"}
            </p>
          </div>
        </div>

        {/* Metric 4: Thời gian tích lũy */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Thời gian học tập</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {totalMinutes} <span className="text-xs font-semibold text-slate-500">phút</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Tích lũy qua các phiên học
            </p>
          </div>
        </div>
      </div>

      {/* ================= C. PHÂN BỔ GHI NHỚ SRS (LEITNER BOXES) ================= */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Giai đoạn ghi nhớ Spaced Repetition (SRS)
            </h2>
            <p className="text-xs text-slate-500">
              Phân loại {totalCards} mẫu câu theo 5 hộp trí nhớ Leitner của thuật toán SM-2
            </p>
          </div>
          <Link
            href="/study"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Vào phiên ôn tập</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Progress Bar Multi-segment */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
            <div
              style={{ width: `${(box45 / totalCards) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Thành thạo: ${box45} câu`}
            />
            <div
              style={{ width: `${(box23 / totalCards) * 100}%` }}
              className="h-full bg-sky-500 transition-all duration-500"
              title={`Đang nhớ: ${box23} câu`}
            />
            <div
              style={{ width: `${(box1 / totalCards) * 100}%` }}
              className="h-full bg-amber-400 transition-all duration-500"
              title={`Cần củng cố: ${box1} câu`}
            />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100/80">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-900">
                  {box45} câu thành thạo
                </p>
                <p className="text-[11px] text-emerald-700/90 font-medium">
                  Hộp 4 & 5 (Phản xạ tức thì)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50/70 border border-sky-100/80">
              <div className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-sky-900">
                  {box23} câu đang nhớ
                </p>
                <p className="text-[11px] text-sky-700/90 font-medium">
                  Hộp 2 & 3 (Ôn 1 - 6 ngày)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-100/80">
              <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-900">
                  {box1} câu cần củng cố
                </p>
                <p className="text-[11px] text-amber-700/90 font-medium">
                  Hộp 1 (Ôn tập hằng ngày)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= D. SỔ TAY PHÁT ÂM AI (YÊU CẦU 2 THEO KẾ HOẠCH) ================= */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Sổ tay phát âm AI (Từ vựng cần chú ý)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                {redWords.length} từ
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Các từ bạn thường bị vấp hoặc phát âm chưa rõ trong bài nói & Shadowing. Nhấn loa để nghe người bản xứ đọc mẫu và sửa khẩu hình.
            </p>
          </div>
        </div>

        {redWords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {redWords.map((item, idx) => {
              const isPlaying = playingWord === item.word;
              return (
                <div
                  key={`${item.word}-${idx}`}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-brand-200 hover:bg-brand-50/20 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900 tracking-tight">
                          {item.word}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-700">
                          {item.errorCount} lần vấp
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.heardAs ? `Hay nhầm thành: "${item.heardAs}"` : "Cần phát âm rõ âm cuối"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlayAudio(item.word, speechRate)}
                      className={`p-2 rounded-xl transition-all ${
                        isPlaying
                          ? "bg-brand-500 text-white scale-105"
                          : "bg-white border border-slate-200/90 text-brand-600 hover:bg-brand-50 shadow-xs"
                      }`}
                      title={`Nghe phát âm chuẩn từ "${item.word}"`}
                      aria-label={`Nghe phát âm từ ${item.word}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.sentenceEn && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600 italic line-clamp-1">
                        &quot;{item.sentenceEn}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(item.sentenceEn, speechRate)}
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 shrink-0"
                      >
                        Nghe cả câu
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2 rounded-2xl bg-slate-50/60 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Rất xuất sắc! Bạn chưa có từ nào bị phát âm sai
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hãy tiếp tục luyện tập Shadowing và Phản xạ 60s để duy trì phong độ giao tiếp nhé!
            </p>
          </div>
        )}
      </div>

      {/* ================= E. CÀI ĐẶT HỌC TẬP & TIỆN ÍCH ================= */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Cài đặt học tập & Tiện ích cá nhân
          </h2>
          <p className="text-xs text-slate-500">
            Tùy biến trải nghiệm học tập phù hợp với thói quen và mục tiêu của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Setting 1: Mục tiêu thẻ mỗi ngày */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-800">
                Mục tiêu hoàn thành mỗi ngày
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Số lượng thẻ phản xạ bạn muốn đạt được mỗi ngày để duy trì chuỗi Streak.
            </p>
            <div className="flex items-center gap-2">
              {[10, 20, 30].map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => handleSelectGoal(goal)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    dailyGoal === goal
                      ? "bg-brand-500 text-white shadow-xs"
                      : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {goal} thẻ / ngày
                </button>
              ))}
            </div>
          </div>

          {/* Setting 2: Tốc độ giọng đọc AI */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-brand-600" />
              <label className="text-xs font-bold text-slate-800">
                Tốc độ phát âm người bản xứ
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Điều chỉnh tốc độ âm thanh khi luyện nghe mẫu câu và Shadowing.
            </p>
            <div className="flex items-center gap-2">
              {[
                { rate: 0.8, label: "0.8x (Chậm)" },
                { rate: 1.0, label: "1.0x (Tự nhiên)" },
                { rate: 1.2, label: "1.2x (Nhanh)" },
              ].map((opt) => (
                <button
                  key={opt.rate}
                  type="button"
                  onClick={() => handleSelectRate(opt.rate)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all ${
                    speechRate === opt.rate
                      ? "bg-brand-500 text-white shadow-xs"
                      : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setting 3: Bảng màu hiển thị */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <label className="text-xs font-bold text-slate-800">
                Tông màu chủ đạo giao diện
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Chọn màu sắc sáng và dịu mắt bạn yêu thích nhất khi học lâu.
            </p>
            <div className="flex items-center gap-2">
              {THEME_OPTIONS.map((t) => {
                const isActive = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTheme(t.id)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isActive
                        ? "bg-white border-2 border-brand-500 text-slate-900 shadow-xs"
                        : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.dotColor}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setting 4: Quản lý dữ liệu & Reset */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-800">
                  Dữ liệu & Đồng bộ
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Dữ liệu tiến trình được lưu tự động trên thiết bị và Supabase Cloud.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloudSync}
                disabled={syncingCloud}
                className="flex-1 py-2 px-3 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Cloud className={`w-3.5 h-3.5 text-sky-600 ${syncingCloud ? "animate-spin" : ""}`} />
                <span>Đồng bộ mây</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/70 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Đặt lại toàn bộ lịch ôn tập từ đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại thẻ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL XÁC NHẬN ĐẶT LẠI THẺ ================= */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Đặt lại toàn bộ lịch ôn tập?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hành động này sẽ đưa toàn bộ {totalCards} mẫu câu về trạng thái ban đầu để bạn bắt đầu học lại từ đầu chu trình SM-2.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetProgress}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Xác nhận đặt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}