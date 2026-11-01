"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Trophy,
  Play,
  Zap,
  Briefcase,
  Plane,
  Users,
  MessageSquare,
  Clock,
  ArrowRight,
  Terminal,
  FileText,
  Award,
  Compass,
} from "lucide-react";
import {
  getCards,
  getDecks,
  getInitialLocalData,
  getStreakData,
  getCurrentUser,
  getStoredUserProfile,
  StreakData,
  UserProfile,
} from "@/lib/dataService";
import {
  Card,
  Deck,
  CEFR_LEVELS_META,
  CEFR_LEVEL_LIST,
} from "@/lib/seedData";
import { isCardDue } from "@/lib/srs";
import LevelSelectorModal from "@/components/LevelSelectorModal";
import { getLatestAssessmentResult } from "@/lib/assessment/assessmentService";
import type { AssessmentResult } from "@/lib/assessment/types";

function getDeckIcon(iconName: string) {
  switch (iconName) {
    case "Zap":
      return Zap;
    case "Briefcase":
      return Briefcase;
    case "Plane":
      return Plane;
    case "Users":
      return Users;
    case "Terminal":
      return Terminal;
    case "FileText":
      return FileText;
    case "Award":
      return Award;
    default:
      return MessageSquare;
  }
}

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    lastStudyDate: null,
    todayReviewedCount: 0,
    isStreakActiveToday: false,
    streakStatus: "broken",
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeckForLevel, setSelectedDeckForLevel] = useState<Deck | null>(null);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [levelModalMode, setLevelModalMode] = useState<"study" | "reflex">("study");

  const [latestAssessment, setLatestAssessment] = useState<AssessmentResult | null>(null);

  function openLevelModal(deck: Deck | null, mode: "study" | "reflex" = "study") {
    setSelectedDeckForLevel(deck);
    setLevelModalMode(mode);
    setIsLevelModalOpen(true);
  }

  const syncDashboardFromLocal = useCallback(() => {
    const localData = getInitialLocalData();
    const cachedUser = getStoredUserProfile();
    setDecks(localData.decks);
    setCards(localData.cards);
    setUser(cachedUser);
    setStreak(getStreakData());
    setLatestAssessment(getLatestAssessmentResult(cachedUser?.id));
    setLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    syncDashboardFromLocal();

    const [currentUser, loadedDecks, loadedCards] = await Promise.all([
      getCurrentUser(),
      getDecks(),
      getCards(),
    ]);
    setDecks(loadedDecks);
    setCards(loadedCards);
    setUser(currentUser);
    setStreak(getStreakData());
  }, [syncDashboardFromLocal]);

  useEffect(() => {
    void loadDashboard();
    const handler = () => syncDashboardFromLocal();
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, [loadDashboard, syncDashboardFromLocal]);

  const dueCards = cards.filter((c) => isCardDue(c));
  const masteredCards = cards.filter(
    (c) => c.box >= 3 || c.interval_days >= 3
  );

  const displayName = user?.full_name || (user?.email ? user.email.split("@")[0] : null);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-7 max-w-5xl mx-auto">
      {/* ================= A. LỜI CHÀO ================= */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {displayName ? `Xin chào, ${displayName}!` : "Xin chào bạn!"}
        </h1>
        <p className="text-slate-500 text-sm md:text-base">
          {dueCards.length > 0
            ? `Hôm nay bạn có ${dueCards.length} thẻ cần ôn tập để duy trì chuỗi phản xạ.`
            : "Bạn đã hoàn thành tất cả thẻ cần ôn hôm nay. Rất tuyệt vời!"}
        </p>
      </div>

      {/* ================= B. KHU VỰC BẮT ĐẦU HỌC ================= */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-50/90 via-white to-brand-50/40 border border-brand-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2.5 max-w-xl">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Bài học hôm nay
            </h2>
            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-brand-500 text-white shadow-xs">
              {loading ? "..." : `${dueCards.length} thẻ cần ôn`}
            </span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Luyện phản xạ giao tiếp với các tình huống thực tế theo chu trình ghi nhớ.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            href="/learning-path"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Lộ trình cá nhân AI</span>
          </Link>

          <button
            type="button"
            onClick={() => openLevelModal(null, "study")}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200/90 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-700" />
            <span>Ôn thẻ tự do</span>
          </button>

          <button
            type="button"
            onClick={() => openLevelModal(null, "reflex")}
            className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-200/90 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>60s</span>
          </button>
        </div>
      </div>

      {/* ================= B. PLACEMENT TEST DIAGNOSTIC BANNER ================= */}
      {latestAssessment ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-extrabold text-sm shadow-xs">
              {latestAssessment.estimatedCefrLevel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">
                  Trình độ CEFR: Cấp độ {latestAssessment.estimatedCefrLevel} (Điểm: {latestAssessment.overallScore}/100)
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Đã đánh giá
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Khoảng trình độ: {latestAssessment.possibleLevelRange} • Khuyên học: Cấp độ {latestAssessment.recommendedLearningLevel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/placement-test"
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors shrink-0 shadow-2xs"
            >
              Kiểm tra lại
            </Link>
            <Link
              href="/learning-path"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
            >
              Vào Lộ trình &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md text-amber-300 flex items-center justify-center shrink-0 text-lg">
              🎯
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Chưa biết trình độ tiếng Anh của mình?
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">
                Làm bài kiểm tra xếp lớp 10 phút để xác định CEFR và nhận lộ trình học được may đo riêng cho bạn.
              </p>
            </div>
          </div>
          <Link
            href="/placement-test"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-900 font-extrabold text-xs transition-colors shrink-0 shadow-xs text-center"
          >
            Làm bài kiểm tra ngay &rarr;
          </Link>
        </div>
      )}

      {/* Streak Alert: At Risk */}
      {streak.streakStatus === "at_risk" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-amber-500 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Chuỗi {streak.currentStreak} ngày của bạn sắp mất!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Bạn chưa học hôm nay. Hoàn thành ít nhất 1 câu trước 24:00 để duy trì chuỗi học liên tiếp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLevelModal(null, "study")}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            Học ngay để giữ chuỗi
          </button>
        </div>
      )}

      {/* Streak Alert: Broken */}
      {streak.streakStatus === "broken" && streak.lastStudyDate && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 text-base">
              💔
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">
                Bạn đã bỏ lỡ 1 ngày và mất chuỗi học!
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                Đừng nản lòng, hãy hoàn thành 1 câu ngay để thắp lại ngọn lửa chuỗi ngày mới.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openLevelModal(null, "study")}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            Bắt đầu lại chuỗi mới
          </button>
        </div>
      )}

      {/* ================= C. THỐNG KÊ HỌC TẬP ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Số ngày học liên tiếp */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              streak.currentStreak > 0
                ? "bg-amber-50 text-amber-500"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Flame
              className={`w-6 h-6 ${
                streak.currentStreak > 0 ? "fill-amber-500" : ""
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                {streak.currentStreak}
              </p>
              {streak.streakStatus === "active_today" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Đã giữ chuỗi
                </span>
              ) : streak.streakStatus === "at_risk" ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                  ⚠️ Cần học hôm nay
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {streak.lastStudyDate ? "Đã mất chuỗi" : "Bắt đầu chuỗi"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Số ngày học liên tiếp
            </p>
          </div>
        </div>

        {/* Stat 2: Số câu đã thành thạo */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {masteredCards.length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Số câu đã thành thạo
            </p>
          </div>
        </div>

        {/* Stat 3: Số thẻ cần ôn hôm nay */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {dueCards.length}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Số thẻ cần ôn hôm nay
            </p>
          </div>
        </div>
      </div>

      {/* ================= D. DANH SÁCH CHỦ ĐỀ HỌC TẬP ================= */}
      <div className="space-y-4 pt-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Danh sách chủ đề học tập
          </h2>
          <p className="text-xs text-slate-500">
            Chọn chủ đề bạn muốn rèn luyện phản xạ hôm nay
          </p>
        </div>

        {loading && decks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-white border border-slate-200/80 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks
              .filter(
                (d) =>
                  d.is_system ||
                  (user ? d.user_id === user.id : d.user_id === "local_guest")
              )
              .map((deck) => {
              const Icon = getDeckIcon(deck.icon);
              const deckCards = cards.filter((c) => c.deck_id === deck.id);
              const deckLearned = deckCards.filter(
                (c) => c.last_practiced_at !== null || c.box > 1
              ).length;
              const total = deckCards.length;
              const progressPct =
                total > 0 ? Math.round((deckLearned / total) * 100) : 0;

              return (
                <div
                  key={deck.id}
                  onClick={() => openLevelModal(deck, "study")}
                  className="bg-white border border-slate-200/80 hover:border-brand-200 hover:shadow-sm rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base text-slate-900 leading-snug">
                        {deck.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {deck.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Tiến độ</span>
                      <span className="font-semibold text-slate-700">
                        {deckLearned}/{total} câu ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* CEFR Level Tags & Action */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 flex-wrap">
                      {CEFR_LEVEL_LIST.map((lvl) => {
                        const count = deckCards.filter((c) => (c.level || "B1") === lvl).length;
                        const meta = CEFR_LEVELS_META[lvl];
                        return (
                          <span
                            key={lvl}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                              count > 0
                                ? meta.badgeClass
                                : "bg-slate-50 text-slate-300 border-slate-100"
                            }`}
                            title={`${meta.nameVi}: ${count} câu`}
                          >
                            {lvl}
                          </span>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => openLevelModal(deck, "study")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
                    >
                      <span>Học ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CEFR Level Selector Modal */}
      <LevelSelectorModal
        isOpen={isLevelModalOpen}
        onClose={() => setIsLevelModalOpen(false)}
        deck={selectedDeckForLevel}
        cards={cards}
        targetMode={levelModalMode}
      />
    </div>
  );
}
