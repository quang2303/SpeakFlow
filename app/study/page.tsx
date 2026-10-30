"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  Turtle,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Lightbulb,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Check,
  Sparkles,
  ArrowLeft,
  Layers,
  Award,
  RefreshCw,
  Flame,
  Keyboard,
} from "lucide-react";
import {
  getCards,
  getDecks,
  getInitialLocalData,
  getStoredUserProfile,
  logStudyActivity,
  submitCardReview,
  UserProfile,
} from "@/lib/dataService";
import AccountLockScreen from "@/components/AccountLockScreen";
import { Card, Deck } from "@/lib/seedData";
import {
  generateFirstLetterHint,
  getRatingPreviewLabel,
  isCardDue,
  SRSRating,
} from "@/lib/srs";
import {
  evaluatePronunciation,
  MicVisualState,
  PronunciationEvaluationResult,
  speakEnglish,
  speakText,
  SpeechRecognizerController,
  startSpeechRecognition,
  WordEvaluation,
} from "@/lib/speech";

/**
 * Helper to highlight the core phrase inside the full English sentence
 */
function renderHighlightedSentence(sentence: string, phrase: string) {
  if (!phrase) return sentence;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = sentence.split(regex);

  if (parts.length === 1) {
    const phraseWords = new Set(
      phrase
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
    return sentence.split(" ").map((word, idx) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, "");
      const isCore = phraseWords.has(clean);
      return (
        <span
          key={idx}
          className={
            isCore
              ? "text-brand-600 underline decoration-brand-400 decoration-2 underline-offset-4 font-bold"
              : ""
          }
        >
          {word}{" "}
        </span>
      );
    });
  }

  return parts.map((part, i) =>
    part.toLowerCase() === phrase.toLowerCase() ? (
      <span
        key={i}
        className="text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 font-bold"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/**
 * Reusable Interactive Word-by-Word Pronunciation Breakdown Panel
 */
function PronunciationFeedbackPanel({
  evaluation,
  isLive,
  onRetry,
}: {
  evaluation: PronunciationEvaluationResult;
  isLive: boolean;
  onRetry: () => void;
}) {
  const [activeSpokenWordIdx, setActiveSpokenWordIdx] = useState<number | null>(
    null
  );

  function handleTapWord(word: WordEvaluation, idx: number) {
    setActiveSpokenWordIdx(idx);
    speakText(word.cleanWord || word.originalWord, 0.7, () => {
      setActiveSpokenWordIdx((prev) => (prev === idx ? null : prev));
    });
  }

  return (
    <div
      className={`rounded-2xl p-4 border space-y-3 transition-colors ${
        isLive
          ? "bg-brand-50/70 border-brand-200"
          : evaluation.score >= 85
          ? "bg-emerald-50 border-emerald-200"
          : evaluation.score >= 60
          ? "bg-amber-50 border-amber-200"
          : "bg-rose-50 border-rose-200"
      }`}
    >
      {/* Summary Score Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
              isLive
                ? "bg-brand-100 text-brand-700 border-brand-300"
                : evaluation.score >= 85
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : evaluation.score >= 60
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-rose-100 text-rose-800 border-rose-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              Đúng {evaluation.correctCount}/{evaluation.totalCount} từ (
              {evaluation.score}%)
            </span>
          </span>
          {isLive && (
            <span className="text-xs font-medium text-brand-600 animate-pulse">
              • Đang nhận diện...
            </span>
          )}
        </div>

        {!isLive && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đọc lại</span>
          </button>
        )}
      </div>

      {!isLive && (
        <p className="text-xs text-slate-600 font-medium">
          {evaluation.feedback}
        </p>
      )}

      {/* Interactive Word Badges */}
      <div className="flex flex-wrap items-start gap-2 pt-1">
        {evaluation.words.map((word, idx) => {
          const isCorrect = word.status === "correct";
          const isSpeakingThis = activeSpokenWordIdx === idx;

          return (
            <div key={idx} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleTapWord(word, idx)}
                title={`Chạm để nghe phát âm mẫu từ "${word.cleanWord}"`}
                className={`group relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all active:scale-95 ${
                  isCorrect
                    ? "text-emerald-700 bg-white border border-emerald-300 shadow-xs hover:bg-emerald-50"
                    : "text-rose-700 bg-white border border-rose-300 underline decoration-rose-500 decoration-wavy hover:bg-rose-50"
                } ${isSpeakingThis ? "ring-2 ring-brand-500 scale-105" : ""}`}
              >
                {isCorrect ? (
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <Volume2 className="w-3 h-3 text-rose-500 shrink-0" />
                )}
                <span>{word.originalWord}</span>
              </button>

              {!isCorrect && word.spokenAs && (
                <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-100/90 border border-rose-200 text-[10px] font-medium text-rose-800 leading-tight">
                  Nghe thành: &ldquo;{word.spokenAs}&rdquo;
                </span>
              )}

              {!isCorrect && !word.spokenAs && !isLive && (
                <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-50 text-[10px] font-medium text-rose-700 leading-tight">
                  Bị bỏ sót
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudySessionContent() {
  const searchParams = useSearchParams();
  const initialDeckParam = searchParams.get("deck") || "all";

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(initialDeckParam);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Audio & Speech Recognition states
  const [playingSpeed, setPlayingSpeed] = useState<"normal" | "slow" | null>(null);
  const [micState, setMicState] = useState<MicVisualState>("idle");
  const [transcript, setTranscript] = useState("");
  const [liveEvaluation, setLiveEvaluation] =
    useState<PronunciationEvaluationResult | null>(null);
  const [speechResult, setSpeechResult] =
    useState<PronunciationEvaluationResult | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognizerRef = useRef<SpeechRecognizerController | null>(null);

  const resetSpeechState = useCallback(() => {
    recognizerRef.current?.stop();
    setMicState("idle");
    setTranscript("");
    setLiveEvaluation(null);
    setSpeechResult(null);
    setSpeechError(null);
  }, []);

  const loadStudyCards = useCallback(async () => {
    setLoading(true);
    const [allDecks, fetchedCards] = await Promise.all([
      getDecks(),
      getCards(selectedDeckId === "all" ? undefined : selectedDeckId),
    ]);
    setDecks(allDecks);

    const due = fetchedCards.filter((c) => isCardDue(c));
    const queue = due.length > 0 ? due : fetchedCards;

    setStudyQueue(queue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionFinished(false);
    resetSpeechState();
    setLoading(false);
  }, [selectedDeckId, resetSpeechState]);

  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    setCurrentUser(getStoredUserProfile());
    void loadStudyCards();
    const handler = () => {
      setCurrentUser(getStoredUserProfile());
      const local = getInitialLocalData();
      setDecks(local.decks);
      const filtered =
        selectedDeckId === "all"
          ? local.cards
          : local.cards.filter((c) => c.deck_id === selectedDeckId);
      const due = filtered.filter((c) => isCardDue(c));
      setStudyQueue(due.length > 0 ? due : filtered);
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, [loadStudyCards, selectedDeckId]);

  const currentCard = studyQueue[currentIndex];
  const currentDeck = decks.find((d) => d.id === currentCard?.deck_id);

  const handleFlip = useCallback(() => {
    if (!currentCard) return;
    setIsFlipped((prev) => {
      const nextFlip = !prev;
      if (nextFlip) {
        setPlayingSpeed("normal");
        speakEnglish(currentCard.sentence_en, 1.0, () => setPlayingSpeed(null));
      }
      return nextFlip;
    });
  }, [currentCard]);

  const handlePlayAudio = useCallback(
    (rate: number, mode: "normal" | "slow") => {
      if (!currentCard) return;
      setPlayingSpeed(mode);
      speakEnglish(currentCard.sentence_en, rate, () => setPlayingSpeed(null));
    },
    [currentCard]
  );

  const startShadowingSession = useCallback(() => {
    if (!currentCard) return;

    setPlayingSpeed(null);
    setSpeechError(null);
    setTranscript("");
    setLiveEvaluation(null);
    setSpeechResult(null);
    setMicState("listening");

    const controller = startSpeechRecognition({
      onStateChange: (nextState) => {
        setMicState(nextState);
      },
      onInterimResult: (liveText) => {
        setTranscript(liveText);
        const interimEval = evaluatePronunciation(
          currentCard.sentence_en,
          liveText
        );
        setLiveEvaluation(interimEval);
      },
      onFinalResult: (finalText) => {
        setMicState("processing");
        setTranscript(finalText);
        const evaluation = evaluatePronunciation(
          currentCard.sentence_en,
          finalText
        );
        setLiveEvaluation(null);
        setSpeechResult(evaluation);
        setMicState("idle");

        const redWords = evaluation.words
          .filter((w) => w.status !== "correct")
          .map((w) => w.cleanWord || w.originalWord);

        void logStudyActivity({
          mode: "shadowing",
          card_id: currentCard.id,
          phrase_en: currentCard.phrase_en,
          sentence_en: currentCard.sentence_en,
          spoken_text: finalText,
          score: evaluation.score,
          mispronounced_words: redWords,
        });
      },
      onError: (errorMsg) => {
        setSpeechError(errorMsg);
        setMicState("error");
      },
      onEnd: () => {
        setMicState((prev) => (prev === "error" ? "error" : "idle"));
      },
    });

    recognizerRef.current = controller;
  }, [currentCard]);

  const handleToggleShadowing = useCallback(() => {
    if (micState === "listening") {
      recognizerRef.current?.stop();
    } else {
      startShadowingSession();
    }
  }, [micState, startShadowingSession]);

  const handleRateCard = useCallback(
    async (rating: SRSRating) => {
      if (!currentCard) return;

      resetSpeechState();

      await submitCardReview(currentCard, rating);
      setReviewedCount((prev) => prev + 1);

      if (speechResult) {
        const redWords = speechResult.words
          .filter((w) => w.status !== "correct")
          .map((w) => w.cleanWord || w.originalWord);

        void logStudyActivity({
          mode: "study",
          card_id: currentCard.id,
          phrase_en: currentCard.phrase_en,
          sentence_en: currentCard.sentence_en,
          spoken_text: transcript,
          score: speechResult.score,
          rating,
          mispronounced_words: redWords,
        });
      }

      if (currentIndex + 1 < studyQueue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        setShowHint(false);
      } else {
        setSessionFinished(true);
      }
    },
    [
      currentCard,
      currentIndex,
      resetSpeechState,
      speechResult,
      studyQueue.length,
      transcript,
    ]
  );

  // Keyboard Shortcuts (Space, M, R, S, H, 1-4)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (!sessionFinished) {
          handleFlip();
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        handleToggleShadowing();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handlePlayAudio(1.0, "normal");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handlePlayAudio(0.75, "slow");
      } else if (e.key === "h" || e.key === "H") {
        setShowHint(true);
      } else if (isFlipped) {
        if (e.key === "1") handleRateCard("again");
        if (e.key === "2") handleRateCard("hard");
        if (e.key === "3") handleRateCard("good");
        if (e.key === "4") handleRateCard("easy");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    currentCard,
    handleFlip,
    handlePlayAudio,
    handleRateCard,
    handleToggleShadowing,
    isFlipped,
    sessionFinished,
  ]);

  function handleRestartSession() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionFinished(false);
    setReviewedCount(0);
    resetSpeechState();
  }

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  if (loading) {
    return (
      <div className="px-4 md:px-8 pt-6 space-y-4 max-w-5xl mx-auto">
        <div className="h-10 w-64 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-white rounded-3xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (sessionFinished || !currentCard) {
    return (
      <div className="px-4 md:px-8 pt-10 pb-8 max-w-xl mx-auto flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <Award className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900">
            Hoàn thành phiên học!
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Bạn đã ôn tập xong{" "}
            <strong className="text-emerald-600 font-semibold">{reviewedCount} mẫu câu</strong>{" "}
            hôm nay. Tiến trình đã được cập nhật tự động.
          </p>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
          <p className="text-xs sm:text-sm text-slate-600">
            Muốn thử thách tốc độ phản xạ trong 60 giây?
          </p>
          <Link
            href="/reflex"
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Flame className="w-4 h-4 fill-white" />
            <span>Thử thách Phản xạ 60s</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleRestartSession}
            className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ôn lại bộ này</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalCards = studyQueue.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalCards) * 100);
  const activeEval = speechResult || liveEvaluation;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Bar: Back + Deck Filter + Counter */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors"
          title="Quay lại Trang chủ"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 max-w-md">
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            aria-label="Chọn bộ chủ đề"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-brand-500 shadow-xs truncate"
          >
            <option value="all">Tất cả chủ đề ({totalCards} thẻ)</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-brand-50 border border-brand-100 text-xs sm:text-sm font-bold text-brand-700 shrink-0">
          Thẻ {currentIndex + 1} / {totalCards}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 3D Flashcard + SRS Rating Bar */}
        <div className="lg:col-span-7 space-y-4">
          <div className="perspective-1000 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentCard.id}-${isFlipped ? "back" : "front"}`}
                initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0.4 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0.4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full"
              >
                {!isFlipped ? (
                  /* FRONT SIDE: ACTIVE RECALL */
                  <div className="min-h-[400px] md:min-h-[440px] rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                        <Layers className="w-3.5 h-3.5" />
                        {currentDeck?.title || "Giao tiếp thực tế"}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        Hộp ghi nhớ {currentCard.box}/5
                      </span>
                    </div>

                    <div className="my-auto py-6 space-y-4 text-center">
                      <div className="space-y-1">
                        <span className="text-xs uppercase tracking-wider font-bold text-brand-600">
                          Phản xạ giao tiếp (Active Recall)
                        </span>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Bạn sẽ nói câu này bằng tiếng Anh như thế nào?
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
                        <p className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                          &ldquo;{currentCard.sentence_vi}&rdquo;
                        </p>
                        <p className="text-xs sm:text-sm text-brand-600 font-semibold mt-2.5">
                          Cụm từ trọng tâm: &ldquo;{currentCard.meaning_vi}&rdquo;
                        </p>
                      </div>

                      {showHint ? (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-left space-y-1">
                          <p className="text-xs font-semibold text-amber-800">
                            Gợi ý chữ cái đầu:
                          </p>
                          <p className="text-sm font-mono text-amber-900 tracking-wide">
                            {generateFirstLetterHint(currentCard.sentence_en)}
                          </p>
                          <p className="text-xs text-amber-800 mt-1">
                            Cụm từ khóa:{" "}
                            <strong className="underline">
                              {generateFirstLetterHint(currentCard.phrase_en)}
                            </strong>
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowHint(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-700 text-xs font-medium transition-colors"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                          <span>Gợi ý chữ cái đầu (Phím H)</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleFlip}
                      className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Lật thẻ xem đáp án & Luyện nói (Space)</span>
                    </button>
                  </div>
                ) : (
                  /* BACK SIDE: ANSWER & SHADOWING */
                  <div className="min-h-[400px] md:min-h-[440px] rounded-3xl bg-white border border-brand-200 p-6 md:p-8 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                        Đáp án & Mẫu câu
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(false)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Mặt trước (Space)</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5">
                      <div className="space-y-1">
                        <p className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                          {renderHighlightedSentence(
                            currentCard.sentence_en,
                            currentCard.phrase_en
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500">
                          {currentCard.sentence_vi}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-brand-600">
                            {currentCard.phrase_en}
                          </span>
                          <span className="text-xs font-mono text-slate-500 ml-2">
                            {currentCard.ipa}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          {currentCard.meaning_vi}
                        </span>
                      </div>

                      {currentCard.context_note && (
                        <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-3 flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {currentCard.context_note}
                          </p>
                        </div>
                      )}

                      {currentCard.variations && currentCard.variations.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Biến thể câu giao tiếp thực tế
                          </p>
                          <div className="space-y-1">
                            {currentCard.variations.map((v, idx) => (
                              <p key={idx} className="text-xs text-slate-700 font-medium">
                                • {v}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audio Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(1.0, "normal")}
                        className={`py-3 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-colors ${
                          playingSpeed === "normal"
                            ? "bg-brand-600 text-white border-brand-600 font-bold"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Nghe chuẩn 1x (R)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayAudio(0.75, "slow")}
                        className={`py-3 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-colors ${
                          playingSpeed === "slow"
                            ? "bg-amber-500 text-white border-amber-500 font-bold"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                        }`}
                      >
                        <Turtle className="w-4 h-4" />
                        <span>Nghe chậm 0.75x (S)</span>
                      </button>
                    </div>

                    {/* Mobile Shadowing Mic Box */}
                    <div className="lg:hidden bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <button
                        type="button"
                        onClick={handleToggleShadowing}
                        disabled={micState === "processing"}
                        className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                          micState === "listening"
                            ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                            : micState === "processing"
                            ? "bg-brand-600 text-white cursor-wait"
                            : micState === "error"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                        }`}
                      >
                        {micState === "listening" && (
                          <>
                            <MicOff className="w-4 h-4 animate-pulse" />
                            <span>Đang nghe bạn nói... (Bấm để dừng)</span>
                          </>
                        )}
                        {micState === "processing" && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang chấm điểm...</span>
                          </>
                        )}
                        {micState === "error" && (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Thử lại Micro</span>
                          </>
                        )}
                        {micState === "idle" && (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Luyện nói theo mẫu (Shadowing)</span>
                          </>
                        )}
                      </button>

                      {(micState === "listening" ||
                        micState === "processing" ||
                        transcript) && (
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] text-slate-500">
                            Giọng của bạn:
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">
                            &ldquo;{transcript || "Đang lắng nghe..."}&rdquo;
                          </p>
                        </div>
                      )}

                      {speechError && (
                        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{speechError}</span>
                        </div>
                      )}

                      {activeEval && (
                        <PronunciationFeedbackPanel
                          evaluation={activeEval}
                          isLive={micState === "listening" && !speechResult}
                          onRetry={startShadowingSession}
                        />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SRS Rating Bar */}
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pt-1"
            >
              <p className="text-xs text-center text-slate-500 font-medium">
                Đánh giá mức độ phản xạ của bạn (Phím 1 – 4):
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRateCard("again")}
                  className="py-3 px-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex flex-col items-center justify-center active:scale-95 transition-colors shadow-xs"
                >
                  <span className="text-xs sm:text-sm font-bold">
                    1. Quên
                  </span>
                  <span className="text-[10px] text-rose-600 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "again")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("hard")}
                  className="py-3 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 flex flex-col items-center justify-center active:scale-95 transition-colors shadow-xs"
                >
                  <span className="text-xs sm:text-sm font-bold">
                    2. Ngập ngừng
                  </span>
                  <span className="text-[10px] text-amber-700 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "hard")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("good")}
                  className="py-3 px-2 rounded-2xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 flex flex-col items-center justify-center active:scale-95 transition-colors shadow-xs"
                >
                  <span className="text-xs sm:text-sm font-bold">
                    3. Nhớ được
                  </span>
                  <span className="text-[10px] text-brand-600 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "good")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("easy")}
                  className="py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex flex-col items-center justify-center active:scale-95 transition-colors shadow-xs"
                >
                  <span className="text-xs sm:text-sm font-bold">
                    4. Phản xạ ngay
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "easy")})
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN ON PC: Dedicated Shadowing Studio */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-brand-600" />
                  <span>Luyện phát âm (Shadowing)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đo độ chính xác từng từ bằng giọng nói
                </p>
              </div>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                Phím M
              </span>
            </div>

            {!isFlipped ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center space-y-3">
                <Keyboard className="w-8 h-8 text-brand-500 mx-auto opacity-75" />
                <p className="text-sm font-semibold text-slate-800">
                  Hãy tự nói câu tiếng Anh trước rồi bấm{" "}
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-900 font-mono">
                    Space
                  </kbd>{" "}
                  để lật thẻ!
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Việc chủ động nhớ lại câu trước khi nhìn đáp án giúp não bộ hình thành phản xạ tự nhiên.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleToggleShadowing}
                  disabled={micState === "processing"}
                  className={`w-full py-3.5 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ${
                    micState === "listening"
                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                      : micState === "processing"
                      ? "bg-brand-600 text-white cursor-wait"
                      : micState === "error"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                  }`}
                >
                  {micState === "listening" && (
                    <>
                      <MicOff className="w-4 h-4 animate-pulse" />
                      <span>Đang nghe... (Bấm hoặc nhấn M để dừng)</span>
                    </>
                  )}
                  {micState === "processing" && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang chấm điểm...</span>
                    </>
                  )}
                  {micState === "error" && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Thử lại Micro (Phím M)</span>
                    </>
                  )}
                  {micState === "idle" && (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Bấm để luyện nói (Phím M)</span>
                    </>
                  )}
                </button>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-h-[76px] flex flex-col justify-center">
                  <p className="text-xs text-slate-500">
                    Nội dung nhận diện trực tiếp:
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {transcript ? (
                      <>&ldquo;{transcript}&rdquo;</>
                    ) : micState === "listening" ? (
                      <span className="text-rose-600 animate-pulse">
                        Đang lắng nghe giọng của bạn...
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Chưa có bản ghi âm cho thẻ này...
                      </span>
                    )}
                  </p>
                </div>

                {speechError && (
                  <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{speechError}</span>
                  </div>
                )}

                {activeEval && (
                  <PronunciationFeedbackPanel
                    evaluation={activeEval}
                    isLive={micState === "listening" && !speechResult}
                    onRetry={startShadowingSession}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 md:px-8 pt-6 space-y-4 max-w-5xl mx-auto">
          <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-96 w-full bg-white rounded-3xl border border-slate-200 animate-pulse" />
        </div>
      }
    >
      <StudySessionContent />
    </Suspense>
  );
}
