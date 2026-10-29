"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Trophy,
  Sparkles,
  Play,
  Zap,
  Briefcase,
  Plane,
  Users,
  MessageSquare,
  ChevronRight,
  Clock,
  Database,
  HardDrive,
  Mic,
  CheckCircle2,
  Cloud,
  X,
} from "lucide-react";
import {
  consumeJustLoggedInFlag,
  getCards,
  getDecks,
  getInitialLocalData,
  getStreakData,
  getActiveStorageMode,
  getCurrentUser,
  getStoredUserProfile,
  StreakData,
  StorageMode,
  UserProfile,
} from "@/lib/dataService";
import { Card, Deck } from "@/lib/seedData";
import { isCardDue } from "@/lib/srs";
import AuthUserTrigger, { UserAvatar } from "@/components/AuthModal";

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
  const [storageMode, setStorageMode] = useState<StorageMode>("supabase");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [justLoggedInBanner, setJustLoggedInBanner] = useState(false);

  const syncDashboardFromLocal = useCallback(() => {
    const localData = getInitialLocalData();
    const cachedUser = getStoredUserProfile();
    setDecks(localData.decks);
    setCards(localData.cards);
    setUser(cachedUser);
    setStreak(getStreakData());
    setStorageMode(getActiveStorageMode());
    if (consumeJustLoggedInFlag()) {
      setJustLoggedInBanner(true);
    }
    setLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    // 1. Hydrate immediately from local seed / cached profile so UI never hangs or shows 0 cards
    syncDashboardFromLocal();

    // 2. Fetch fresh session & cloud progress in background once on mount
    const [currentUser, loadedDecks, loadedCards] = await Promise.all([
      getCurrentUser(),
      getDecks(),
      getCards(),
    ]);
    setDecks(loadedDecks);
    setCards(loadedCards);
    setUser(currentUser);
    setStreak(getStreakData());
    setStorageMode(getActiveStorageMode());
    if (consumeJustLoggedInFlag()) {
      setJustLoggedInBanner(true);
    }
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
  const practicedCards = cards.filter(
    (c) => c.last_practiced_at !== null || c.box > 1
  );

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-8 space-y-6 md:space-y-7">
      {/* Celebratory Banner right after Google OAuth Login */}
      {user && justLoggedInBanner && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-sky-500/15 border border-emerald-500/40 p-4 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              user={user}
              sizeClass="w-10 h-10 rounded-xl text-xs"
              showOnlineDot
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Đăng nhập Google thành công!
                </span>
                <span className="text-xs font-bold text-white truncate">
                  {user.full_name} ({user.email})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tiến trình học, lịch ôn SM-2 và chuỗi Streak của bạn đã được kết
                nối & đồng bộ tự động trên Supabase Cloud.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setJustLoggedInBanner(false)}
            className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white shrink-0"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar (Mobile: Brand + Auth, Desktop: Welcome Header + Logged-in User Chip + Cloud Status) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between gap-2.5 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-sky-400 fill-sky-400/20" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                SpeakFlow
              </h1>
              <p className="text-[11px] text-slate-400">
                Phản xạ giao tiếp tiếng Anh
              </p>
            </div>
          </div>

          <AuthUserTrigger compact />
        </div>

        {/* Desktop Greeting Header */}
        <div className="hidden md:block space-y-1.5">
          {user ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>TÀI KHOẢN GOOGLE ĐÃ ĐĂNG NHẬP • ĐỒNG BỘ CLOUD TỰ ĐỘNG</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <span>CHẾ ĐỘ KHÁCH • CHƯA ĐĂNG NHẬP GOOGLE</span>
            </div>
          )}

          <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {user
              ? `Xin chào, ${user.full_name}! 👋`
              : "Bảng Điều Khiển Luyện Phản Xạ"}
          </h1>
          <p className="text-sm text-slate-400">
            {user ? (
              <>
                Đang đăng nhập với{" "}
                <strong className="text-sky-300">{user.email}</strong> • Đã lưu{" "}
                <strong className="text-emerald-300">
                  {practicedCards.length}/{cards.length} câu
                </strong>{" "}
                trên đám mây.
              </>
            ) : (
              "Bấm 'Đăng nhập Google' ở góc trên trái hoặc góc trên phải để lưu lịch ôn tập SM-2 xuyên suốt PC & Điện thoại."
            )}
          </p>
        </div>

        {/* Top-Right Status & Account Area */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <AuthUserTrigger compact />

          <Link
            href="/manage"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-colors ${
              storageMode === "supabase"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
          >
            {storageMode === "supabase" ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase Cloud</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>Local Mode</span>
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Desktop 12-Col Hero Grid / Mobile Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Primary CTA Card: Bắt đầu Phiên học 5 Phút (Due Today) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-indigo-800 p-5 md:p-7 shadow-xl shadow-indigo-950/60 border border-sky-400/30 flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-md">
                <Clock className="w-3.5 h-3.5 text-sky-200" />
                Spaced Repetition (SM-2)
              </span>
              <span className="text-xs font-semibold text-sky-100 bg-slate-950/40 px-3 py-1 rounded-full border border-white/10">
                {loading ? "..." : `${dueCards.length} thẻ cần ôn hôm nay`}
              </span>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug">
                Bắt đầu Phiên học 5 Phút (Due Today)
              </h2>
              <p className="text-xs md:text-sm text-sky-100/90 mt-1.5 leading-relaxed max-w-xl">
                Nhìn tình huống tiếng Việt → Phản xạ nói câu tiếng Anh → Chấm
                điểm phát âm trực tiếp bằng AI Voice (hỗ trợ phím tắt nhanh trên
                PC).
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-3 pt-5">
            <Link
              href="/study"
              className="flex-1 bg-white text-slate-950 hover:bg-sky-50 active:scale-[0.98] transition-all font-bold text-sm py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Học ngay ({dueCards.length} thẻ)</span>
            </Link>

            <Link
              href="/reflex"
              className="bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/20 active:scale-[0.98] transition-all font-semibold text-xs md:text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2"
              title="Thử thách phản xạ 60 giây"
            >
              <Mic className="w-4 h-4 text-amber-300" />
              <span>Phản xạ 60s</span>
            </Link>
          </div>
        </div>

        {/* Right 5 Cols: Stats Cards + Motivational Tip */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
          <div className="grid grid-cols-2 gap-3.5 flex-1">
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Flame className="w-6 h-6 text-amber-400 fill-amber-400/25" />
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-extrabold text-white">
                    {streak.currentStreak}
                  </span>
                  <span className="text-xs text-amber-300 font-semibold">
                    ngày liên tiếp
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hôm nay đã ôn: {streak.todayReviewedCount} thẻ
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-extrabold text-white">
                    {masteredCards.length}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    / {cards.length} câu
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cụm phản xạ thành thạo
                </p>
              </div>
            </div>
          </div>

          {/* Motivational Micro-Banner */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-sky-950/80 border border-indigo-500/25 rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
            <p className="text-xs text-slate-200 leading-relaxed">
              <span className="font-semibold text-sky-300">
                Phương pháp Chunking:
              </span>{" "}
              Đừng dịch từng từ! Hãy đọc to cả cụm câu để cơ miệng nhớ tự động.
            </p>
          </div>
        </div>
      </div>

      {/* Decks Grid (1 Col on Mobile, 2 Cols on Desktop PC) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base md:text-lg font-bold text-white">
              Chủ đề Giao tiếp Thực chiến
            </h3>
            <p className="text-xs text-slate-400">
              Đã luyện {practicedCards.length}/{cards.length} mẫu câu trong{" "}
              {decks.length} chủ đề
            </p>
          </div>
          <Link
            href="/manage"
            className="text-xs md:text-sm font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/25 px-3.5 py-1.5 rounded-xl"
          >
            + Thêm mẫu câu mới
          </Link>
        </div>

        {loading && decks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.map((deck) => {
              const Icon = getDeckIcon(deck.icon);
              const deckCards = cards.filter((c) => c.deck_id === deck.id);
              const deckDue = deckCards.filter((c) => isCardDue(c)).length;
              const deckLearned = deckCards.filter(
                (c) => c.last_practiced_at !== null || c.box > 1
              ).length;
              const total = deckCards.length;
              const progressPct =
                total > 0 ? Math.round((deckLearned / total) * 100) : 0;

              return (
                <div
                  key={deck.id}
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-3xl p-5 transition-all flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white leading-snug">
                        {deck.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {deck.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Tiến độ:{" "}
                        <strong className="text-slate-200">
                          {deckLearned}/{total} câu
                        </strong>{" "}
                        ({progressPct}%)
                      </span>
                      <span
                        className={
                          deckDue > 0
                            ? "text-amber-400 font-semibold"
                            : "text-emerald-400 font-medium"
                        }
                      >
                        {deckDue > 0
                          ? `${deckDue} thẻ đến hạn`
                          : "Đã hoàn thành hôm nay"}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(progressPct, 4)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
                    <span className="text-xs text-slate-400">
                      Active Recall & Shadowing
                    </span>
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-3.5 py-2 rounded-xl transition-colors"
                    >
                      <span>Luyện chủ đề này</span>
                      <ChevronRight className="w-4 h-4" />
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
