"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  Mic,
  Timer,
  Play,
  Trophy,
  SkipForward,
  Volume2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { getCards, recordStudyActivity } from "@/lib/dataService";
import { Card } from "@/lib/seedData";
import {
  evaluateSpeechAccuracy,
  speakEnglish,
  SpeechRecognizerController,
  startSpeechRecognition,
} from "@/lib/speech";

const TOTAL_DRILL_SECONDS = 60;
const PER_CARD_SECONDS = 7;

interface DrillHistoryItem {
  card: Card;
  spoken: string;
  score: number;
  responseTimeSec: number;
  passed: boolean;
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
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [drillCards, setDrillCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [globalTimeLeft, setGlobalTimeLeft] = useState(TOTAL_DRILL_SECONDS);
  const [cardTimeLeft, setCardTimeLeft] = useState(PER_CARD_SECONDS);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastFeedback, setLastFeedback] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [history, setHistory] = useState<DrillHistoryItem[]>([]);
  const [micActive, setMicActive] = useState(false);

  const recognizerRef = useRef<SpeechRecognizerController | null>(null);
  const cardStartTimeRef = useRef<number>(Date.now());
  const advancingRef = useRef<boolean>(false);

  useEffect(() => {
    async function load() {
      const cards = await getCards();
      setAllCards(cards);
    }
    load();
    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  const currentCard = drillCards[currentIdx];

  const stopMic = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setMicActive(false);
  }, []);

  const finishDrill = useCallback(() => {
    stopMic();
    setStatus("finished");
    recordStudyActivity();
  }, [stopMic]);

  const advanceToNextCard = useCallback(
    (spokenText: string, explicitScore?: number) => {
      if (advancingRef.current || status !== "running") return;
      advancingRef.current = true;
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

      const evalResult = evaluateSpeechAccuracy(card.sentence_en, spokenText);
      const finalScore =
        explicitScore !== undefined ? explicitScore : evalResult.score;
      const passed = finalScore >= 60;

      setLastFeedback({ score: finalScore, passed });
      setHistory((prev) => [
        ...prev,
        {
          card,
          spoken: spokenText || "(Hết giờ 7s)",
          score: finalScore,
          responseTimeSec: elapsedSec,
          passed,
        },
      ]);

      setTimeout(() => {
        setLastFeedback(null);
        setLiveTranscript("");
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

  // Start microphone whenever current card changes during running state
  useEffect(() => {
    if (status !== "running" || !currentCard || advancingRef.current) return;

    cardStartTimeRef.current = Date.now();
    setLiveTranscript("");
    setMicActive(true);

    const controller = startSpeechRecognition({
      onInterimResult: (interim) => {
        setLiveTranscript(interim);
        const quickEval = evaluateSpeechAccuracy(
          currentCard.sentence_en,
          interim
        );
        if (quickEval.score >= 82) {
          advanceToNextCard(interim, quickEval.score);
        }
      },
      onFinalResult: (finalStr) => {
        setLiveTranscript(finalStr);
        advanceToNextCard(finalStr);
      },
      onError: () => {
        setMicActive(false);
      },
      onEnd: () => {
        setMicActive(false);
      },
    });

    recognizerRef.current = controller;

    return () => {
      controller?.stop();
    };
  }, [currentIdx, status, currentCard, advanceToNextCard]);

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
          advanceToNextCard(liveTranscript);
          return PER_CARD_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, finishDrill, advanceToNextCard, liveTranscript]);

  function startDrill() {
    const practiced = allCards.filter(
      (c) => c.last_practiced_at !== null || c.box > 1
    );
    const pool = practiced.length >= 5 ? practiced : allCards;
    const shuffled = shuffleCards(pool);

    setDrillCards(shuffled);
    setHistory([]);
    setCurrentIdx(0);
    setGlobalTimeLeft(TOTAL_DRILL_SECONDS);
    setCardTimeLeft(PER_CARD_SECONDS);
    setLiveTranscript("");
    setLastFeedback(null);
    advancingRef.current = false;
    setStatus("running");
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
              <p className="text-sm font-bold text-emerald-400">Chấm điểm AI</p>
              <p className="text-xs text-slate-400 mt-1">
                Đo tốc độ & độ chuẩn phát âm
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
                    {lastFeedback.passed ? "Phản xạ chuẩn!" : "Chưa khớp!"} (
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

              {/* Active Mic Visualizer */}
              <div className="flex flex-col items-center justify-center py-3 space-y-3">
                <div className="relative flex items-center justify-center">
                  {micActive && (
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 absolute animate-pulse-ring" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${
                      micActive
                        ? "bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/40"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    <Mic className="w-7 h-7" />
                  </div>
                </div>

                <div className="min-h-[48px] w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs md:text-sm text-slate-300 font-medium">
                    {liveTranscript ? (
                      <>&ldquo;{liveTranscript}&rdquo;</>
                    ) : (
                      <span className="text-slate-500">
                        Đang lắng nghe giọng nói của bạn...
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    advanceToNextCard(currentCard.sentence_en, 95)
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

      {/* STATE 3: FINISHED SUMMARY & REFLEX SCORE */}
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

          {/* Detailed Breakdown */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm md:text-base font-bold text-white">
              Chi tiết các câu vừa phản xạ ({history.length})
            </h3>
            <div className="space-y-2.5">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">
                        {item.card.sentence_vi}
                      </p>
                      <p className="text-sm md:text-base font-bold text-white mt-0.5">
                        {item.card.sentence_en}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(item.card.sentence_en, 1.0)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 shrink-0"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                    <span className="text-slate-400 truncate max-w-[65%]">
                      Bạn nói: <em className="text-slate-200">{item.spoken}</em>
                    </span>
                    <span
                      className={`font-bold ${
                        item.passed ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {item.score}% ({item.responseTimeSec}s)
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
