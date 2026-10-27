"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import {
  getCards,
  getDecks,
  submitCardReview,
} from "@/lib/dataService";
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
    // Fallback if verb tense changed (e.g., "make up my mind" -> "made up my mind")
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

  useEffect(() => {
    async function loadStudyCards() {
      setLoading(true);
      const [allDecks, fetchedCards] = await Promise.all([
        getDecks(),
        getCards(selectedDeckId === "all" ? undefined : selectedDeckId),
      ]);
      setDecks(allDecks);

      const due = fetchedCards.filter((c) => isCardDue(c));
      // If all cards are already reviewed today, allow practicing all cards in the deck
      const queue = due.length > 0 ? due : fetchedCards;

      setStudyQueue(queue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setSessionFinished(false);
      resetSpeechState();
      setLoading(false);
    }

    loadStudyCards();
  }, [selectedDeckId]);

  function resetSpeechState() {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    setSpeechResult(null);
    setSpeechError(null);
  }

  const currentCard = studyQueue[currentIndex];
  const currentDeck = decks.find((d) => d.id === currentCard?.deck_id);

  function handleFlip() {
    if (!currentCard) return;
    const nextFlip = !isFlipped;
    setIsFlipped(nextFlip);
    if (nextFlip) {
      // Auto play normal speed audio when flipping to back side
      setPlayingSpeed("normal");
      speakEnglish(currentCard.sentence_en, 1.0, () => setPlayingSpeed(null));
    }
  }

  function handlePlayAudio(rate: number, mode: "normal" | "slow") {
    if (!currentCard) return;
    setPlayingSpeed(mode);
    speakEnglish(currentCard.sentence_en, rate, () => setPlayingSpeed(null));
  }

  function handleToggleShadowing() {
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
  }

  async function handleRateCard(rating: SRSRating) {
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
  }

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
      <div className="px-4 pt-6 space-y-4">
        <div className="h-8 w-48 bg-slate-900 rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-slate-900/70 rounded-3xl border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (sessionFinished || !currentCard) {
    return (
      <div className="px-4 pt-10 pb-8 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <Award className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            Hoàn thành phiên luyện tập!
          </h1>
          <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
            Bạn đã ôn tập xong{" "}
            <strong className="text-emerald-400">{reviewedCount} mẫu câu</strong>{" "}
            và cập nhật lịch lặp lại ngắt quãng (SM-2).
          </p>
        </div>

        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Muốn kiểm tra tốc độ bật câu tiếng Anh trong 7 giây?
          </p>
          <Link
            href="/reflex"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>Thử thách Phản xạ 60 Giây</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={handleRestartSession}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Ôn lại bộ này</span>
          </button>
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold text-xs flex items-center justify-center gap-2"
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
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Top Bar: Back + Deck Filter + Counter */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            aria-label="Chọn bộ chủ đề"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 truncate"
          >
            <option value="all">Tất cả chủ đề ({totalCards} thẻ)</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-sky-400 shrink-0">
          {currentIndex + 1} / {totalCards}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3D Flipping Flashcard Container */}
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
              <div className="min-h-[390px] rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-5 flex flex-col justify-between shadow-2xl">
                {/* Top Situational Tag & Box Level */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Layers className="w-3.5 h-3.5" />
                    {currentDeck?.title || "Giao tiếp thực tế"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                    SRS Box {currentCard.box}/5
                  </span>
                </div>

                {/* Center Prompt */}
                <div className="my-auto py-6 space-y-5 text-center">
                  <div className="space-y-1.5">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-sky-400">
                      Tình huống phản xạ
                    </span>
                    <p className="text-xs text-slate-400">
                      Bạn sẽ nói câu này bằng tiếng Anh như thế nào?
                    </p>
                  </div>

                  {/* Vietnamese Conversational Prompt */}
                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 shadow-inner">
                    <p className="text-xl font-bold text-white leading-snug">
                      &ldquo;{currentCard.sentence_vi}&rdquo;
                    </p>
                    <p className="text-xs text-emerald-400 font-medium mt-2">
                      Cụm từ trọng tâm: &ldquo;{currentCard.meaning_vi}&rdquo;
                    </p>
                  </div>

                  {/* Hint Box */}
                  {showHint ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-left space-y-1 animate-fadeIn">
                      <p className="text-[11px] font-semibold text-amber-300">
                        Gợi ý chữ cái đầu:
                      </p>
                      <p className="text-sm font-mono text-amber-100 tracking-wide">
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 text-xs font-medium border border-slate-700/80 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Gợi ý chữ cái đầu</span>
                    </button>
                  )}
                </div>

                {/* Flip Button */}
                <button
                  type="button"
                  onClick={handleFlip}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-[0.99] transition-all"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Lật thẻ xem đáp án & Luyện nói</span>
                </button>
              </div>
            ) : (
              /* ================= BACK SIDE: ANSWER & SHADOWING ================= */
              <div className="rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-sky-500/30 p-5 space-y-4 shadow-2xl">
                {/* Header: Flip back + Core Phrase Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    Đáp án & Luyện nói Shadowing
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Mặt trước</span>
                  </button>
                </div>

                {/* English Sentence & Core Chunk Breakdown */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-white leading-snug">
                      {renderHighlightedSentence(
                        currentCard.sentence_en,
                        currentCard.phrase_en
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {currentCard.sentence_vi}
                    </p>
                  </div>

                  {/* Chunk + IPA + Meaning */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-sky-300">
                        {currentCard.phrase_en}
                      </span>
                      <span className="text-xs font-mono text-slate-400 ml-2">
                        {currentCard.ipa}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {currentCard.meaning_vi}
                    </span>
                  </div>

                  {/* Context Note */}
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-2.5 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      {currentCard.context_note}
                    </p>
                  </div>
                </div>

                {/* Audio Controls: Normal (1x) & Slow (0.75x) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(1.0, "normal")}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                      playingSpeed === "normal"
                        ? "bg-sky-500 text-slate-950 border-sky-400 font-bold"
                        : "bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700"
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Nghe chuẩn (1x)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlayAudio(0.75, "slow")}
                    className={`py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                      playingSpeed === "slow"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                        : "bg-slate-800/90 hover:bg-slate-800 text-slate-100 border-slate-700"
                    }`}
                  >
                    <Turtle className="w-4 h-4" />
                    <span>Nghe chậm (0.75x)</span>
                  </button>
                </div>

                {/* Shadowing Mic Box */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-3">
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

                  {/* Real-time Recognized Transcript */}
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

                  {/* Speech Error Message */}
                  {speechError && (
                    <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center">
                      {speechError}
                    </p>
                  )}

                  {/* Speech Accuracy Result & Word Highlighting */}
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
                      <div className="flex items-center justify-between">
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
                      </div>

                      {/* Word-by-word breakdown (Green = Matched, Yellow = Missed) */}
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

      {/* SRS Rating Bar (4 Thumb-Friendly Buttons when Flipped) */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 pt-1"
        >
          <p className="text-[11px] text-center text-slate-400 font-medium">
            Đánh giá tốc độ phản xạ của bạn để lên lịch ôn tập (SM-2):
          </p>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRateCard("again")}
              className="py-2.5 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex flex-col items-center justify-center active:scale-95 transition-all"
            >
              <span className="text-xs font-bold">Quên</span>
              <span className="text-[10px] text-rose-200/80 mt-0.5">
                ({getRatingPreviewLabel(currentCard, "again")})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("hard")}
              className="py-2.5 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex flex-col items-center justify-center active:scale-95 transition-all"
            >
              <span className="text-xs font-bold">Ngập ngừng</span>
              <span className="text-[10px] text-amber-200/80 mt-0.5">
                ({getRatingPreviewLabel(currentCard, "hard")})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("good")}
              className="py-2.5 px-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 flex flex-col items-center justify-center active:scale-95 transition-all"
            >
              <span className="text-xs font-bold">Nhớ được</span>
              <span className="text-[10px] text-sky-200/80 mt-0.5">
                ({getRatingPreviewLabel(currentCard, "good")})
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleRateCard("easy")}
              className="py-2.5 px-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 flex flex-col items-center justify-center active:scale-95 transition-all"
            >
              <span className="text-xs font-bold">Phản xạ ngay</span>
              <span className="text-[10px] text-emerald-200/80 mt-0.5">
                ({getRatingPreviewLabel(currentCard, "easy")})
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-6 space-y-4">
          <div className="h-8 w-48 bg-slate-900 rounded-xl animate-pulse" />
          <div className="h-96 w-full bg-slate-900/70 rounded-3xl border border-slate-800 animate-pulse" />
        </div>
      }
    >
      <StudySessionContent />
    </Suspense>
  );
}
