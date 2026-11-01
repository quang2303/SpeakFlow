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
  Bot,
  Lightbulb,
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

interface AIReplyData {
  replyEn: string;
  replyVi: string;
  feedbackVi: string;
  suggestedReplies: Array<{
    en: string;
    vi: string;
  }>;
  source?: "gemini" | "builtin";
}

const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: "rp-1",
    title: "Báo cáo tiến độ Standup",
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
    title: "Họp Online & âm thanh bị giật",
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
  const [aiReply, setAiReply] = useState<AIReplyData | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
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
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const scenario = ROLEPLAY_SCENARIOS[activeIdx];

  function handleSelectScenario(idx: number) {
    recognizerRef.current?.stop();
    setActiveIdx(idx);
    setSpokenText("");
    setEvalResult(null);
    setMicState("idle");
    setMicError(null);
    setAiReply(null);
    setIsLoadingAi(false);
  }

  function handleToggleMic() {
    if (micState === "listening") {
      recognizerRef.current?.stop();
      return;
    }

    setMicError(null);
    setSpokenText("");
    setEvalResult(null);
    setAiReply(null);
    setIsLoadingAi(false);
    setMicState("listening");

    const controller = startSpeechRecognition({
      onStateChange: (state) => setMicState(state),
      onInterimResult: (liveText) => {
        setSpokenText(liveText);
      },
      onFinalResult: (finalTranscript) => {
        setSpokenText(finalTranscript);
        setMicState("idle");
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

        // Trigger AI conversational response & smart feedback
        setIsLoadingAi(true);
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: finalTranscript,
            scenarioTitle: scenario.title,
            scenarioContext: scenario.contextVi,
            level: "B1",
          }),
        })
          .then((res) => res.json())
          .then((data: AIReplyData) => {
            if (data && data.replyEn) {
              setAiReply(data);
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsLoadingAi(false);
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

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Nhập vai đối thoại
          </h1>
          <p className="text-xs text-slate-500">
            Lắng nghe và luyện phản hồi bằng giọng nói tự nhiên
          </p>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLEPLAY_SCENARIOS.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelectScenario(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
              activeIdx === idx
                ? "bg-brand-50 text-brand-600 border-brand-200 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
            }`}
          >
            Tình huống {idx + 1}: {item.title}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
            Bối cảnh giao tiếp
          </span>
          <p className="text-sm md:text-base font-semibold text-slate-900 mt-0.5">
            {scenario.contextVi}
          </p>
        </div>

        {/* Partner bubble */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-600">
              👤 Đối phương hỏi:
            </span>
            <button
              type="button"
              onClick={() => speakEnglish(scenario.partnerLineEn, 1.0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-brand-600" />
              Nghe câu hỏi
            </button>
          </div>
          <p className="text-base md:text-lg font-bold text-slate-900">
            &ldquo;{scenario.partnerLineEn}&rdquo;
          </p>
          <p className="text-xs text-slate-500">{scenario.partnerLineVi}</p>
        </div>

        {/* User reply prompt */}
        <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Câu trả lời mẫu của bạn:
            </span>
            <button
              type="button"
              onClick={() => speakEnglish(scenario.targetReplyEn, 1.0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-brand-600" />
              Nghe mẫu
            </button>
          </div>
          <p className="text-base md:text-lg font-bold text-slate-900">
            &ldquo;{scenario.targetReplyEn}&rdquo;
          </p>
          <p className="text-xs text-slate-600">{scenario.targetReplyVi}</p>
        </div>

        {/* Mic Practice */}
        <div className="flex flex-col items-center space-y-3 pt-2">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`px-7 py-3.5 rounded-2xl font-semibold text-sm flex items-center gap-2.5 transition-all shadow-sm ${
              micState === "listening"
                ? "bg-rose-600 text-white ring-2 ring-rose-300"
                : micState === "processing"
                ? "bg-brand-600 text-white"
                : "bg-brand-600 hover:bg-brand-700 text-white"
            }`}
          >
            {micState === "listening" ? (
              <>
                <Mic className="w-5 h-5 animate-pulse" />
                <span>Đang thu âm... (Bấm để dừng)</span>
              </>
            ) : micState === "processing" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang chấm điểm...</span>
              </>
            ) : (
              <>
                <MicOff className="w-5 h-5" />
                <span>Bấm Mic để đóng vai trả lời</span>
              </>
            )}
          </button>

          {micError && (
            <div className="w-full flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {evalResult && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Bạn nói: <em className="text-slate-800">{spokenText}</em>
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                    evalResult.score >= 80
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                        ok
                          ? "text-emerald-700 bg-white border-emerald-300"
                          : "text-rose-700 bg-white border-rose-300 underline decoration-rose-500 decoration-wavy"
                      }`}
                    >
                      {ok ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <RotateCcw className="w-3 h-3 text-rose-500" />
                      )}
                      <span>{wb.originalWord}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Partner Response & Feedback Card */}
          {isLoadingAi && (
            <div className="w-full bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-center justify-center gap-2 text-indigo-700 text-xs font-semibold animate-pulse">
              <Bot className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>AI Tutor đang lắng nghe và soạn câu đối đáp...</span>
            </div>
          )}

          {aiReply && !isLoadingAi && (
            <div className="w-full bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 border border-indigo-200/90 rounded-2xl p-5 space-y-4 shadow-sm text-left">
              <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2.5">
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  AI Partner phản hồi ({aiReply.source === "gemini" ? "Gemini 1.5" : "Smart Tutor"}):
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(aiReply.replyEn, 1.0)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold transition-colors shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  Nghe AI nói
                </button>
              </div>

              <div>
                <p className="text-base font-bold text-slate-900 leading-snug">
                  &ldquo;{aiReply.replyEn}&rdquo;
                </p>
                <p className="text-xs text-slate-600 mt-1">{aiReply.replyVi}</p>
              </div>

              {aiReply.feedbackVi && (
                <div className="bg-white/90 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-indigo-950 font-semibold">Góp ý từ AI:</strong>{" "}
                    {aiReply.feedbackVi}
                  </p>
                </div>
              )}

              {aiReply.suggestedReplies && aiReply.suggestedReplies.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-slate-500">
                    💡 Bạn có thể tiếp tục nói:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiReply.suggestedReplies.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => speakEnglish(sug.en, 1.0)}
                        className="text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-xs transition-colors group shadow-xs"
                      >
                        <p className="font-semibold text-slate-800 group-hover:text-emerald-800 flex items-center justify-between">
                          <span>&ldquo;{sug.en}&rdquo;</span>
                          <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{sug.vi}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
