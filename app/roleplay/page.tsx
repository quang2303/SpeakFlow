"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Volume2,
  Check,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import {
  getStoredUserProfile,
  logStudyActivity,
  UserProfile,
} from "@/lib/dataService";
import AccountLockScreen from "@/components/AccountLockScreen";
import {
  evaluatePronunciation,
  MicVisualState,
  PronunciationEvaluationResult,
  speakEnglish,
  speakText,
  SpeechRecognizerController,
  startSpeechRecognition,
} from "@/lib/speech";

interface RoleplayScenario {
  id: string;
  title: string;
  contextVi: string;
  partnerLineEn: string;
  partnerLineVi: string;
  targetReplyEn: string;
  targetReplyVi: string;
  phraseEn: string;
}

const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: "rp-1",
    title: "Báo cáo tiến độ trong Daily Standup",
    contextVi: "Quản lý hỏi tiến độ tính năng đăng nhập hôm nay của bạn.",
    partnerLineEn: "How is the new login feature coming along today?",
    partnerLineVi: "Tính năng đăng nhập mới hôm nay tiến triển thế nào rồi?",
    targetReplyEn:
      "I am right on track and will finish testing it this afternoon.",
    targetReplyVi:
      "Em đang đúng tiến độ và sẽ hoàn tất kiểm thử vào chiều nay ạ.",
    phraseEn: "right on track",
  },
  {
    id: "rp-2",
    title: "Gọi món tại quán Cà phê",
    contextVi: "Nhân viên phục vụ hỏi bạn muốn dùng đồ uống gì.",
    partnerLineEn: "Good morning! What can I get started for you today?",
    partnerLineVi: "Chào buổi sáng! Hôm nay bạn muốn dùng món gì ạ?",
    targetReplyEn: "Could I get an iced oat milk latte with less sugar, please?",
    targetReplyVi: "Cho mình một ly latte sữa yến mạch đá ít đường nhé.",
    phraseEn: "Could I get",
  },
  {
    id: "rp-3",
    title: "Xử lý sự cố âm thanh khi họp Online",
    contextVi: "Đồng nghiệp nước ngoài nói hơi nhỏ và mạng bị giật.",
    partnerLineEn: "So for the Q3 roadmap, we should prioritize the mobile app...",
    partnerLineVi: "Vậy đối với lộ trình quý 3, chúng ta nên ưu tiên ứng dụng di động...",
    targetReplyEn:
      "Sorry, you are breaking up a bit. Could you repeat that last part?",
    targetReplyVi:
      "Xin lỗi, mạng bên bạn hơi giật. Bạn nhắc lại phần cuối giúp mình được không?",
    phraseEn: "breaking up a bit",
  },
];

export default function RoleplayPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [spokenText, setSpokenText] = useState("");
  const [evalResult, setEvalResult] =
    useState<PronunciationEvaluationResult | null>(null);
  const [micState, setMicState] = useState<MicVisualState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognizerController | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUserProfile());
    const handler = () => {
      setCurrentUser(getStoredUserProfile());
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => {
      window.removeEventListener("speakflow-auth-changed", handler);
      recognizerRef.current?.stop();
    };
  }, []);

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  const scenario = ROLEPLAY_SCENARIOS[activeIdx] || ROLEPLAY_SCENARIOS[0];

  function handleSelectScenario(idx: number) {
    recognizerRef.current?.stop();
    setMicState("idle");
    setActiveIdx(idx);
    setSpokenText("");
    setEvalResult(null);
    setMicError(null);
  }

  function handleToggleMic() {
    if (micState === "listening") {
      setMicState("processing");
      recognizerRef.current?.stop();
      return;
    }

    setMicError(null);
    setSpokenText("");
    setEvalResult(null);
    setMicState("listening");

    const controller = startSpeechRecognition({
      onStateChange: (next) => setMicState(next),
      onInterimResult: (interim) => {
        setSpokenText(interim);
        setEvalResult(evaluatePronunciation(scenario.targetReplyEn, interim));
      },
      onFinalResult: (finalTranscript) => {
        setSpokenText(finalTranscript);
        const result = evaluatePronunciation(
          scenario.targetReplyEn,
          finalTranscript
        );
        setEvalResult(result);
        const redWords = result.words
          .filter((w) => w.status !== "correct")
          .map((w) => w.cleanWord || w.originalWord);

        void logStudyActivity({
          mode: "roleplay",
          card_id: scenario.id,
          phrase_en: scenario.phraseEn,
          sentence_en: scenario.targetReplyEn,
          spoken_text: finalTranscript,
          score: result.score,
          mispronounced_words: redWords,
        });
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
  }

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-extrabold text-white">
              Nhập vai Đối thoại Thực chiến (Roleplay)
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Lắng nghe đối phương và phản hồi bằng giọng nói tiếng Anh
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLEPLAY_SCENARIOS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectScenario(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all ${
              activeIdx === idx
                ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-sm"
                : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Tình huống {idx + 1}: {item.title}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 md:p-7 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Bối cảnh giao tiếp
            </span>
            <p className="text-sm md:text-base font-bold text-white mt-0.5">
              {scenario.contextVi}
            </p>
          </div>
        </div>

        {/* Partner bubble */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400">
              👤 Người đối thoại nói:
            </span>
            <button
              type="button"
              onClick={() => speakEnglish(scenario.partnerLineEn, 1.0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Nghe câu hỏi
            </button>
          </div>
          <p className="text-base md:text-lg font-bold text-white">
            &ldquo;{scenario.partnerLineEn}&rdquo;
          </p>
          <p className="text-xs text-slate-400">{scenario.partnerLineVi}</p>
        </div>

        {/* User reply prompt */}
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Câu trả lời mẫu của bạn:
            </span>
            <button
              type="button"
              onClick={() => speakEnglish(scenario.targetReplyEn, 1.0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              Nghe mẫu (1x)
            </button>
          </div>
          <p className="text-base md:text-lg font-extrabold text-white">
            &ldquo;{scenario.targetReplyEn}&rdquo;
          </p>
          <p className="text-xs text-slate-300">{scenario.targetReplyVi}</p>
        </div>

        {/* Mic Practice */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`px-6 py-3.5 rounded-2xl font-extrabold text-sm flex items-center gap-2.5 transition-all shadow-lg ${
              micState === "listening"
                ? "bg-rose-600 text-white animate-pulse"
                : micState === "processing"
                ? "bg-indigo-600 text-white"
                : "bg-gradient-to-r from-indigo-500 to-sky-500 text-slate-950 hover:opacity-95"
            }`}
          >
            {micState === "listening" ? (
              <>
                <Mic className="w-5 h-5" />
                <span>Đang thu âm... (Nhấn để dừng)</span>
              </>
            ) : micState === "processing" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang chấm phát âm...</span>
              </>
            ) : (
              <>
                <MicOff className="w-5 h-5" />
                <span>Bấm Mic để đóng vai trả lời</span>
              </>
            )}
          </button>

          {micError && (
            <div className="w-full flex items-center gap-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {evalResult && (
            <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Bạn nói: <em className="text-slate-200">{spokenText}</em>
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                    evalResult.score >= 80
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  }`}
                >
                  Điểm phát âm: {evalResult.score}%
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {evalResult.words.map((wb, i) => {
                  const ok = wb.status === "correct";
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        speakText(wb.cleanWord || wb.originalWord, 0.7)
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        ok
                          ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/40"
                          : "text-rose-400 bg-rose-950/60 border-rose-500/40 underline decoration-rose-500 decoration-wavy"
                      }`}
                    >
                      {ok ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span>{wb.originalWord}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
