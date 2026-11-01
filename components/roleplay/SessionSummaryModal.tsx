"use client";

import { useState } from "react";
import {
  X,
  Award,
  Clock,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Plus,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { SessionSummary } from "@/lib/ai/types";
import { addCard, getCards, getDecks, UserProfile } from "@/lib/dataService";

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SessionSummary | null;
  currentUser: UserProfile | null;
  onStartNewSession: () => void;
}

export default function SessionSummaryModal({
  isOpen,
  onClose,
  summary,
  currentUser,
  onStartNewSession,
}: SessionSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "grammar" | "vocabulary" | "recommendations"
  >("overview");
  const [addedCardIndices, setAddedCardIndices] = useState<Set<number>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);

  if (!isOpen || !summary) return null;

  const minutes = Math.floor(summary.durationSeconds / 60);
  const seconds = summary.durationSeconds % 60;
  const durationStr = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;

  async function handleAddSingleCard(idx: number) {
    if (!summary || addedCardIndices.has(idx)) return;
    const cardData = summary.keyTakeawayCards[idx];
    if (!cardData) return;

    try {
      const decks = await getDecks();
      const targetDeck = decks.find((d) => !d.is_system) || decks[0];
      if (!targetDeck) return;

      await addCard({
        deck_id: targetDeck.id,
        phrase_en: cardData.phraseEn,
        sentence_en: cardData.sentenceEn,
        ipa: "",
        meaning_vi: cardData.meaningVi,
        sentence_vi: cardData.sentenceVi,
        context_note: cardData.contextNote,
        variations: [],
        level: cardData.level,
      });

      setAddedCardIndices((prev) => {
        const next = new Set(prev);
        next.add(idx);
        return next;
      });
    } catch {
      // ignore
    }
  }

  async function handleAddAllCards() {
    if (!summary || !summary.keyTakeawayCards.length) return;
    setIsAddingAll(true);
    try {
      const decks = await getDecks();
      const targetDeck = decks.find((d) => !d.is_system) || decks[0];
      if (!targetDeck) return;

      const allExisting = await getCards();
      const existingSentences = new Set(
        allExisting.map((c) => c.sentence_en.trim().toLowerCase())
      );

      const toAdd = summary.keyTakeawayCards.map((c, i) => ({ card: c, idx: i }));
      for (const item of toAdd) {
        if (!existingSentences.has(item.card.sentenceEn.trim().toLowerCase())) {
          await addCard({
            deck_id: targetDeck.id,
            phrase_en: item.card.phraseEn,
            sentence_en: item.card.sentenceEn,
            ipa: "",
            meaning_vi: item.card.meaningVi,
            sentence_vi: item.card.sentenceVi,
            context_note: item.card.contextNote,
            variations: [],
            level: item.card.level,
          });
          setAddedCardIndices((prev) => {
            const next = new Set(prev);
            next.add(item.idx);
            return next;
          });
        } else {
          setAddedCardIndices((prev) => {
            const next = new Set(prev);
            next.add(item.idx);
            return next;
          });
        }
      }
    } finally {
      setIsAddingAll(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Tổng kết buổi học AI Tutor
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                  {summary.cefrLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chủ đề: <strong className="text-slate-800">{summary.topic}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 shrink-0 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-brand-600" />
              <span>Thời lượng</span>
            </div>
            <p className="text-base font-bold text-slate-900 mt-1">{durationStr}</p>
          </div>
          <div className="border-x border-slate-200">
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Lượt đối đáp</span>
            </div>
            <p className="text-base font-bold text-slate-900 mt-1">
              {summary.turnsCount} câu
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-500 text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-brand-600" />
              <span>Hoàn thành</span>
            </div>
            <p className="text-base font-bold text-emerald-600 mt-1">
              {summary.accomplishmentScore}%
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 text-xs font-semibold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("grammar")}
            className={`px-3 py-2 border-b-2 transition-all ${
              activeTab === "grammar"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Sửa lỗi ngữ pháp ({summary.grammarFeedback.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vocabulary")}
            className={`px-3 py-2 border-b-2 transition-all ${
              activeTab === "vocabulary"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Từ vựng & Cụm từ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommendations")}
            className={`px-3 py-2 border-b-2 transition-all ${
              activeTab === "recommendations"
                ? "border-brand-600 text-brand-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Lộ trình tiếp theo
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Strengths */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Điểm mạnh của bạn:
                </span>
                <ul className="space-y-1.5 text-slate-700 pl-1">
                  {summary.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas for improvement */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Điểm cần chú ý cải thiện:
                </span>
                <ul className="space-y-1.5 text-slate-700 pl-1">
                  {summary.areasForImprovement.map((a, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key takeaways to Flashcards preview */}
              {summary.keyTakeawayCards.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-600" />
                      Mẫu câu quan trọng nên đưa vào SRS Flashcard ({summary.keyTakeawayCards.length}):
                    </span>
                    <button
                      type="button"
                      onClick={handleAddAllCards}
                      disabled={isAddingAll || addedCardIndices.size === summary.keyTakeawayCards.length}
                      className="px-3 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold text-[11px] flex items-center gap-1"
                    >
                      {addedCardIndices.size === summary.keyTakeawayCards.length ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Đã thêm tất cả
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Thêm tất cả vào Flashcard
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {summary.keyTakeawayCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs">
                            &ldquo;{card.sentenceEn}&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {card.sentenceVi || card.meaningVi}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSingleCard(idx)}
                          disabled={addedCardIndices.has(idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border shrink-0 transition-colors ${
                            addedCardIndices.has(idx)
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-white hover:bg-brand-50 text-brand-700 border-slate-200 hover:border-brand-300"
                          }`}
                        >
                          {addedCardIndices.has(idx) ? (
                            <span className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Đã lưu
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Plus className="w-3 h-3" />
                              Lưu thẻ
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "grammar" && (
            <div className="space-y-3">
              {summary.grammarFeedback.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Không có lỗi ngữ pháp đáng kể!</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Bạn đã sử dụng ngữ pháp rất chuẩn xác trong suốt buổi học.
                  </p>
                </div>
              ) : (
                summary.grammarFeedback.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider border border-rose-200">
                        {item.errorType || "Ngữ pháp"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500 line-through">
                        Câu bạn nói: &ldquo;{item.original}&rdquo;
                      </p>
                      <p className="font-bold text-emerald-700">
                        Nên nói là: &ldquo;{item.corrected}&rdquo;
                      </p>
                    </div>
                    {item.explanationVi && (
                      <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed">
                        💡 <strong>Giải thích:</strong> {item.explanationVi}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "vocabulary" && (
            <div className="space-y-4">
              {summary.vocabularyFeedback.usedWell.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 text-xs">
                    🌟 Từ vựng bạn đã sử dụng tốt:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.vocabularyFeedback.usedWell.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.vocabularyFeedback.recommended.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-700 text-xs">
                    📖 Từ vựng & cụm từ nên học thêm cho tình huống này:
                  </span>
                  <div className="space-y-2">
                    {summary.vocabularyFeedback.recommended.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-indigo-950 font-bold">
                            {item.wordOrPhrase}
                          </strong>
                          <span className="text-slate-600 text-[11px]">
                            {item.meaningVi}
                          </span>
                        </div>
                        {item.example && (
                          <p className="text-slate-500 italic text-[11px]">
                            VD: &ldquo;{item.example}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "recommendations" && (
            <div className="space-y-3">
              <div className="p-4 bg-brand-50/60 border border-brand-200 rounded-2xl space-y-2">
                <span className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-brand-600" />
                  Kế hoạch luyện tập khuyến nghị:
                </span>
                <ul className="space-y-2 text-slate-700 pl-1">
                  {summary.nextRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Ôn tập Spaced Repetition (SRS):
                </span>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Các thẻ được bạn lưu trong buổi học này đã được xếp vào <strong>Hộp 1</strong> và sẽ đến hạn ôn tập trong phiên học tiếp theo. Hãy duy trì chuỗi học liên tiếp (Streak) hàng ngày để nhớ lâu nhất!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
          >
            Đóng bảng điểm
          </button>
          <button
            type="button"
            onClick={onStartNewSession}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Luyện tập tình huống khác</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
