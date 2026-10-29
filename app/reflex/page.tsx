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
    const handler = () => {
      setCurrentUser(getStoredUserProfile());
      setAllCards(getInitialLocalData().cards);
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => {
      window.removeEventListener("speakflow-auth-changed", handler);
      recognizerRef.current?.stop();
    };
  }, []);

  const currentCard = drillCards[currentIdx];

  const stopMic = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setMicState("idle");
  }, []);

  const finishDrill = useCallback(() => {
    stopMic();
    setStatus("finished");
    void saveReflexDrillProgress(historyRef.current);
  }, [stopMic]);

  const advanceToNextCard = useCallback(
    (spokenText: string, explicitScore?: number) => {
      if (advancingRef.current || status !== "running") return;
      advancingRef.current = true;
      setMicState("processing");
      stopMic();

      const card = drillCards[currentIdx];
      if (!card) {
        finishDrill();
        return;
      }

      const elapsedSec = Math.min(
        PER_CARD_SECONDS,
        Math.max(
          0.8,
          Number(((Date.now() - cardStartTimeRef.current) / 1000).toFixed(1))
        )
      );

      const evalResult = evaluatePronunciation(card.sentence_en, spokenText);
      const finalScore =
        explicitScore !== undefined ? explicitScore : evalResult.score;
      const passed = finalScore >= 60;

      const redWords =
        explicitScore === 100
          ? []
          : evalResult.words
              .filter((w) => w.status !== "correct")
              .map((w) => w.cleanWord || w.originalWord);

      void logStudyActivity({
        mode: "reflex",
        card_id: card.id,
        phrase_en: card.phrase_en,
        sentence_en: card.sentence_en,
        spoken_text: spokenText || "(Hết giờ 7s)",
        score: finalScore,
        mispronounced_words: redWords,
      });

      setLastFeedback({
        score: finalScore,
        correctCount: evalResult.correctCount,
        totalCount: evalResult.totalCount,
        passed,
      });

      const nextItem: DrillHistoryItem = {
        card,
        spoken: spokenText || "(Hết giờ 7s)",
        score: finalScore,
        correctCount: evalResult.correctCount,
        totalCount: evalResult.totalCount,
        responseTimeSec: elapsedSec,
        passed,
        words: evalResult.words,
      };
      historyRef.current = [...historyRef.current, nextItem];
      setHistory(historyRef.current);

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
          finishDrill();
        }
      }, 450);
    },
    [currentIdx, drillCards, finishDrill, status, stopMic]
  );

  const startCardMic = useCallback(() => {
    if (status !== "running" || !currentCard || advancingRef.current) return;

    setMicError(null);
    setLiveEvaluation(null);
    setMicState("listening");

    const controller = startSpeechRecognition({
      onStateChange: (nextState) => {
        setMicState(nextState);
      },
      onInterimResult: (interim) => {
        setLiveTranscript(interim);
        const quickEval = evaluatePronunciation(
          currentCard.sentence_en,
          interim
        );
        setLiveEvaluation(quickEval);
        if (quickEval.score >= 85) {
          advanceToNextCard(interim, quickEval.score);
        }
      },
      onFinalResult: (finalStr) => {
        setLiveTranscript(finalStr);
        advanceToNextCard(finalStr);
      },
      onError: (errMsg) => {
        setMicError(errMsg);
        setMicState("error");
      },
      onEnd: () => {
        setMicState((prev) => (prev === "error" ? "error" : "idle"));
      },
    });

    recognizerRef.current = controller;
  }, [status, currentCard, advanceToNextCard]);

  // Start microphone whenever current card changes during running state
  useEffect(() => {
    if (status !== "running" || !currentCard || advancingRef.current) return;

    cardStartTimeRef.current = Date.now();
    setLiveTranscript("");
    setLiveEvaluation(null);
    startCardMic();

    return () => {
      recognizerRef.current?.stop();
    };
  }, [currentIdx, status, currentCard, startCardMic]);

  // Global 60s & Per-Card 7s Countdown Timer
  useEffect(() => {
    if (status !== "running") return;

    const interval = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev <= 1) {
          finishDrill();
          return 0;
        }
        return prev - 1;
      });

      setCardTimeLeft((prev) => {
        if (prev <= 1) {
          advanceToNextCard(liveTranscriptRef.current);
          return PER_CARD_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, finishDrill, advanceToNextCard]);

  function startDrill() {
    const practiced = allCards.filter(
      (c) => c.last_practiced_at !== null || c.box > 1
    );
    const pool = practiced.length >= 5 ? practiced : allCards;
    const shuffled = shuffleCards(pool);

    setDrillCards(shuffled);
    historyRef.current = [];
    setHistory([]);
    setCurrentIdx(0);
    setGlobalTimeLeft(TOTAL_DRILL_SECONDS);
    setCardTimeLeft(PER_CARD_SECONDS);
    setLiveTranscript("");
    setLiveEvaluation(null);
    setLastFeedback(null);
    setMicError(null);
    advancingRef.current = false;
    setStatus("running");
  }

  function handleManualMicToggle() {
    if (micState === "listening") {
      setMicState("processing");
      recognizerRef.current?.stop();
    } else {
      startCardMic();
    }
  }

  const passedCount = history.filter((h) => h.passed).length;
  const avgScore =
    history.length > 0
      ? Math.round(
          history.reduce((acc, item) => acc + item.score, 0) / history.length
        )
      : 0;
  const avgSpeed =
    history.length > 0
      ? (
          history.reduce((acc, item) => acc + item.responseTimeSec, 0) /
          history.length
        ).toFixed(1)
      : "0.0";

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-extrabold text-white">
              Thử thách Phản xạ 60 Giây
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              7 giây/câu • Bật tiếng Anh tức thì vào Micro
            </p>
          </div>
        </div>

        {status === "running" && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-extrabold text-sm">
            <Timer className="w-4 h-4 animate-spin" />
            <span>{globalTimeLeft}s</span>
          </div>
        )}
      </div>

      {/* STATE 1: IDLE / INTRO */}
      {status === "idle" && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap className="w-8 h-8 md:w-10 md:h-10 text-slate-950 fill-slate-950" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-extrabold text-white">
              Kiểm tra Phản xạ Giao tiếp Thực chiến
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
              Màn hình sẽ hiện liên tục các câu giao tiếp tiếng Việt. Bạn chỉ có{" "}
              <strong className="text-amber-300">7 giây</strong> cho mỗi câu để
              nói to câu tiếng Anh tương ứng vào Micro!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
              <p className="text-sm font-bold text-amber-400">60 giây</p>
              <p className="text-xs text-slate-400 mt-1">
                Tổng thời gian thử thách
              </p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
              <p className="text-sm font-bold text-sky-400">7 giây / câu</p>
              <p className="text-xs text-slate-400 mt-1">
                Tự động chuyển khi nói đúng
              </p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
              <p className="text-sm font-bold text-emerald-400">Chấm từng từ</p>
              <p className="text-xs text-slate-400 mt-1">
                Báo Xanh/Đỏ & nghe lại từ sai
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startDrill}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-slate-950 font-extrabold text-sm md:text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-950/50 active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-slate-950" />
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
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-slate-400">
                  Câu số <strong className="text-white">{currentIdx + 1}</strong>{" "}
                  • Đã vượt qua:{" "}
                  <strong className="text-emerald-400">{passedCount}</strong>
                </span>
                <span
                  className={`font-bold ${
                    cardTimeLeft <= 2 ? "text-rose-400" : "text-amber-300"
                  }`}
                >
                  Còn {cardTimeLeft}s
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-700 ${
                    cardTimeLeft <= 2
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-amber-400 to-orange-500"
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
            <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 p-5 md:p-7 space-y-5 shadow-2xl relative overflow-hidden">
              {lastFeedback && (
                <div
                  className={`absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md ${
                    lastFeedback.passed
                      ? "bg-emerald-950/85 text-emerald-300"
                      : "bg-rose-950/85 text-rose-300"
                  }`}
                >
                  {lastFeedback.passed ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                  ) : (
                    <XCircle className="w-12 h-12 text-rose-400 mb-2" />
                  )}
                  <p className="text-lg font-extrabold">
                    {lastFeedback.passed ? "Phản xạ chuẩn!" : "Chưa khớp!"} — Đúng{" "}
                    {lastFeedback.correctCount}/{lastFeedback.totalCount} từ (
                    {lastFeedback.score}%)
                  </p>
                </div>
              )}

              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Hãy nói bằng tiếng Anh ngay!
                </span>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                  <p className="text-xl md:text-2xl font-extrabold text-white leading-snug">
                    &ldquo;{currentCard.sentence_vi}&rdquo;
                  </p>
                  <p className="text-xs md:text-sm text-sky-400 font-medium mt-2">
                    Gợi ý cụm từ: &ldquo;{currentCard.meaning_vi}&rdquo; (
                    {currentCard.phrase_en[0]}...)
                  </p>
                </div>
              </div>

              {/* Active Mic Visualizer (Idle / Listening / Processing / Error) */}
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <button
                  type="button"
                  onClick={handleManualMicToggle}
                  aria-label="Điều khiển Micro"
                  className="relative flex items-center justify-center focus:outline-none group"
                >
                  {micState === "listening" && (
                    <div className="w-20 h-20 rounded-full bg-rose-500/30 absolute animate-ping" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                      micState === "listening"
                        ? "bg-rose-600 text-white border-rose-300 shadow-lg shadow-rose-500/40"
                        : micState === "processing"
                        ? "bg-indigo-600 text-white border-indigo-300"
                        : micState === "error"
                        ? "bg-amber-500/20 text-amber-300 border-amber-400"
                        : "bg-slate-800 text-slate-200 border-slate-700 group-hover:border-amber-400"
                    }`}
                  >
                    {micState === "listening" && (
                      <Mic className="w-7 h-7 animate-pulse" />
                    )}
                    {micState === "processing" && (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    )}
                    {micState === "error" && (
                      <AlertTriangle className="w-7 h-7 text-amber-400" />
                    )}
                    {micState === "idle" && <MicOff className="w-7 h-7" />}
                  </div>
                </button>

                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {micState === "listening" &&
                    "Đang nghe... (Chạm biểu tượng Mic nếu muốn dừng sớm)"}
                  {micState === "processing" && "Đang chấm điểm phát âm..."}
                  {micState === "error" && "Chạm vào biểu tượng Mic để bật lại"}
                  {micState === "idle" && "Chạm vào Mic để bắt đầu nói"}
                </span>

                <div className="min-h-[48px] w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                  <p className="text-xs md:text-sm text-slate-300 font-medium">
                    {liveTranscript ? (
                      <>&ldquo;{liveTranscript}&rdquo;</>
                    ) : (
                      <span className="text-slate-500">
                        Đang lắng nghe giọng nói của bạn...
                      </span>
                    )}
                  </p>

                  {/* Real-time Green/Red Word Badges while speaking */}
                  {liveEvaluation && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
                      {liveEvaluation.words.map((w, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                            w.status === "correct"
                              ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/40"
                              : "text-rose-400 bg-rose-950/60 border border-rose-500/40 underline decoration-rose-500 decoration-wavy"
                          }`}
                        >
                          {w.originalWord}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {micError && (
                  <div className="w-full flex items-start gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
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
                  className="py-3 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs md:text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã nói đúng (Tự chấm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => advanceToNextCard(liveTranscript)}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Bỏ qua câu này</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column on PC: Live Scoreboard during 60s Run */}
          <div className="hidden lg:block lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Bảng Điểm Trực Tiếp
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {passedCount}
                  </p>
                  <p className="text-xs text-slate-400">Câu phản xạ đạt</p>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <p className="text-2xl font-extrabold text-amber-400">
                    {avgSpeed}s
                  </p>
                  <p className="text-xs text-slate-400">Tốc độ TB / câu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: FINISHED SUMMARY & INTERACTIVE WORD-BY-WORD CORRECTION */}
      {status === "finished" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 mx-auto flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white">
                Kết quả Phản xạ 60 Giây!
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Tốc độ bật tiếng Anh tự nhiên của bạn
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <p className="text-xl font-extrabold text-emerald-400">
                  {passedCount}/{history.length}
                </p>
                <p className="text-[11px] text-slate-400">Câu phản xạ đạt</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <p className="text-xl font-extrabold text-amber-400">
                  {avgSpeed}s
                </p>
                <p className="text-[11px] text-slate-400">Tốc độ TB / câu</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <p className="text-xl font-extrabold text-sky-400">
                  {avgScore}%
                </p>
                <p className="text-[11px] text-slate-400">Độ chuẩn phát âm</p>
              </div>
            </div>

            <button
              type="button"
              onClick={startDrill}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Chơi lại 60 Giây mới</span>
            </button>
          </div>

          {/* Detailed Word-by-Word Breakdown with Tap-to-Pronounce */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm md:text-base font-bold text-white">
                Chi tiết các câu vừa phản xạ ({history.length})
              </h3>
              <span className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                💡 Chạm vào bất kỳ chữ màu{" "}
                <strong className="text-rose-400">ĐỎ</strong> nào để nghe máy
                phát âm chậm lại riêng từ đó.
              </span>
            </div>

            <div className="space-y-3">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                      <p className="text-xs text-slate-400">
                        {item.card.sentence_vi}
                      </p>

                      {/* Interactive Green/Red Word Badges */}
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
                                title={`Chạm để nghe phát âm chậm từ "${wb.cleanWord}" (0.7x)`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 ${
                                  isCorrect
                                    ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60"
                                    : "text-rose-400 bg-rose-950/60 border border-rose-500/40 underline decoration-rose-500 decoration-wavy underline-offset-4 hover:bg-rose-900/60"
                                }`}
                              >
                                {isCorrect ? (
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <Volume2 className="w-3 h-3 text-rose-400 shrink-0" />
                                )}
                                <span>{wb.originalWord}</span>
                              </button>

                              {!isCorrect && wb.spokenAs && (
                                <span className="mt-1 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/30 text-[10px] font-medium text-rose-300/90 leading-tight">
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
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 shrink-0"
                      title="Nghe phát âm cả câu (1x)"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400 truncate max-w-[60%]">
                      Bạn nói: <em className="text-slate-200">{item.spoken}</em>
                    </span>
                    <span
                      className={`font-extrabold px-2.5 py-0.5 rounded-lg border ${
                        item.passed
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                          : "text-rose-400 bg-rose-500/10 border-rose-500/30"
                      }`}
                    >
                      Đúng {item.correctCount}/{item.totalCount} từ (
                      {item.score}% • {item.responseTimeSec}s)
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
