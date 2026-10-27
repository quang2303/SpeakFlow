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
  Lightbulb,
  RotateCw,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Layers,
  Award,
  RefreshCw,
  Flame,
  Keyboard,
} from "lucide-react";
import { getCards, getDecks, submitCardReview } from "@/lib/dataService";
import { Card, Deck } from "@/lib/seedData";
import {
  generateFirstLetterHint,
  getRatingPreviewLabel,
  isCardDue,
  SRSRating,
} from "@/lib/srs";
import {
  evaluateSpeechAccuracy,
  speakEnglish,
  SpeechRecognizerController,
  SpeechScoreResult,
  startSpeechRecognition,
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
              ? "text-sky-300 underline decoration-sky-400/70 decoration-2 underline-offset-4 font-bold"
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
        className="text-sky-300 bg-sky-500/15 px-1.5 py-0.5 rounded-lg border border-sky-400/30 font-bold"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function StudySessionContent() {
  const searchParams = useSearchParams();
  const deckParam = searchParams.get("deck") || "all";

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(deckParam);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Audio & Shadowing states
  const [playingSpeed, setPlayingSpeed] = useState<"normal" | "slow" | null>(
    null
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechResult, setSpeechResult] = useState<SpeechScoreResult | null>(
    null
  );
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognizerController | null>(null);

  useEffect(() => {
    setSelectedDeckId(deckParam);
  }, [deckParam]);

  const resetSpeechState = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
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
    loadStudyCards();
  }, [loadStudyCards]);

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

  const handleToggleShadowing = useCallback(() => {
    if (!currentCard) return;

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    setTranscript("");
    setSpeechResult(null);
    setIsListening(true);

    const controller = startSpeechRecognition({
      onInterimResult: (liveText) => {
        setTranscript(liveText);
      },
      onFinalResult: (finalText) => {
        setTranscript(finalText);
        const evaluation = evaluateSpeechAccuracy(
          currentCard.sentence_en,
          finalText
        );
        setSpeechResult(evaluation);
        setIsListening(false);
      },
      onError: (errMsg) => {
        setSpeechError(errMsg);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    recognizerRef.current = controller;
  }, [currentCard, isListening]);

  const handleRateCard = useCallback(
    async (rating: SRSRating) => {
      if (!currentCard) return;
      resetSpeechState();

      await submitCardReview(currentCard, rating);
      setReviewedCount((prev) => prev + 1);

      if (currentIndex + 1 < studyQueue.length) {
        setIsFlipped(false);
        setShowHint(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setSessionFinished(true);
      }
    },
    [currentCard, currentIndex, resetSpeechState, studyQueue.length]
  );

  // PC Keyboard Shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (sessionFinished || !currentCard) return;

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.key.toLowerCase() === "h" && !isFlipped) {
        e.preventDefault();
        setShowHint(true);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handlePlayAudio(1.0, "normal");
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        handlePlayAudio(0.75, "slow");
      } else if (e.key.toLowerCase() === "m" && isFlipped) {
        e.preventDefault();
        handleToggleShadowing();
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

  if (loading) {
    return (
      <div className="px-4 md:px-8 pt-6 space-y-4">
        <div className="h-10 w-64 bg-slate-900 rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-slate-900/70 rounded-3xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (sessionFinished || !currentCard) {
    return (
      <div className="px-4 md:px-8 pt-10 pb-8 max-w-xl mx-auto flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Award className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            Hoàn thành phiên luyện tập!
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Bạn đã ôn tập xong{" "}
            <strong className="text-emerald-400">{reviewedCount} mẫu câu</strong>{" "}
            và cập nhật lịch lặp lại ngắt quãng (SM-2) lên Cloud.
          </p>
        </div>

        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs md:text-sm text-slate-400">
            Muốn kiểm tra tốc độ bật câu tiếng Anh trong 7 giây?
          </p>
          <Link
            href="/reflex"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>Thử thách Phản xạ 60 Giây</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleRestartSession}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs md:text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ôn lại bộ này</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs md:text-sm flex items-center justify-center gap-2"
          >
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>
    );
  }

  const totalCards = studyQueue.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalCards) * 100);

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-8 pb-8 space-y-5">
      {/* Top Bar: Back + Deck Filter + Counter */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 max-w-md">
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            aria-label="Chọn bộ chủ đề"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm font-semibold text-slate-200 focus:outline-none focus:border-sky-500 truncate"
          >
            <option value="all">Tất cả chủ đề ({totalCards} thẻ)</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs md:text-sm font-bold text-sky-400 shrink-0">
          Thẻ {currentIndex + 1} / {totalCards}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* PC 2-Column Workspace / Mobile Single Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT/MAIN COLUMN (7 Cols on PC): 3D Flashcard + SRS Rating Bar */}
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
                  /* ================= FRONT SIDE: ACTIVE RECALL ================= */
                  <div className="min-h-[390px] md:min-h-[430px] rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-5 md:p-7 flex flex-col justify-between shadow-2xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        <Layers className="w-3.5 h-3.5" />
                        {currentDeck?.title || "Giao tiếp thực tế"}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                        SRS Box {currentCard.box}/5
                      </span>
                    </div>

                    <div className="my-auto py-6 space-y-5 text-center">
                      <div className="space-y-1.5">
                        <span className="text-xs uppercase tracking-wider font-bold text-sky-400">
                          Tình huống phản xạ (Active Recall)
                        </span>
                        <p className="text-xs md:text-sm text-slate-400">
                          Bạn sẽ nói câu này bằng tiếng Anh như thế nào?
                        </p>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-inner">
                        <p className="text-xl md:text-2xl font-bold text-white leading-snug">
                          &ldquo;{currentCard.sentence_vi}&rdquo;
                        </p>
                        <p className="text-xs md:text-sm text-emerald-400 font-medium mt-2.5">
                          Cụm từ trọng tâm: &ldquo;{currentCard.meaning_vi}
                          &rdquo;
                        </p>
                      </div>

                      {showHint ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-left space-y-1 animate-fadeIn">
                          <p className="text-xs font-semibold text-amber-300">
                            Gợi ý chữ cái đầu:
                          </p>
                          <p className="text-sm md:text-base font-mono text-amber-100 tracking-wide">
                            {generateFirstLetterHint(currentCard.sentence_en)}
                          </p>
                          <p className="text-xs text-amber-300/90 mt-1">
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 text-xs font-medium border border-slate-700/80 transition-colors"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Gợi ý chữ cái đầu (Phím H)</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleFlip}
                      className="w-full py-3.5 md:py-4 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-[0.99] transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Lật thẻ xem đáp án & Luyện nói (Space)</span>
                    </button>
                  </div>
                ) : (
                  /* ================= BACK SIDE: ANSWER & SHADOWING ================= */
                  <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-sky-500/30 p-5 md:p-7 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                        Đáp án & Cấu trúc Cụm từ
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(false)}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Mặt trước (Space)</span>
                      </button>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3.5">
                      <div className="space-y-1">
                        <p className="text-lg md:text-2xl font-bold text-white leading-snug">
                          {renderHighlightedSentence(
                            currentCard.sentence_en,
                            currentCard.phrase_en
                          )}
                        </p>
                        <p className="text-xs md:text-sm text-slate-400">
                          {currentCard.sentence_vi}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-extrabold text-sky-300">
                            {currentCard.phrase_en}
                          </span>
                          <span className="text-xs font-mono text-slate-400 ml-2">
                            {currentCard.ipa}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                          {currentCard.meaning_vi}
                        </span>
                      </div>

                      <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm text-indigo-200 leading-relaxed">
                          {currentCard.context_note}
                        </p>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(1.0, "normal")}
                        className={`py-3 px-3 rounded-xl font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${
                          playingSpeed === "normal"
                            ? "bg-sky-500 text-slate-950 border-sky-400 font-bold"
                            : "bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700"
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Nghe chuẩn 1x (R)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayAudio(0.75, "slow")}
                        className={`py-3 px-3 rounded-xl font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border transition-all ${
                          playingSpeed === "slow"
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                            : "bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700"
                        }`}
                      >
                        <Turtle className="w-4 h-4" />
                        <span>Nghe chậm 0.75x (S)</span>
                      </button>
                    </div>

                    {/* Mobile Shadowing Mic Box (Hidden on lg because lg shows dedicated studio panel on right) */}
                    <div className="lg:hidden bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                      <button
                        type="button"
                        onClick={handleToggleShadowing}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          isListening
                            ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/50"
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            <span>Đang nghe bạn nói... (Bấm để dừng)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Bấm để đọc theo (Shadowing)</span>
                          </>
                        )}
                      </button>

                      {(isListening || transcript) && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] text-slate-400">
                            Giọng của bạn:
                          </p>
                          <p className="text-sm font-medium text-slate-100 mt-0.5">
                            &ldquo;{transcript || "..."}&rdquo;
                          </p>
                        </div>
                      )}

                      {speechError && (
                        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center">
                          {speechError}
                        </p>
                      )}

                      {speechResult && (
                        <div
                          className={`rounded-xl p-3 border space-y-2 ${
                            speechResult.level === "excellent"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : speechResult.level === "good"
                              ? "bg-amber-500/10 border-amber-500/30"
                              : "bg-rose-500/10 border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`text-xs font-extrabold flex items-center gap-1.5 ${
                              speechResult.level === "excellent"
                                ? "text-emerald-300"
                                : speechResult.level === "good"
                                ? "text-amber-300"
                                : "text-rose-300"
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Độ chuẩn: {speechResult.score}% —{" "}
                            {speechResult.feedback}
                          </span>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {speechResult.wordBreakdown.map((item, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                  item.matched
                                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                                    : "bg-amber-500/25 text-amber-200 border border-amber-400/50 underline decoration-amber-400"
                                }`}
                              >
                                {item.word}
                              </span>
                            ))}
                          </div>
                        </div>
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
              <p className="text-xs text-center text-slate-400 font-medium">
                Đánh giá tốc độ phản xạ của bạn (Bấm chuột hoặc phím 1 – 4):
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRateCard("again")}
                  className="py-3 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex flex-col items-center justify-center active:scale-95 transition-all"
                >
                  <span className="text-xs md:text-sm font-bold">
                    1. Quên
                  </span>
                  <span className="text-[11px] text-rose-200/80 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "again")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("hard")}
                  className="py-3 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex flex-col items-center justify-center active:scale-95 transition-all"
                >
                  <span className="text-xs md:text-sm font-bold">
                    2. Ngập ngừng
                  </span>
                  <span className="text-[11px] text-amber-200/80 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "hard")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("good")}
                  className="py-3 px-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 flex flex-col items-center justify-center active:scale-95 transition-all"
                >
                  <span className="text-xs md:text-sm font-bold">
                    3. Nhớ được
                  </span>
                  <span className="text-[11px] text-sky-200/80 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "good")})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateCard("easy")}
                  className="py-3 px-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 flex flex-col items-center justify-center active:scale-95 transition-all"
                >
                  <span className="text-xs md:text-sm font-bold">
                    4. Phản xạ ngay
                  </span>
                  <span className="text-[11px] text-emerald-200/80 mt-0.5">
                    ({getRatingPreviewLabel(currentCard, "easy")})
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN ON PC (5 Cols): Dedicated Shadowing Studio & Queue */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-4">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Phòng Lab Luyện Nói (Shadowing)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chấm điểm phát âm bằng khoảng cách Levenshtein
                </p>
              </div>
              <span className="text-[11px] font-mono bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800">
                Phím M
              </span>
            </div>

            {!isFlipped ? (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 text-center space-y-3">
                <Keyboard className="w-8 h-8 text-sky-400 mx-auto opacity-80" />
                <p className="text-sm font-semibold text-slate-200">
                  Hãy tự nói câu tiếng Anh trước rồi bấm <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-sky-300">Space</kbd> để lật thẻ!
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Việc chủ động bật ra câu tiếng Anh trước khi nhìn đáp án giúp
                  não bộ hình thành phản xạ nhanh gấp 3 lần.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleToggleShadowing}
                  className={`w-full py-4 px-5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 transition-all ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/30"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/50"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <span>Đang nghe bạn nói... (Bấm hoặc nhấn M để dừng)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>Bấm để đọc theo (Phím M)</span>
                    </>
                  )}
                </button>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center min-h-[76px] flex flex-col justify-center">
                  <p className="text-xs text-slate-400">
                    Transcript nhận diện trực tiếp:
                  </p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {transcript ? (
                      <>&ldquo;{transcript}&rdquo;</>
                    ) : (
                      <span className="text-slate-500">
                        Chưa có bản thu âm cho thẻ này...
                      </span>
                    )}
                  </p>
                </div>

                {speechError && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                    {speechError}
                  </p>
                )}

                {speechResult && (
                  <div
                    className={`rounded-2xl p-4 border space-y-2.5 ${
                      speechResult.level === "excellent"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : speechResult.level === "good"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-rose-500/10 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-extrabold flex items-center gap-1.5 ${
                          speechResult.level === "excellent"
                            ? "text-emerald-300"
                            : speechResult.level === "good"
                            ? "text-amber-300"
                            : "text-rose-300"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Độ chuẩn: {speechResult.score}% —{" "}
                        {speechResult.feedback}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {speechResult.wordBreakdown.map((item, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                            item.matched
                              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                              : "bg-amber-500/25 text-amber-200 border border-amber-400/50 underline decoration-amber-400"
                          }`}
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Cards Preview on PC */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiến độ phiên học hiện tại
              </span>
              <span className="text-xs font-bold text-emerald-400">
                Đã duyệt: {reviewedCount} thẻ
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mọi đánh giá SM-2 của bạn đều được lưu tự động. Khi đăng nhập
              Google, lịch ôn tập này được đồng bộ tức thì giữa máy tính và điện
              thoại.
            </p>
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
        <div className="px-4 md:px-8 pt-6 space-y-4">
          <div className="h-8 w-48 bg-slate-900 rounded-xl animate-pulse" />
          <div className="h-96 w-full bg-slate-900/70 rounded-3xl border border-slate-800 animate-pulse" />
        </div>
      }
    >
      <StudySessionContent />
    </Suspense>
  );
}
