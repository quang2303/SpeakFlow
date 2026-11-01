"use client";

import { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  Layers,
  AlertCircle,
  Check,
  Loader2,
  FolderPlus,
} from "lucide-react";
import {
  addCard,
  createCustomDeck,
  getCards,
  getDecks,
  UserProfile,
} from "@/lib/dataService";
import type { Card, Deck } from "@/lib/seedData";
import type { CEFRLevel } from "@/lib/ai/types";

interface SaveToFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhraseEn?: string;
  initialSentenceEn: string;
  initialMeaningVi?: string;
  initialSentenceVi?: string;
  initialContextNote?: string;
  initialLevel?: CEFRLevel;
  currentUser: UserProfile | null;
  onCardSaved?: (card: Card) => void;
}

export default function SaveToFlashcardModal({
  isOpen,
  onClose,
  initialPhraseEn = "",
  initialSentenceEn,
  initialMeaningVi = "",
  initialSentenceVi = "",
  initialContextNote = "",
  initialLevel = "B1",
  currentUser,
  onCardSaved,
}: SaveToFlashcardModalProps) {
  const [phraseEn, setPhraseEn] = useState(initialPhraseEn);
  const [sentenceEn, setSentenceEn] = useState(initialSentenceEn);
  const [meaningVi, setMeaningVi] = useState(initialMeaningVi);
  const [sentenceVi, setSentenceVi] = useState(initialSentenceVi);
  const [contextNote, setContextNote] = useState(initialContextNote);
  const [level, setLevel] = useState<CEFRLevel>(initialLevel);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setPhraseEn(initialPhraseEn || extractCandidatePhrase(initialSentenceEn));
      setSentenceEn(initialSentenceEn);
      setMeaningVi(initialMeaningVi);
      setSentenceVi(initialSentenceVi);
      setContextNote(
        initialContextNote || "Mẫu câu thực hành qua đối thoại với AI Tutor."
      );
      setLevel(initialLevel);
      setErrorMessage(null);
      setSuccessMessage(null);
      setDuplicateWarning(null);

      // Load user decks
      getDecks().then((loadedDecks) => {
        setDecks(loadedDecks);
        // Find personal deck or first available
        const personal = loadedDecks.find((d) => !d.is_system);
        if (personal) {
          setSelectedDeckId(personal.id);
        } else if (loadedDecks.length > 0) {
          setSelectedDeckId(loadedDecks[0].id);
        }
      });
    }
  }, [
    isOpen,
    initialPhraseEn,
    initialSentenceEn,
    initialMeaningVi,
    initialSentenceVi,
    initialContextNote,
    initialLevel,
  ]);

  // Check for duplicates when sentence or selected deck changes
  useEffect(() => {
    if (!isOpen || !sentenceEn.trim()) return;
    getCards().then((all) => {
      const cleanCurrent = sentenceEn.trim().toLowerCase();
      const dup = all.find(
        (c) =>
          c.sentence_en.trim().toLowerCase() === cleanCurrent &&
          (!selectedDeckId || c.deck_id === selectedDeckId)
      );
      if (dup) {
        setDuplicateWarning(
          `Câu này đã có trong bộ thẻ ("${dup.phrase_en}"). Bạn vẫn có thể lưu nếu muốn.`
        );
      } else {
        setDuplicateWarning(null);
      }
    });
  }, [sentenceEn, selectedDeckId, isOpen]);

  function extractCandidatePhrase(sentence: string): string {
    const trimmed = sentence.trim();
    if (!trimmed) return "";
    const words = trimmed.split(/\s+/);
    if (words.length <= 4) return trimmed;
    return words.slice(0, 3).join(" ");
  }

  async function handleCreateQuickDeck() {
    if (!newDeckTitle.trim()) return;
    try {
      setIsLoading(true);
      const created = await createCustomDeck({
        title: newDeckTitle.trim(),
        description: "Bộ thẻ ghi chép từ các phiên hội thoại với AI Tutor",
        icon: "Bot",
      });
      setDecks((prev) => [created, ...prev]);
      setSelectedDeckId(created.id);
      setIsCreatingDeck(false);
      setNewDeckTitle("");
    } catch {
      setErrorMessage("Không thể tạo bộ thẻ mới. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveCard() {
    setErrorMessage(null);
    if (!sentenceEn.trim()) {
      setErrorMessage("Vui lòng nhập câu tiếng Anh.");
      return;
    }
    if (!phraseEn.trim()) {
      setErrorMessage("Vui lòng nhập cụm từ trọng tâm.");
      return;
    }
    if (!selectedDeckId) {
      setErrorMessage("Vui lòng chọn hoặc tạo bộ thẻ đích.");
      return;
    }

    try {
      setIsLoading(true);
      const savedCard = await addCard({
        deck_id: selectedDeckId,
        phrase_en: phraseEn.trim(),
        sentence_en: sentenceEn.trim(),
        ipa: "",
        meaning_vi: meaningVi.trim() || phraseEn.trim(),
        sentence_vi: sentenceVi.trim() || meaningVi.trim() || sentenceEn.trim(),
        context_note: contextNote.trim(),
        variations: [],
        level,
      });

      setSuccessMessage("Đã lưu thẻ vào bộ nhớ thành công!");
      onCardSaved?.(savedCard);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi lưu thẻ Flashcard.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Thêm vào Flashcard SRS
              </h2>
              <p className="text-xs text-slate-500">
                Lưu vào hệ thống 5 Hộp ghi nhớ để ôn tập hàng ngày
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

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{duplicateWarning}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Deck Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Lưu vào bộ thẻ (Deck):
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingDeck(!isCreatingDeck)}
                className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                {isCreatingDeck ? "Hủy" : "+ Tạo bộ mới"}
              </button>
            </div>

            {isCreatingDeck ? (
              <div className="flex gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  placeholder="Tên bộ thẻ mới (VD: Hội thoại công sở)"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={handleCreateQuickDeck}
                  disabled={isLoading || !newDeckTitle.trim()}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs"
                >
                  Tạo
                </button>
              </div>
            ) : (
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              >
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.is_system ? "📂 [Mẫu] " : "📁 "}
                    {deck.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Phrase */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Cụm từ trọng tâm (Key phrase):
            </label>
            <input
              type="text"
              value={phraseEn}
              onChange={(e) => setPhraseEn(e.target.value)}
              placeholder="VD: right on track, could I get..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Full Sentence EN */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Câu giao tiếp tiếng Anh hoàn chỉnh:
            </label>
            <textarea
              rows={2}
              value={sentenceEn}
              onChange={(e) => setSentenceEn(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Sentence VI */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nghĩa tiếng Việt của câu:
            </label>
            <input
              type="text"
              value={sentenceVi}
              onChange={(e) => setSentenceVi(e.target.value)}
              placeholder="Nghĩa tự nhiên của câu..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Level & Context */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Trình độ CEFR:
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CEFRLevel)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              >
                <option value="A1">A1 - Beginner</option>
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper-Intermediate</option>
                <option value="C1">C1 - Advanced</option>
                <option value="C2">C2 - Proficient</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ghi chú ngữ cảnh:
              </label>
              <input
                type="text"
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="VD: Dùng khi gọi món lịch sự..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSaveCard}
            disabled={isLoading || Boolean(successMessage)}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Lưu vào SRS Flashcard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
