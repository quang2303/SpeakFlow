"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Shuffle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  Zap,
  Info,
  Check,
} from "lucide-react";
import {
  Card,
  Deck,
  CEFRLevel,
  CEFR_LEVELS_META,
  CEFR_LEVEL_LIST,
} from "@/lib/seedData";
import { getStoredUserProfile } from "@/lib/dataService";
import { promptLoginToLearn } from "./RequireAuthModal";

interface LevelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck | null;
  cards: Card[];
  targetMode?: "study" | "reflex";
  onSelectLevel?: (level: CEFRLevel | "all") => void;
}

export default function LevelSelectorModal({
  isOpen,
  onClose,
  deck,
  cards,
  targetMode = "study",
  onSelectLevel,
}: LevelSelectorModalProps) {
  const router = useRouter();
  const [emptyLevelAlert, setEmptyLevelAlert] = useState<CEFRLevel | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Compute card count per level for the chosen deck
  const relevantCards = useMemo(() => {
    if (!deck || deck.id === "all") return cards;
    return cards.filter((c) => c.deck_id === deck.id);
  }, [cards, deck]);

  const countPerLevel = useMemo(() => {
    const counts: Record<CEFRLevel, number> = {
      A1: 0,
      A2: 0,
      B1: 0,
      B2: 0,
      C1: 0,
      C2: 0,
    };
    for (const c of relevantCards) {
      const lvl = (c.level || "B1") as CEFRLevel;
      if (counts[lvl] !== undefined) {
        counts[lvl]++;
      } else {
        counts.B1++;
      }
    }
    return counts;
  }, [relevantCards]);

  const totalCards = relevantCards.length;

  if (!isOpen) return null;

  function handleStart(level: CEFRLevel | "all") {
    if (level !== "all" && countPerLevel[level] === 0) {
      setEmptyLevelAlert(level);
      return;
    }

    const activeUser = getStoredUserProfile();
    if (!activeUser) {
      onClose();
      promptLoginToLearn({
        title: targetMode === "reflex" ? "Đăng nhập để luyện phản xạ" : "Đăng nhập để bắt đầu học",
        subtitle: "Vui lòng đăng nhập tài khoản để lưu lại tiến trình học và chuỗi Streak của bạn.",
        onAuthenticated: () => {
          if (onSelectLevel) {
            onSelectLevel(level);
            return;
          }
          const deckParam = deck?.id ? encodeURIComponent(deck.id) : "all";
          const levelParam = encodeURIComponent(level);
          const basePath = targetMode === "reflex" ? "/reflex" : "/study";
          router.push(`${basePath}?deck=${deckParam}&level=${levelParam}`);
        },
      });
      return;
    }

    if (onSelectLevel) {
      onSelectLevel(level);
      onClose();
      return;
    }

    const deckParam = deck?.id ? encodeURIComponent(deck.id) : "all";
    const levelParam = encodeURIComponent(level);
    const basePath = targetMode === "reflex" ? "/reflex" : "/study";
    router.push(`${basePath}?deck=${deckParam}&level=${levelParam}`);
    onClose();
  }

  function handleFallbackMixed() {
    setEmptyLevelAlert(null);
    handleStart("all");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-selector-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-slate-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center shrink-0 shadow-xs">
              {targetMode === "reflex" ? (
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="level-selector-title"
                  className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
                >
                  {deck?.title || "Tất cả chủ đề"}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                  {totalCards} câu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn trình độ CEFR bạn muốn rèn luyện phản xạ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty Level Alert banner */}
        {emptyLevelAlert && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <p>
                Trình độ <strong>{emptyLevelAlert}</strong> hiện chưa có mẫu câu nào trong bộ này.
              </p>
              <button
                type="button"
                onClick={handleFallbackMixed}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Học chế độ Lộn xộn (Tất cả {totalCards} câu)</span>
              </button>
            </div>
          </div>
        )}

        {/* Options List */}
        <div className="p-6 space-y-3 overflow-y-auto">
          {/* OPTION 1: 🎲 Lộn xộn (Tất cả trình độ) */}
          <button
            type="button"
            onClick={() => handleStart("all")}
            className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-brand-500 via-indigo-600 to-indigo-700 hover:from-brand-600 hover:via-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/25 transition-all group relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
                  🎲
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base">
                      Lộn xộn (Tất cả trình độ)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    Trộn ngẫu nhiên câu từ A1 đến C2 mỗi lần học
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-xl">
                  {totalCards} câu
                </span>
                <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>

          {/* Divider with Label */}
          <div className="flex items-center gap-3 pt-2 pb-1">
            <div className="h-px bg-slate-200/80 flex-1" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Hoặc chọn theo khung CEFR
            </span>
            <div className="h-px bg-slate-200/80 flex-1" />
          </div>

          {/* 6 CEFR LEVEL OPTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CEFR_LEVEL_LIST.map((lvl) => {
              const meta = CEFR_LEVELS_META[lvl];
              const count = countPerLevel[lvl];
              const isDisabled = count === 0;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleStart(lvl)}
                  disabled={isDisabled}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-2.5 group relative ${
                    isDisabled
                      ? "bg-slate-50/70 border-slate-200/60 opacity-50 cursor-not-allowed"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 hover:border-brand-300 hover:shadow-xs active:scale-[0.99]"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-extrabold border shadow-2xs ${meta.badgeClass}`}
                      >
                        {meta.code}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {meta.nameVi}{" "}
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({meta.nameEn})
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {meta.descriptionVi}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                        isDisabled
                          ? "bg-slate-100 text-slate-400"
                          : "bg-slate-100 text-slate-700 group-hover:bg-brand-50 group-hover:text-brand-700"
                      }`}
                    >
                      {count} câu
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Phân loại chuẩn châu Âu A1–C2</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
