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
import { Card, Deck } from "@/lib/seedData";
import { isCardDue } from "@/lib/srs";

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
    default:
      return MessageSquare;
  }
}

export default function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 1,
    lastStudyDate: null,
    todayReviewedCount: 0,
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncDashboardFromLocal = useCallback(() => {
    const localData = getInitialLocalData();
    const cachedUser = getStoredUserProfile();
    setDecks(localData.decks);
    setCards(localData.cards);
    setUser(cachedUser);
    setStreak(getStreakData());
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

  const displayName = user?.full_name || "Quang Đức";

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-7 max-w-5xl mx-auto">
      {/* ================= A. LỜI CHÀO ================= */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Xin chào, {displayName}!
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
            href="/study"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Bắt đầu học</span>
          </Link>

          <Link
            href="/reflex"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm border border-slate-200/90 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Luyện phản xạ 60s</span>
          </Link>
        </div>
      </div>

      {/* ================= C. THỐNG KÊ HỌC TẬP ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Số ngày học liên tiếp */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {streak.currentStreak}
            </p>
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
            {decks.map((deck) => {
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
                  className="bg-white border border-slate-200/80 hover:border-brand-200 hover:shadow-sm rounded-2xl p-5 transition-all flex flex-col justify-between gap-4"
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
                        style={{ width: `${Math.max(progressPct, 4)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-2 flex items-center justify-end">
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white font-medium text-xs transition-colors"
                    >
                      <span>Học ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
