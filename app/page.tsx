"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  getCards,
  getDecks,
  getStreakData,
  getActiveStorageMode,
  StreakData,
  StorageMode,
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
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const [loadedDecks, loadedCards] = await Promise.all([
        getDecks(),
        getCards(),
      ]);
      setDecks(loadedDecks);
      setCards(loadedCards);
      setStreak(getStreakData());
      setStorageMode(getActiveStorageMode());
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const dueCards = cards.filter((c) => isCardDue(c));
  const masteredCards = cards.filter(
    (c) => c.box >= 3 || c.interval_days >= 3
  );
  const practicedCards = cards.filter(
    (c) => c.last_practiced_at !== null || c.box > 1
  );

  return (
    <div className="px-4 pt-5 pb-8 space-y-6">
      {/* Top Bar: Brand + Storage Status */}
      <div className="flex items-center justify-between">
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

        <Link
          href="/manage"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            storageMode === "supabase"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
          }`}
        >
          {storageMode === "supabase" ? (
            <>
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Supabase Cloud</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3 h-3 text-amber-400" />
              <span>Local Mode</span>
            </>
          )}
        </Link>
      </div>

      {/* Stats Row: Daily Streak & Phrases Mastered */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400/25" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">
                {streak.currentStreak}
              </span>
              <span className="text-xs text-amber-300 font-medium">ngày</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chuỗi học • Hôm nay: {streak.todayReviewedCount} thẻ
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">
                {masteredCards.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {cards.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cụm phản xạ thành thạo
            </p>
          </div>
        </div>
      </div>

      {/* Motivational Micro-Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-sky-950/80 border border-indigo-500/25 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
        <p className="text-xs text-slate-200 leading-relaxed">
          <span className="font-semibold text-sky-300">Mẹo phản xạ:</span> Đừng
          dịch từng từ! Hãy đọc to cả cụm câu để cơ miệng nhớ tự động.
        </p>
      </div>

      {/* Primary CTA Card: Bắt đầu Phiên học 5 Phút (Due Today) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-indigo-800 p-5 shadow-xl shadow-indigo-950/60 border border-sky-400/30">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 text-white backdrop-blur-md">
              <Clock className="w-3.5 h-3.5 text-sky-200" />
              Spaced Repetition (SM-2)
            </span>
            <span className="text-xs font-semibold text-sky-100 bg-slate-950/40 px-2.5 py-1 rounded-full border border-white/10">
              {loading ? "..." : `${dueCards.length} thẻ cần ôn`}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
              Bắt đầu Phiên học 5 Phút (Due Today)
            </h2>
            <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">
              Nhìn tình huống tiếng Việt → Phản xạ nói câu tiếng Anh → Chấm điểm
              phát âm trực tiếp bằng AI Voice.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <Link
              href="/study"
              className="flex-1 bg-white text-slate-950 hover:bg-sky-50 active:scale-[0.98] transition-all font-bold text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Học ngay ({dueCards.length} thẻ)</span>
            </Link>

            <Link
              href="/reflex"
              className="bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/20 active:scale-[0.98] transition-all font-semibold text-xs py-3 px-3.5 rounded-2xl flex items-center justify-center gap-1.5"
              title="Thử thách phản xạ 60 giây"
            >
              <Mic className="w-4 h-4 text-amber-300" />
              <span>60s Drill</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Chủ đề Giao tiếp Thực chiến
            </h3>
            <p className="text-xs text-slate-400">
              Đã luyện {practicedCards.length}/{cards.length} mẫu câu trong{" "}
              {decks.length} chủ đề
            </p>
          </div>
          <Link
            href="/manage"
            className="text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            + Thêm câu
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
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
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 rounded-2xl p-4 transition-all space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white leading-snug">
                          {deck.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {deck.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
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
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(progressPct, 4)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      Luyện Active Recall & Shadowing
                    </span>
                    <Link
                      href={`/study?deck=${deck.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <span>Luyện chủ đề này</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
