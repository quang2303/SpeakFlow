"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  RotateCcw,
  Bot,
  Lightbulb,
  Send,
  History,
  BookOpen,
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Headphones,
  CheckCircle2,
  Languages,
  Coffee,
  Utensils,
  Building2,
  Plane,
  ShoppingBag,
  Stethoscope,
  Briefcase,
  Laptop,
  TrendingUp,
  Presentation,
  Users,
  PhoneCall,
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
  SpeechRecognizerController,
  startSpeechRecognition,
} from "@/lib/speech";
import {
  CEFRLevel,
  CorrectionMode,
  InteractionMode,
  RoleplayMessage,
  RoleplayScenario,
  RoleplaySession,
  SessionSummary,
  TutorCorrection,
} from "@/lib/ai/types";
import {
  ROLEPLAY_SCENARIOS,
  getDefaultScenario,
  getScenarioById,
} from "@/lib/ai/scenarios";
import {
  deleteSession,
  getStoredSessionMessages,
  getStoredSessions,
  saveSession,
  saveSessionMessage,
} from "@/lib/roleplayService";
import SaveToFlashcardModal from "@/components/roleplay/SaveToFlashcardModal";
import SessionSummaryModal from "@/components/roleplay/SessionSummaryModal";

const SCENARIO_ICONS: Record<string, any> = {
  Coffee,
  Utensils,
  Building2,
  Plane,
  ShoppingBag,
  Stethoscope,
  Briefcase,
  Laptop,
  TrendingUp,
  Presentation,
  Users,
  PhoneCall,
};

function RoleplayContent() {
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario") || searchParams.get("scenario_id");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Screen state: "setup" | "conversation"
  const [screenMode, setScreenMode] = useState<"setup" | "conversation">("setup");

  // Setup options
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario>(
    getDefaultScenario()
  );
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>("B1");
  const [userRole, setUserRole] = useState(getDefaultScenario().defaultUserRole);
  const [aiRole, setAiRole] = useState(getDefaultScenario().defaultAiRole);
  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("text");
  const [correctionMode, setCorrectionMode] =
    useState<CorrectionMode>("gentle");

  // Active Session state
  const [currentSession, setCurrentSession] = useState<RoleplaySession | null>(
    null
  );
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Input & Speech state
  const [textInput, setTextInput] = useState("");
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [micState, setMicState] = useState<MicVisualState>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Past sessions
  const [pastSessions, setPastSessions] = useState<RoleplaySession[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Modals state
  const [flashcardModalData, setFlashcardModalData] = useState<{
    isOpen: boolean;
    phraseEn: string;
    sentenceEn: string;
    meaningVi: string;
    sentenceVi: string;
    contextNote: string;
    level: CEFRLevel;
  }>({
    isOpen: false,
    phraseEn: "",
    sentenceEn: "",
    meaningVi: "",
    sentenceVi: "",
    contextNote: "",
    level: "B1",
  });

  const [summaryModalData, setSummaryModalData] = useState<{
    isOpen: boolean;
    summary: SessionSummary | null;
  }>({
    isOpen: false,
    summary: null,
  });

  const [revealedTranslationIds, setRevealedTranslationIds] = useState<
    Set<string>
  >(new Set());

  const recognizerRef = useRef<SpeechRecognizerController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (screenMode === "conversation") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, screenMode, isAiLoading]);

  // Load user profile & past sessions
  useEffect(() => {
    const user = getStoredUserProfile();
    setCurrentUser(user);
    setPastSessions(getStoredSessions());

    if (scenarioParam) {
      const found = getScenarioById(scenarioParam);
      if (found) {
        handleSelectScenario(found);
      }
    }

    const authHandler = () => {
      const u = getStoredUserProfile();
      setCurrentUser(u);
      setPastSessions(getStoredSessions());
    };
    window.addEventListener("speakflow-auth-changed", authHandler);

    return () => {
      window.removeEventListener("speakflow-auth-changed", authHandler);
      recognizerRef.current?.stop();
      stopAudioPlayback();
    };
  }, [scenarioParam]);

  function stopAudioPlayback() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setIsAudioPlaying(false);
  }

  function handleSelectScenario(scenario: RoleplayScenario) {
    setSelectedScenario(scenario);
    setUserRole(scenario.defaultUserRole);
    setAiRole(scenario.defaultAiRole);
    setSelectedLevel(scenario.recommendedLevel);
  }

  // Start new roleplay conversation
  async function handleStartConversation() {
    stopAudioPlayback();
    recognizerRef.current?.stop();

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${Date.now()}`;

    const newSession: RoleplaySession = {
      id: sessionId,
      user_id: currentUser ? currentUser.id : null,
      scenario_id: selectedScenario.id,
      topic: selectedScenario.title,
      cefr_level: selectedLevel,
      user_role: userRole,
      ai_role: aiRole,
      learning_mode: interactionMode,
      correction_mode: correctionMode,
      started_at: new Date().toISOString(),
      completed_at: null,
      status: "in_progress",
      summary: null,
    };

    // Initial greeting from AI Tutor
    const starterMsg: RoleplayMessage = {
      id: `msg-${Date.now()}-0`,
      session_id: sessionId,
      role: "assistant",
      content: selectedScenario.starterAiPrompt,
      content_vi: selectedScenario.starterAiPromptVi,
      suggested_replies: selectedScenario.starterReplies || [],
      tutor_correction: null,
      is_voice: interactionMode === "voice",
      created_at: new Date().toISOString(),
    };

    await saveSession(newSession);
    await saveSessionMessage(starterMsg);

    setCurrentSession(newSession);
    setMessages([starterMsg]);
    setSessionStartTime(Date.now());
    setTextInput("");
    setSpokenTranscript("");
    setMicState("idle");
    setMicError(null);
    setScreenMode("conversation");

    // Automatically speak the starter greeting in Voice Mode
    if (interactionMode === "voice") {
      setIsAudioPlaying(true);
      speakEnglish(starterMsg.content, 1.0, () => setIsAudioPlaying(false));
    }
  }

  // Resume or view a past session
  function handleOpenPastSession(session: RoleplaySession) {
    stopAudioPlayback();
    recognizerRef.current?.stop();

    const loadedMessages = getStoredSessionMessages(session.id);
    const scenario = getScenarioById(session.scenario_id) || getDefaultScenario();

    setCurrentSession(session);
    setSelectedScenario(scenario);
    setSelectedLevel(session.cefr_level);
    setUserRole(session.user_role);
    setAiRole(session.ai_role);
    setInteractionMode(session.learning_mode);
    setCorrectionMode(session.correction_mode);
    setMessages(loadedMessages);
    setScreenMode("conversation");
    setShowHistoryDrawer(false);

    if (session.summary) {
      setSummaryModalData({
        isOpen: true,
        summary: session.summary,
      });
    }
  }

  // Delete a past session
  async function handleDeletePastSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteSession(sessionId);
    setPastSessions(getStoredSessions());
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
      setScreenMode("setup");
    }
  }

  // Send user message (from text input or spoken transcript)
  async function handleSendMessage(rawText: string, isFromVoice = false) {
    const textToSend = rawText.trim();
    if (!textToSend || !currentSession || isAiLoading) return;

    stopAudioPlayback();
    setTextInput("");
    setSpokenTranscript("");
    setMicState("idle");
    setMicError(null);

    // Compute pronunciation evaluation if voice
    let matchScore: number | undefined;
    if (isFromVoice) {
      const evalRes = evaluatePronunciation(textToSend, textToSend);
      matchScore = evalRes.sentenceMatchScore;
    }

    const userMsg: RoleplayMessage = {
      id: `msg-${Date.now()}-user`,
      session_id: currentSession.id,
      role: "user",
      content: textToSend,
      is_voice: isFromVoice,
      audio_match_score: matchScore,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    await saveSessionMessage(userMsg);

    // Call server AI route
    setIsAiLoading(true);

    try {
      const historyPayload = updatedMessages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: textToSend,
          scenarioId: selectedScenario.id,
          scenarioTitle: selectedScenario.title,
          scenarioContext: selectedScenario.contextVi,
          userRole: currentSession.user_role,
          aiRole: currentSession.ai_role,
          level: currentSession.cefr_level,
          correctionMode: currentSession.correction_mode,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi máy chủ (${res.status})`);
      }

      const aiData = await res.json();

      const aiMsg: RoleplayMessage = {
        id: `msg-${Date.now()}-ai`,
        session_id: currentSession.id,
        role: "assistant",
        content: aiData.replyEn,
        content_vi: aiData.replyVi,
        tutor_correction: aiData.tutorCorrection,
        suggested_replies: aiData.suggestedReplies || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      await saveSessionMessage(aiMsg);

      // Log study activity
      void logStudyActivity({
        mode: "roleplay",
        card_id: selectedScenario.id,
        phrase_en: aiData.tutorCorrection?.correctedSentence || textToSend.slice(0, 30),
        sentence_en: textToSend,
        spoken_text: textToSend,
        score: matchScore || 100,
        mispronounced_words: [],
      });

      // If in Voice Mode, automatically read the AI reply
      if (interactionMode === "voice") {
        setIsAudioPlaying(true);
        speakEnglish(aiData.replyEn, 1.0, () => setIsAudioPlaying(false));
      }
    } catch (err: any) {
      const errorMsg: RoleplayMessage = {
        id: `msg-${Date.now()}-error`,
        session_id: currentSession.id,
        role: "system",
        content: `⚠️ ${err.message || "Không thể kết nối với AI Tutor. Vui lòng thử lại."}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  }

  // Toggle Microphone in Voice Mode
  function handleToggleMic() {
    stopAudioPlayback();

    if (micState === "listening") {
      recognizerRef.current?.stop();
      return;
    }

    setMicError(null);
    setSpokenTranscript("");
    setMicState("listening");

    const controller = startSpeechRecognition({
      onStateChange: (state) => setMicState(state),
      onInterimResult: (liveText) => {
        setSpokenTranscript(liveText);
      },
      onFinalResult: (finalText) => {
        setSpokenTranscript(finalText);
        setMicState("idle");
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

  // End roleplay session and generate summary
  async function handleEndSession() {
    if (!currentSession || isSummarizing) return;

    stopAudioPlayback();
    recognizerRef.current?.stop();
    setIsSummarizing(true);

    const durationSeconds = Math.max(
      15,
      Math.floor((Date.now() - sessionStartTime) / 1000)
    );

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
        correction: m.tutor_correction,
      }));

      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioTitle: currentSession.topic,
          cefrLevel: currentSession.cefr_level,
          durationSeconds,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể tạo bản tổng kết buổi học.");
      }

      const summary = (await res.json()) as SessionSummary;

      const updatedSession: RoleplaySession = {
        ...currentSession,
        completed_at: new Date().toISOString(),
        status: "completed",
        summary,
      };

      await saveSession(updatedSession);
      setCurrentSession(updatedSession);
      setPastSessions(getStoredSessions());

      setSummaryModalData({
        isOpen: true,
        summary,
      });
    } catch (err: any) {
      alert(err.message || "Lỗi tổng hợp kết quả buổi học.");
    } finally {
      setIsSummarizing(false);
    }
  }

  function handleOpenFlashcardModalForMessage(
    sentenceEn: string,
    sentenceVi?: string,
    phraseEn?: string
  ) {
    setFlashcardModalData({
      isOpen: true,
      phraseEn: phraseEn || "",
      sentenceEn,
      meaningVi: sentenceVi || "",
      sentenceVi: sentenceVi || "",
      contextNote: `Hội thoại tình huống: ${currentSession?.topic || selectedScenario.title}`,
      level: currentSession?.cefr_level || selectedLevel,
    });
  }

  function toggleTranslation(id: string) {
    setRevealedTranslationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* =========================================================================
          SCREEN 1: SETUP SCREEN (MÀN HÌNH LỰA CHỌN BÀI HỌC)
      ========================================================================= */}
      {screenMode === "setup" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>AI English Tutor</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                    Live
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Gia sư tiếng Anh thông minh – Thực hành hội thoại theo ngữ cảnh & sửa lỗi thời gian thực
                </p>
              </div>
            </div>

            {/* History Button */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <History className="w-4 h-4 text-brand-600" />
              <span className="hidden sm:inline">Lịch sử buổi học</span>
              {pastSessions.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center ml-0.5">
                  {pastSessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Past sessions drawer / preview if toggled */}
          {showHistoryDrawer && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-brand-600" />
                  Các buổi học đã thực hiện ({pastSessions.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Đóng
                </button>
              </div>

              {pastSessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  Chưa có phiên học nào được ghi lại. Hãy bắt đầu phiên đầu tiên bên dưới!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {pastSessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenPastSession(s)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all cursor-pointer text-left flex items-start justify-between gap-2 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-brand-700">
                            {s.topic}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {s.cefr_level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {s.user_role} vs {s.ai_role} • {s.learning_mode === "voice" ? "🎙️ Voice" : "💬 Text"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(s.started_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {s.summary && (
                            <span className="ml-2 text-emerald-600 font-semibold">
                              ✓ {s.summary.accomplishmentScore}%
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePastSession(s.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Xóa buổi học này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Setup Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Step 1: CEFR Level */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>1. Chọn Trình độ CEFR của bạn:</span>
                <span className="text-brand-600 lowercase font-normal">
                  (AI sẽ tự điều chỉnh từ vựng và tốc độ)
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFRLevel[]).map(
                  (lvl) => {
                    const active = selectedLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          active
                            ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs ring-1 ring-brand-400"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-base font-bold">{lvl}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {lvl === "A1" && "Mới bắt đầu"}
                          {lvl === "A2" && "Sơ cấp"}
                          {lvl === "B1" && "Trung cấp"}
                          {lvl === "B2" && "Trung cao"}
                          {lvl === "C1" && "Cao cấp"}
                          {lvl === "C2" && "Thành thạo"}
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Step 2: Topic Selection (12 Scenarios) */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>2. Chọn Chủ đề & Ngữ cảnh giao tiếp:</span>
                <span className="text-slate-400 font-normal">
                  12 tình huống thực tế
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {ROLEPLAY_SCENARIOS.map((item) => {
                  const active = selectedScenario.id === item.id;
                  const IconComp = SCENARIO_ICONS[item.icon] || MessageSquare;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectScenario(item)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        active
                          ? "bg-gradient-to-br from-brand-50/90 to-emerald-50/50 border-brand-300 shadow-xs ring-1 ring-brand-400"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          active
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.title}
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 shrink-0">
                            {item.recommendedLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {item.titleVi}: {item.contextVi}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Roles Configuration */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                3. Vai trò đối thoại:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-brand-700 block">
                    👤 Vai trò của bạn (Học viên):
                  </span>
                  <input
                    type="text"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-indigo-700 block">
                    🤖 Vai trò của AI Tutor:
                  </span>
                  <input
                    type="text"
                    value={aiRole}
                    onChange={(e) => setAiRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Modes & Correction Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
              {/* Interaction Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Phương thức hội thoại:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInteractionMode("text")}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      interactionMode === "text"
                        ? "bg-brand-50 text-brand-700 border-brand-300 shadow-2xs ring-1 ring-brand-400"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-brand-600" />
                    <span>Text Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInteractionMode("voice")}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      interactionMode === "voice"
                        ? "bg-brand-50 text-brand-700 border-brand-300 shadow-2xs ring-1 ring-brand-400"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Headphones className="w-4 h-4 text-emerald-600" />
                    <span>Voice Mode</span>
                  </button>
                </div>
              </div>

              {/* Correction Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Chế độ sửa lỗi:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "gentle", label: "Nhẹ nhàng", tip: "Mặc định" },
                      { key: "standard", label: "Tiêu chuẩn", tip: "Mỗi câu" },
                      { key: "intensive", label: "Chuyên sâu", tip: "Chi tiết" },
                    ] as const
                  ).map((m) => {
                    const active = correctionMode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setCorrectionMode(m.key)}
                        className={`p-2.5 rounded-2xl border text-center transition-all ${
                          active
                            ? "bg-brand-50 text-brand-700 border-brand-300 shadow-2xs ring-1 ring-brand-400"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-xs font-bold">{m.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{m.tip}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartConversation}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
              >
                <span>Bắt đầu phiên luyện nói với AI Tutor</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: ACTIVE CONVERSATION SCREEN (MÀN HÌNH HỘI THOẠI AI)
      ========================================================================= */}
      {screenMode === "conversation" && currentSession && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Session Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScreenMode("setup")}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Quay lại cài đặt"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {currentSession.topic}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-bold border border-brand-200">
                    {currentSession.cefr_level}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    {currentSession.learning_mode === "voice" ? "🎙️ Voice Mode" : "💬 Text Mode"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bạn: <strong className="text-slate-800">{currentSession.user_role}</strong> • AI:{" "}
                  <strong className="text-indigo-700">{currentSession.ai_role}</strong>
                </p>
              </div>
            </div>

            {/* End Session Button */}
            <button
              type="button"
              onClick={handleEndSession}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors shadow-2xs"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tổng kết...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kết thúc buổi học</span>
                </>
              )}
            </button>
          </div>

          {/* Context note banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-600 flex items-center justify-between">
            <span>
              💡 <strong>Bối cảnh:</strong> {selectedScenario.contextVi}
            </span>
            {isAudioPlaying && (
              <button
                type="button"
                onClick={stopAudioPlayback}
                className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-semibold hover:underline ml-2 shrink-0"
              >
                <VolumeX className="w-3 h-3" />
                Dừng đọc
              </button>
            )}
          </div>

          {/* Message List */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm min-h-[380px] max-h-[580px] overflow-y-auto space-y-5">
            {messages.map((msg, idx) => {
              const isAi = msg.role === "assistant";
              const isSys = msg.role === "system";
              const isUser = msg.role === "user";
              const isTransShown = revealedTranslationIds.has(msg.id);

              if (isSys) {
                return (
                  <div
                    key={msg.id}
                    className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs text-center"
                  >
                    {msg.content}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-2 ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  {/* Speaker Label */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                    {isAi ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold text-indigo-900">
                          {currentSession.ai_role}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700">
                          {currentSession.user_role} (Bạn)
                        </span>
                        {msg.is_voice && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-md border border-emerald-200 font-medium">
                            🎙️ Spoken
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-3xl p-4 space-y-2.5 text-sm shadow-2xs ${
                      isUser
                        ? "bg-gradient-to-br from-brand-600 to-emerald-600 text-white rounded-tr-xs"
                        : "bg-slate-50 border border-slate-200/90 text-slate-900 rounded-tl-xs"
                    }`}
                  >
                    <p className="leading-relaxed font-medium">
                      {msg.content}
                    </p>

                    {/* Vietnamese translation toggle */}
                    {msg.content_vi && (
                      <div className="pt-1 border-t border-slate-200/60">
                        {isTransShown ? (
                          <p className="text-xs text-slate-500 italic">
                            🇻🇳 {msg.content_vi}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleTranslation(msg.id)}
                            className="text-[11px] font-semibold text-brand-600 hover:underline flex items-center gap-1"
                          >
                            <Languages className="w-3 h-3" />
                            Xem bản dịch tiếng Việt
                          </button>
                        )}
                      </div>
                    )}

                    {/* AI Message Action Buttons */}
                    {isAi && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        {/* Audio 1.0x */}
                        <button
                          type="button"
                          onClick={() => {
                            stopAudioPlayback();
                            setIsAudioPlaying(true);
                            speakEnglish(msg.content, 1.0, () =>
                              setIsAudioPlaying(false)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <Volume2 className="w-3 h-3 text-brand-600" />
                          <span>Nghe 1.0x</span>
                        </button>

                        {/* Audio slow 0.75x */}
                        <button
                          type="button"
                          onClick={() => {
                            stopAudioPlayback();
                            setIsAudioPlaying(true);
                            speakEnglish(msg.content, 0.75, () =>
                              setIsAudioPlaying(false)
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <Volume2 className="w-3 h-3 text-indigo-600" />
                          <span>Chậm 0.75x</span>
                        </button>

                        {/* Add AI utterance to Flashcard */}
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenFlashcardModalForMessage(
                              msg.content,
                              msg.content_vi
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-brand-50 text-brand-700 border border-slate-200 text-[11px] font-semibold transition-colors shadow-2xs ml-auto"
                          title="Lưu câu này vào bộ thẻ Flashcard"
                        >
                          <BookOpen className="w-3 h-3 text-brand-600" />
                          <span className="hidden sm:inline">Lưu Flashcard</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Smart Correction Card for User utterances */}
                  {isUser && msg.tutor_correction && msg.tutor_correction.hasError && (
                    <div className="max-w-[88%] sm:max-w-[78%] bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 text-xs text-left shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                          Gợi ý sửa câu từ AI Tutor ({msg.tutor_correction.errorType}):
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenFlashcardModalForMessage(
                              msg.tutor_correction!.correctedSentence,
                              msg.tutor_correction!.explanationVi
                            )
                          }
                          className="text-[10px] font-bold text-brand-700 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          Lưu câu sửa vào Flashcard
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-500 line-through">
                          &ldquo;{msg.tutor_correction.originalSentence}&rdquo;
                        </p>
                        <p className="font-bold text-emerald-800">
                          👉 &ldquo;{msg.tutor_correction.correctedSentence}&rdquo;
                        </p>
                      </div>

                      {msg.tutor_correction.explanationVi && (
                        <p className="text-slate-700 bg-white/70 p-2 rounded-xl border border-amber-100 text-[11px] leading-relaxed">
                          💡 {msg.tutor_correction.explanationVi}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Suggested Replies rendered right below assistant message */}
                  {isAi &&
                    idx === messages.length - 1 &&
                    msg.suggested_replies &&
                    msg.suggested_replies.length > 0 && (
                      <div className="w-full space-y-1.5 pt-1 pl-1">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          Gợi ý câu bạn có thể trả lời tiếp theo:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.suggested_replies.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSendMessage(sug.en, false)}
                              className="text-left p-2.5 rounded-2xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-xs transition-colors group shadow-2xs"
                            >
                              <p className="font-semibold text-slate-800 group-hover:text-emerald-800">
                                &ldquo;{sug.en}&rdquo;
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {sug.vi}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}

            {/* AI thinking state */}
            {isAiLoading && (
              <div className="flex items-center gap-2 p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-700 font-semibold animate-pulse w-fit">
                <Bot className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>AI Tutor đang lắng nghe và suy nghĩ câu đối đáp...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            {/* Voice Mode Controls */}
            {interactionMode === "voice" ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    disabled={isAiLoading}
                    className={`px-7 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-sm ${
                      micState === "listening"
                        ? "bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse"
                        : micState === "processing"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {micState === "listening" ? (
                      <>
                        <Mic className="w-5 h-5" />
                        <span>Đang thu âm... (Bấm để hoàn tất)</span>
                      </>
                    ) : micState === "processing" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Đang xử lý giọng nói...</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-5 h-5" />
                        <span>Bấm Mic để trả lời bằng giọng nói</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Nói rõ ràng từng từ tiếng Anh vào microphone của thiết bị
                  </span>
                </div>

                {/* Spoken preview confirmation (ensures incomplete transcripts aren't sent blindly) */}
                {spokenTranscript && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">
                        Văn bản vừa nhận diện:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSpokenTranscript("")}
                        className="text-slate-400 hover:text-slate-600 text-[11px]"
                      >
                        Hủy
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={spokenTranscript}
                      onChange={(e) => setSpokenTranscript(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                      >
                        Nói lại
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage(spokenTranscript, true)}
                        disabled={isAiLoading || !spokenTranscript.trim()}
                        className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi câu trả lời</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Text Mode Controls */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(textInput, false);
                }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <textarea
                    rows={2}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(textInput, false);
                      }
                    }}
                    placeholder={`Nhập câu đối đáp của ${currentSession.user_role} bằng tiếng Anh (Enter để gửi)...`}
                    maxLength={500}
                    disabled={isAiLoading}
                    className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !textInput.trim()}
                    className="p-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors shrink-0 shadow-xs"
                    title="Gửi câu đối đáp"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Shift + Enter để xuống dòng</span>
                  <span>{textInput.length}/500</span>
                </div>
              </form>
            )}

            {micError && (
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{micError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS: SAVE TO FLASHCARD & POST-SESSION SUMMARY
      ========================================================================= */}
      <SaveToFlashcardModal
        isOpen={flashcardModalData.isOpen}
        onClose={() =>
          setFlashcardModalData((prev) => ({ ...prev, isOpen: false }))
        }
        initialPhraseEn={flashcardModalData.phraseEn}
        initialSentenceEn={flashcardModalData.sentenceEn}
        initialMeaningVi={flashcardModalData.meaningVi}
        initialSentenceVi={flashcardModalData.sentenceVi}
        initialContextNote={flashcardModalData.contextNote}
        initialLevel={flashcardModalData.level}
        currentUser={currentUser}
      />

      <SessionSummaryModal
        isOpen={summaryModalData.isOpen}
        onClose={() =>
          setSummaryModalData((prev) => ({ ...prev, isOpen: false }))
        }
        summary={summaryModalData.summary}
        currentUser={currentUser}
        onStartNewSession={() => {
          setSummaryModalData({ isOpen: false, summary: null });
          setScreenMode("setup");
        }}
      />
    </div>
  );
}

export default function RoleplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <RoleplayContent />
    </Suspense>
  );
}
