"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Timer,
  Play,
  Trophy,
  SkipForward,
  Volume2,
  RotateCcw,
  CheckCircle2,
  Check,
  XCircle,
  Zap,
} from "lucide-react";
import {
  getCards,
  getInitialLocalData,
  getStoredUserProfile,
  logStudyActivity,
  saveReflexDrillProgress,
  UserProfile,
} from "@/lib/dataService";
import AccountLockScreen from "@/components/AccountLockScreen";
import { Card } from "@/lib/seedData";
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

const TOTAL_DRILL_SECONDS = 60;
const PER_CARD_SECONDS = 7;

interface DrillHistoryItem {
  card: Card;
  spoken: string;
  score: number;
  correctCount: number;
  totalCount: number;
  responseTimeSec: number;
  passed: boolean;
  words: WordEvaluation[];
}

function shuffleCards(arr: Card[]): Card[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReflexDrillPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [drillCards, setDrillCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [globalTimeLeft, setGlobalTimeLeft] = useState(TOTAL_DRILL_SECONDS);
  const [cardTimeLeft, setCardTimeLeft] = useState(PER_CARD_SECONDS);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveEvaluation, setLiveEvaluation] =
    useState<PronunciationEvaluationResult | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{
    score: number;
    correctCount: number;
    totalCount: number;
    passed: boolean;
  } | null>(null);
  const [history, setHistory] = useState<DrillHistoryItem[]>([]);
  const [micState, setMicState] = useState<MicVisualState>("idle");
  const [micError, setMicError] = useState<string | null>(null);

  const recognizerRef = useRef<SpeechRecognizerController | null>(null);
  const cardStartTimeRef = useRef<number>(Date.now());
  const advancingRef = useRef<boolean>(false);
  const historyRef = useRef<DrillHistoryItem[]>([]);
  const liveTranscriptRef = useRef<string>(liveTranscript);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    setCurrentUser(getStoredUserProfile());
    setAllCards(getInitialLocalData().cards);
    async function load() {
      const cards = await getCards();
      setAllCards(cards);
    }
    void load();
  }, []);

  const finishDrill = useCallback(async () => {
    recognizerRef.current?.stop();
    setStatus("finished");

    const finalHistory = historyRef.current;
    const passedCount = finalHistory.filter((h) => h.passed).length;
    const totalAttempted = finalHistory.length;
    const avgScore =
      totalAttempted > 0
        ? Math.round(
            finalHistory.reduce((acc, h) => acc + h.score, 0) / totalAttempted
          )
        : 0;
    const avgSpeed =
      totalAttempted > 0
        ? parseFloat(
            (
              finalHistory.reduce((acc, h) => acc + h.responseTimeSec, 0) /
              totalAttempted
            ).toFixed(1)
          )
        : 0;

    const drillSummary = finalHistory.map((h) => ({
      card: h.card,
      passed: h.passed,
      score: h.score,
    }));
    await saveReflexDrillProgress(drillSummary);
  }, []);

  const advanceToNextCard = useCallback(
    (finalText: string, forcedScore?: number) => {
      if (advancingRef.current) return;
      advancingRef.current = true;

      const card = drillCards[currentIdx];
      if (!card) {
        advancingRef.current = false;
        return;
      }

      const elapsedSec = Math.min(
        PER_CARD_SECONDS,
        Math.max(1, Math.round((Date.now() - cardStartTimeRef.current) / 1000))
      );

      const evaluation = evaluatePronunciation(
        card.sentence_en,
        finalText || ""
      );
      const score = forcedScore !== undefined ? forcedScore : evaluation.score;
      const passed = score >= 60;

      const historyItem: DrillHistoryItem = {
        card,
        spoken: finalText || "(Không nhận được âm thanh)",
        score,
        correctCount: evaluation.correctCount,
        totalCount: evaluation.totalCount,
        responseTimeSec: elapsedSec,
        passed,
        words: evaluation.words,
      };

      historyRef.current = [historyItem, ...historyRef.current];
      setHistory(historyRef.current);

      setLastFeedback({
        score,
        correctCount: evaluation.correctCount,
        totalCount: evaluation.totalCount,
        passed,
      });

      const redWords = evaluation.words
        .filter((w) => w.status !== "correct")
        .map((w) => w.cleanWord || w.originalWord);

      void logStudyActivity({
        mode: "reflex",
        card_id: card.id,
        phrase_en: card.phrase_en,
        sentence_en: card.sentence_en,
        spoken_text: finalText,
        score,
        mispronounced_words: redWords,
      });

      setTimeout(() => {
        setLastFeedback(null);
        setLiveTranscript("");
        setLiveEvaluation(null);

        if (currentIdx + 1 < drillCards.length) {
          setCurrentIdx((prev) => prev + 1);
          setCardTimeLeft(PER_CARD_SECONDS);
          cardStartTimeRef.current = Date.now();
          advancingRef.current = false;
        } else {
          void finishDrill();
          advancingRef.current = false;
        }
      }, 700);
    },
    [currentIdx, drillCards, finishDrill]
  );

  const startListeningForCurrentCard = useCallback(
    (card: Card) => {
      setMicError(null);
      setLiveTranscript("");
      setLiveEvaluation(null);
      setMicState("listening");

      const controller = startSpeechRecognition({
        onStateChange: (nextState) => {
          setMicState(nextState);
        },
        onInterimResult: (liveText) => {
          setLiveTranscript(liveText);
          const interimEval = evaluatePronunciation(
            card.sentence_en,
            liveText
          );
          setLiveEvaluation(interimEval);

          if (interimEval.score >= 70 && !advancingRef.current) {
            controller?.stop();
            advanceToNextCard(liveText);
          }
        },
        onFinalResult: (finalText) => {
          setLiveTranscript(finalText);
          if (!advancingRef.current) {
            advanceToNextCard(finalText);
          }
        },
        onError: (err) => {
          setMicError(err);
          setMicState("error");
        },
        onEnd: () => {
          setMicState((prev) => (prev === "error" ? "error" : "idle"));
        },
      });

      recognizerRef.current = controller;
    },
    [advanceToNextCard]
  );

  const startDrill = useCallback(() => {
    const shuffled = shuffleCards(allCards.length > 0 ? allCards : getInitialLocalData().cards);
    setDrillCards(shuffled);
    setCurrentIdx(0);
    setGlobalTimeLeft(TOTAL_DRILL_SECONDS);
    setCardTimeLeft(PER_CARD_SECONDS);
    setHistory([]);
    historyRef.current = [];
    advancingRef.current = false;
    cardStartTimeRef.current = Date.now();
    setStatus("running");

    if (shuffled.length > 0) {
      setTimeout(() => startListeningForCurrentCard(shuffled[0]), 300);
    }
  }, [allCards, startListeningForCurrentCard]);

  // Global 60s Countdown Timer
  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void finishDrill();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishDrill, status]);

  // Per-Card 7s Countdown Timer
  useEffect(() => {
    if (status !== "running") return;
    const timer = setInterval(() => {
      setCardTimeLeft((prev) => {
        if (prev <= 1) {
          if (!advancingRef.current) {
            advanceToNextCard(liveTranscriptRef.current);
          }
          return PER_CARD_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [advanceToNextCard, status]);

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

  // Start speech recognition on card change
  useEffect(() => {
    if (status === "running" && drillCards[currentIdx]) {
      startListeningForCurrentCard(drillCards[currentIdx]);
    }
    return () => {
      recognizerRef.current?.stop();
    };
  }, [currentIdx, drillCards, startListeningForCurrentCard, status]);

  function handleManualMicToggle() {
    if (micState === "listening") {
      recognizerRef.current?.stop();
    } else if (drillCards[currentIdx]) {
      startListeningForCurrentCard(drillCards[currentIdx]);
    }
  }

  const currentCard = drillCards[currentIdx];
  const passedCount = history.filter((h) => h.passed).length;
  const avgScore =
    history.length > 0
      ? Math.round(
          history.reduce((acc, h) => acc + h.score, 0) / history.length
        )
      : 0;
  const avgSpeed =
    history.length > 0
      ? (
          history.reduce((acc, h) => acc + h.responseTimeSec, 0) /
          history.length
        ).toFixed(1)
      : "0.0";

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Phản xạ 60s
            </h1>
            <p className="text-xs text-slate-500">
              7 giây/câu • Bật tiếng Anh tự nhiên vào Micro
            </p>
          </div>
        </div>

        {status === "running" && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm">
            <Timer className="w-4 h-4 animate-spin text-rose-600" />
            <span>{globalTimeLeft}s</span>
          </div>
        )}
      </div>

      {/* STATE 1: IDLE / INTRO */}
      {status === "idle" && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-white border border-slate-200/90 p-6 md:p-10 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
            <Zap className="w-8 h-8 fill-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Thử thách Phản xạ 60 Giây
            </h2>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
              Màn hình sẽ hiện liên tục các câu giao tiếp tiếng Việt. Bạn có{" "}
              <strong className="text-amber-600">7 giây</strong> cho mỗi câu để
              nói to câu tiếng Anh tương ứng vào Micro!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-600">60 giây</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng thời gian
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-brand-600">7 giây / câu</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Chuyển câu tự động
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-emerald-600">Chấm điểm từ</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Báo Xanh/Đỏ chuẩn xác
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startDrill}
            className="w-full py-4 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Bắt đầu Thử thách 60 Giây</span>
          </button>
        </div>
      )}

      {/* STATE 2: RUNNING DRILL */}
      {status === "running" && currentCard && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            {/* 7-Second Per-Card Countdown Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500">
                  Câu số <strong className="text-slate-900">{currentIdx + 1}</strong>{" "}
                  • Đã vượt qua:{" "}
                  <strong className="text-emerald-600">{passedCount}</strong>
                </span>
                <span
                  className={`font-bold ${
                    cardTimeLeft <= 2 ? "text-rose-600" : "text-amber-600"
                  }`}
                >
                  Còn {cardTimeLeft}s
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    cardTimeLeft <= 2
                      ? "bg-rose-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.round(
                      (cardTimeLeft / PER_CARD_SECONDS) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Prompt Card */}
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 space-y-5 shadow-sm relative overflow-hidden">
              {lastFeedback && (
                <div
                  className={`absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm ${
                    lastFeedback.passed
                      ? "bg-emerald-50/90 text-emerald-800"
                      : "bg-rose-50/90 text-rose-800"
                  }`}
                >
                  {lastFeedback.passed ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-2" />
                  ) : (
                    <XCircle className="w-12 h-12 text-rose-600 mb-2" />
                  )}
                  <p className="text-base font-bold">
                    {lastFeedback.passed ? "Phản xạ chuẩn!" : "Chưa khớp!"} — Đúng{" "}
                    {lastFeedback.correctCount}/{lastFeedback.totalCount} từ (
                    {lastFeedback.score}%)
                  </p>
                </div>
              )}

              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Hãy nói bằng tiếng Anh ngay!
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <p className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                    &ldquo;{currentCard.sentence_vi}&rdquo;
                  </p>
                  <p className="text-xs sm:text-sm text-brand-600 font-semibold mt-2">
                    Gợi ý: &ldquo;{currentCard.meaning_vi}&rdquo; (
                    {currentCard.phrase_en[0]}...)
                  </p>
                </div>
              </div>

              {/* Active Mic Visualizer */}
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <button
                  type="button"
                  onClick={handleManualMicToggle}
                  aria-label="Điều khiển Micro"
                  className="relative flex items-center justify-center focus:outline-none group"
                >
                  {micState === "listening" && (
                    <div className="w-20 h-20 rounded-full bg-rose-500/20 absolute animate-ping" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                      micState === "listening"
                        ? "bg-rose-600 text-white border-rose-300 shadow-sm"
                        : micState === "processing"
                        ? "bg-brand-600 text-white border-brand-300"
                        : micState === "error"
                        ? "bg-amber-100 text-amber-700 border-amber-300"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:border-amber-400"
                    }`}
                  >
                    {micState === "listening" && (
                      <Mic className="w-7 h-7 animate-pulse" />
                    )}
                    {micState === "processing" && (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    )}
                    {micState === "error" && (
                      <AlertTriangle className="w-7 h-7 text-amber-600" />
                    )}
                    {micState === "idle" && <MicOff className="w-7 h-7" />}
                  </div>
                </button>

                <span className="text-xs font-medium text-slate-500">
                  {micState === "listening" && "Đang nghe... (Bấm Mic để dừng)"}
                  {micState === "processing" && "Đang chấm điểm phát âm..."}
                  {micState === "error" && "Bấm vào Micro để bật lại"}
                  {micState === "idle" && "Bấm vào Micro để nói"}
                </span>

                <div className="min-h-[48px] w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
                  <p className="text-xs sm:text-sm text-slate-800 font-medium">
                    {liveTranscript ? (
                      <>&ldquo;{liveTranscript}&rdquo;</>
                    ) : (
                      <span className="text-slate-400">
                        Đang lắng nghe giọng của bạn...
                      </span>
                    )}
                  </p>

                  {/* Real-time Word Badges */}
                  {liveEvaluation && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-slate-200">
                      {liveEvaluation.words.map((w, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded-lg font-semibold ${
                            w.status === "correct"
                              ? "text-emerald-700 bg-white border border-emerald-300"
                              : "text-rose-700 bg-white border border-rose-300 underline decoration-rose-500 decoration-wavy"
                          }`}
                        >
                          {w.originalWord}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {micError && (
                  <div className="w-full flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{micError}</span>
                  </div>
                )}
              </div>

              {/* Quick Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    advanceToNextCard(currentCard.sentence_en, 100)
                  }
                  className="py-3 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã nói đúng</span>
                </button>
                <button
                  type="button"
                  onClick={() => advanceToNextCard(liveTranscript)}
                  className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Bỏ qua</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Scoreboard */}
          <div className="hidden lg:block lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Bảng điểm trực tiếp
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-emerald-600">
                    {passedCount}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Câu đã đạt</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-2xl font-bold text-amber-600">
                    {avgSpeed}s
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Tốc độ TB / câu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: FINISHED SUMMARY */}
      {status === "finished" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/90 p-6 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-500" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Kết quả Phản xạ 60 Giây!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tốc độ bật tiếng Anh tự nhiên của bạn
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <p className="text-xl font-bold text-emerald-600">
                  {passedCount}/{history.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Câu đạt</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <p className="text-xl font-bold text-amber-600">
                  {avgSpeed}s
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tốc độ TB</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <p className="text-xl font-bold text-brand-600">
                  {avgScore}%
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Độ chuẩn</p>
              </div>
            </div>

            <button
              type="button"
              onClick={startDrill}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại 60 Giây mới</span>
            </button>
          </div>

          {/* Detailed Word-by-Word Breakdown */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Chi tiết các câu vừa phản xạ ({history.length})
              </h3>
              <span className="text-xs text-slate-500">
                💡 Chạm vào chữ ĐỎ để nghe máy phát âm chậm lại.
              </span>
            </div>

            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                      <p className="text-xs text-slate-500">
                        {item.card.sentence_vi}
                      </p>

                      <div className="flex flex-wrap items-start gap-2 pt-0.5">
                        {item.words.map((wb, wIdx) => {
                          const isCorrect = wb.status === "correct";
                          return (
                            <div
                              key={wIdx}
                              className="flex flex-col items-center"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  speakText(wb.cleanWord || wb.originalWord, 0.7)
                                }
                                title={`Nghe phát âm từ "${wb.cleanWord}"`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                                  isCorrect
                                    ? "text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50"
                                    : "text-rose-700 bg-white border border-rose-300 underline decoration-rose-500 decoration-wavy hover:bg-rose-50"
                                }`}
                              >
                                {isCorrect ? (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Volume2 className="w-3 h-3 text-rose-500 shrink-0" />
                                )}
                                <span>{wb.originalWord}</span>
                              </button>

                              {!isCorrect && wb.spokenAs && (
                                <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px] font-medium text-rose-700 leading-tight">
                                  Nghe thành: &ldquo;{wb.spokenAs}&rdquo;
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => speakEnglish(item.card.sentence_en, 1.0)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-brand-600 border border-slate-200 shrink-0"
                      title="Nghe phát âm cả câu"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 truncate max-w-[60%]">
                      Bạn nói: <em className="text-slate-800">{item.spoken}</em>
                    </span>
                    <span
                      className={`font-semibold px-2.5 py-0.5 rounded-lg border ${
                        item.passed
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-rose-700 bg-rose-50 border-rose-200"
                      }`}
                    >
                      Đúng {item.correctCount}/{item.totalCount} từ ({item.score}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
