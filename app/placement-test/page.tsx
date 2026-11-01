"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Volume2,
  Mic,
  MicOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Check,
  BookOpen,
  Headphones,
  Compass,
  Zap,
} from "lucide-react";
import {
  AssessmentQuestion,
  AssessmentResponse,
  AssessmentResult,
  CEFRLevel,
  PublicQuestion,
  SkillCategory,
  TestMode,
} from "@/lib/assessment/types";
import {
  getAllQuestions,
  getQuestionsForTestMode,
  sanitizeQuestionForClient,
} from "@/lib/assessment/questionBank";
import {
  evaluateAssessmentSubmission,
} from "@/lib/assessment/adaptiveEngine";
import {
  computeOverallScore,
  computeSkillSummaries,
  scoreObjectiveQuestion,
  scoreSpeakingQuestion,
} from "@/lib/assessment/scoring";
import { estimateCefrProfile } from "@/lib/assessment/cefrEstimator";
import {
  bridgeAssessmentToLearningGoal,
  getLatestAssessmentResult,
  saveAssessmentResult,
} from "@/lib/assessment/assessmentService";
import {
  getStoredUserProfile,
  UserProfile,
} from "@/lib/dataService";
import {
  evaluatePronunciation,
  speakEnglish,
  startSpeechRecognition,
} from "@/lib/speech";
import AccountLockScreen from "@/components/AccountLockScreen";

const SKILL_ICONS: Record<SkillCategory, any> = {
  grammar: BookOpen,
  vocabulary: Sparkles,
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
};

const SKILL_THEMES: Record<
  SkillCategory,
  { bg: string; text: string; border: string; bar: string }
> = {
  grammar: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    bar: "bg-blue-600",
  },
  vocabulary: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    bar: "bg-purple-600",
  },
  reading: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    bar: "bg-emerald-600",
  },
  listening: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-600",
  },
  speaking: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    bar: "bg-rose-600",
  },
};

const CEFR_BADGES: Record<
  CEFRLevel,
  { label: string; bg: string; text: string; desc: string }
> = {
  A1: {
    label: "A1 – Căn bản (Beginner)",
    bg: "bg-slate-100",
    text: "text-slate-800",
    desc: "Hiểu và giao tiếp được các câu chào hỏi, thông tin cá nhân rất đơn giản.",
  },
  A2: {
    label: "A2 – Sơ cấp (Elementary)",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    desc: "Giao tiếp được trong các tình huống quen thuộc hàng ngày và trao đổi thông tin cơ bản.",
  },
  B1: {
    label: "B1 – Trung cấp (Intermediate)",
    bg: "bg-blue-100",
    text: "text-blue-800",
    desc: "Tự tin xử lý hầu hết các tình huống khi đi du lịch hoặc công việc thông thường.",
  },
  B2: {
    label: "B2 – Trung cao cấp (Upper-Intermediate)",
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    desc: "Giao tiếp trôi chảy với người bản xứ, nắm bắt các chủ đề trừu tượng và chuyên môn.",
  },
  C1: {
    label: "C1 – Cao cấp (Advanced)",
    bg: "bg-purple-100",
    text: "text-purple-800",
    desc: "Diễn đạt linh hoạt, lưu loát mà không gặp trở ngại ngôn ngữ trong học thuật và công việc.",
  },
  C2: {
    label: "C2 – Thành thạo (Proficient)",
    bg: "bg-amber-100",
    text: "text-amber-800",
    desc: "Làm chủ ngôn ngữ tự nhiên như người bản xứ, phân biệt chính xác sắc thái biểu đạt.",
  },
};

interface UserAnswerState {
  answer: string;
  spokenText?: string;
  speechMatchScore?: number;
  responseTimeMs?: number;
}

function PlacementTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = (searchParams.get("mode") || "quick") as TestMode;

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<"intro" | "test" | "result">("intro");
  const [selectedMode, setSelectedMode] = useState<TestMode>(initialMode);

  // Active Test State
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswerState>>({});
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [audioPlaysCount, setAudioPlaysCount] = useState<Record<string, number>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Speech State for Speaking questions
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognizerRef = useRef<any>(null);

  // Result State
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [isBridging, setIsBridging] = useState(false);

  // Load User profile & existing test results on mount
  useEffect(() => {
    const user = getStoredUserProfile();
    setCurrentUser(user);

    // If result_id is in params or user already has recent result, prepare it
    const existing = getLatestAssessmentResult(user?.id);
    if (existing) {
      setLatestResult(existing);
    }
  }, []);

  // Initialize test with selected mode
  const handleStartTest = (mode: TestMode) => {
    setSelectedMode(mode);
    const rawQuestions = getQuestionsForTestMode(mode);
    const sanitized = rawQuestions.map(sanitizeQuestionForClient);

    setQuestions(sanitized);
    setCurrentIndex(0);
    setUserAnswers({});
    setAudioPlaysCount({});
    setTestStartTime(Date.now());
    setScreen("test");
  };

  // Audio Player for Listening questions
  const handlePlayAudio = (transcript: string, questionId: string, maxPlays = 3) => {
    const currentPlays = audioPlaysCount[questionId] || 0;
    if (currentPlays >= maxPlays) return;

    setIsPlayingAudio(true);
    setAudioPlaysCount((prev) => ({
      ...prev,
      [questionId]: currentPlays + 1,
    }));

    speakEnglish(transcript, 1.0, () => {
      setIsPlayingAudio(false);
    });
  };

  // Speaking Recorder for Speaking questions
  const handleStartRecording = (targetSentence?: string) => {
    setMicError(null);
    setIsRecording(true);

    try {
      recognizerRef.current = startSpeechRecognition({
        onInterimResult: (interim) => {
          const currentQ = questions[currentIndex];
          if (currentQ) {
            setUserAnswers((prev) => ({
              ...prev,
              [currentQ.id]: {
                answer: interim,
                spokenText: interim,
              },
            }));
          }
        },
        onFinalResult: (finalText) => {
          setIsRecording(false);
          const currentQ = questions[currentIndex];
          if (!currentQ) return;

          let matchScore: number | undefined = undefined;
          if (targetSentence) {
            const evalResult = evaluatePronunciation(targetSentence, finalText);
            matchScore = evalResult.score;
          }

          setUserAnswers((prev) => ({
            ...prev,
            [currentQ.id]: {
              answer: finalText,
              spokenText: finalText,
              speechMatchScore: matchScore,
            },
          }));
        },
        onError: (err) => {
          setIsRecording(false);
          setMicError(err);
        },
      });
    } catch {
      setIsRecording(false);
      setMicError("Không thể kích hoạt Micro trên trình duyệt này.");
    }
  };

  const handleStopRecording = () => {
    recognizerRef.current?.stop();
    setIsRecording(false);
  };

  // Answer selection for Multiple Choice
  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        answer: choiceId,
      },
    }));
  };

  // Submit Test & Evaluate
  const handleSubmitTest = async () => {
    setIsSubmitting(true);
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - testStartTime) / 1000)
    );

    try {
      // Evaluate locally with full rule integrity & objective scoring
      const result = evaluateAssessmentSubmission(
        selectedMode,
        userAnswers,
        currentUser?.id || null,
        durationSeconds,
        {
          getAllQuestions,
          scoreObjectiveQuestion,
          scoreSpeakingQuestion,
          computeSkillSummaries,
          computeOverallScore,
          estimateCefrProfile,
        }
      );

      // Save to offline storage & Supabase background sync
      await saveAssessmentResult(result, currentUser?.id || null);

      setLatestResult(result);
      setScreen("result");
      setShowSubmitConfirm(false);
    } catch (err) {
      console.error("Test evaluation error:", err);
      alert("Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Connect to Learning Path
  const handleConnectToLearningPath = async () => {
    if (!latestResult) return;
    setIsBridging(true);

    try {
      await bridgeAssessmentToLearningGoal(latestResult, currentUser?.id || null);
      router.push("/learning-path");
    } catch (err) {
      console.error("Failed to bridge to learning path:", err);
      router.push("/learning-path");
    } finally {
      setIsBridging(false);
    }
  };

  // If user account is locked
  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  // =========================================================================
  // SCREEN 1: INTRO & TEST MODE SELECTION
  // =========================================================================
  if (screen === "intro") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về Trang chủ
          </Link>
          {latestResult && (
            <button
              type="button"
              onClick={() => setScreen("result")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200"
            >
              <Award className="w-3.5 h-3.5" /> Xem kết quả gần nhất ({latestResult.estimatedCefrLevel})
            </button>
          )}
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Khung Tham Chiếu Châu Âu (CEFR A1–C2)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kiểm Tra Xếp Lớp Tiếng Anh Chuẩn Đoán
            </h1>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Đánh giá toàn diện 5 kỹ năng (Ngữ pháp, Từ vựng, Đọc hiểu, Nghe hiểu và Nói) để xác định chính xác năng lực hiện tại và cá nhân hóa lộ trình học trên SpeakFlow.
            </p>
          </div>
        </div>

        {/* Important Disclaimer Notice */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Lưu ý về bài kiểm tra xếp lớp:</p>
            <p className="mt-0.5 text-amber-800">
              Đây là bài kiểm tra chẩn đoán nội bộ của SpeakFlow nhằm hỗ trợ xây dựng lộ trình học phù hợp nhất cho bạn, không có giá trị thay thế các chứng chỉ quốc tế chính thức (IELTS, TOEFL, Cambridge CEFR).
            </p>
          </div>
        </div>

        {/* Test Mode Selection Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Chọn hình thức kiểm tra
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode 1: Quick Test (Recommended) */}
            <div
              onClick={() => handleStartTest("quick")}
              className="bg-white border-2 border-indigo-500/80 hover:border-indigo-600 rounded-2xl p-5 shadow-sm transition-all cursor-pointer relative group flex flex-col justify-between"
            >
              <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Khuyên Dùng
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Bài Kiểm Tra Nhanh (Quick Diagnostic)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  12–14 câu hỏi then chốt bao quát cả 5 kỹ năng. Đủ để ước lượng nhanh trình độ và bắt đầu học ngay.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-indigo-600">
                  <Clock className="w-3.5 h-3.5" /> 10–15 phút
                </span>
                <span className="font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Bắt đầu <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
              </div>
            </div>

            {/* Mode 2: Full Skills Test */}
            <div
              onClick={() => handleStartTest("full")}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  🎯
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Đánh Giá Đầy Đủ (Full Skills)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  25–30 câu hỏi chuyên sâu từ A1 đến C2. Phân tích chi tiết biểu đồ radar từng kỹ năng.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-purple-600">
                  <Clock className="w-3.5 h-3.5" /> 25–35 phút
                </span>
                <span className="font-bold text-purple-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Bắt đầu <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
              </div>
            </div>

            {/* Mode 3: Grammar & Vocab Only */}
            <div
              onClick={() => handleStartTest("grammar_vocab")}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  📖
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Ngữ Pháp & Từ Vựng (Grammar & Vocab)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  15 câu trắc nghiệm kiểm tra cấu trúc câu, thì động từ và từ vựng thông dụng. Không cần micro.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-blue-600">
                  <Clock className="w-3.5 h-3.5" /> 12 phút
                </span>
                <span className="font-bold text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Bắt đầu <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
              </div>
            </div>

            {/* Mode 4: Speaking Only */}
            <div
              onClick={() => handleStartTest("speaking_only")}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                  🎙️
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Phát Âm & Diễn Đạt (Speaking Only)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  5 câu đọc và trả lời trực tiếp bằng giọng nói. Đánh giá độ chính xác từ nhận diện và khả năng diễn đạt.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-rose-600">
                  <Clock className="w-3.5 h-3.5" /> 8 phút
                </span>
                <span className="font-bold text-rose-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Bắt đầu <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Skip & Manual Level Option */}
        <div className="text-center pt-2">
          <Link
            href="/learning-path"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors underline underline-offset-4"
          >
            Bỏ qua bài kiểm tra và tự chọn trình độ tại Lộ trình học &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: ACTIVE TEST ROOM
  // =========================================================================
  if (screen === "test") {
    const currentQ = questions[currentIndex];
    const totalCount = questions.length;
    const progressPct = Math.round(((currentIndex + 1) / totalCount) * 100);
    const userAns = currentQ ? userAnswers[currentQ.id] : undefined;
    const isAnswered = Boolean(userAns?.answer || userAns?.spokenText);
    const isLastQuestion = currentIndex === totalCount - 1;

    const SkillIcon = currentQ ? SKILL_ICONS[currentQ.skill] || BookOpen : BookOpen;
    const skillTheme = currentQ
      ? SKILL_THEMES[currentQ.skill] || SKILL_THEMES.grammar
      : SKILL_THEMES.grammar;

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Top Header & Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Thoát bài test
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Câu {currentIndex + 1} / {totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ({progressPct}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question Container Card */}
        {currentQ && (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Skill & Level Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${skillTheme.bg} ${skillTheme.text} border ${skillTheme.border}`}
              >
                <SkillIcon className="w-3.5 h-3.5" />
                {currentQ.skill.toUpperCase()} • Cấp độ {currentQ.level}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Chủ đề: {currentQ.topic}
              </span>
            </div>

            {/* Reading Passage (if Reading skill) */}
            {currentQ.readingPassage && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <p className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  📄 {currentQ.readingPassage.title}
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line italic">
                  {currentQ.readingPassage.content}
                </p>
              </div>
            )}

            {/* Listening Audio Player (if Listening skill) */}
            {currentQ.audioPrompt && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Headphones className="w-4 h-4 text-amber-600" /> Nghe đoạn băng
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700">
                    Đã nghe: {audioPlaysCount[currentQ.id] || 0} /{" "}
                    {currentQ.audioPrompt.allowedPlays} lần
                  </span>
                </div>
                <p className="text-xs text-amber-800">
                  Bấm nút bên dưới để nghe. Hãy chú ý nghe kỹ vì transcript sẽ không hiển thị trước khi nộp bài.
                </p>
                <button
                  type="button"
                  disabled={
                    isPlayingAudio ||
                    (audioPlaysCount[currentQ.id] || 0) >=
                      currentQ.audioPrompt.allowedPlays
                  }
                  onClick={() =>
                    handlePlayAudio(
                      currentQ.audioPrompt!.transcriptForPlayer,
                      currentQ.id,
                      currentQ.audioPrompt!.allowedPlays
                    )
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang phát âm thanh...
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" /> Bấm để nghe
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Question Prompt */}
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug whitespace-pre-line">
                {currentQ.prompt}
              </h3>
            </div>

            {/* Answer Choices (Multiple Choice) */}
            {currentQ.choices && currentQ.choices.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {currentQ.choices.map((choice) => {
                  const isSelected = userAns?.answer === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectChoice(currentQ.id, choice.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 font-bold"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {choice.id}
                      </span>
                      <span className="text-sm flex-1 leading-snug">
                        {choice.text}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Speaking Recorder (if Speaking skill) */}
            {currentQ.skill === "speaking" && (
              <div className="space-y-4 pt-2">
                <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-rose-600" /> Ghi âm giọng nói
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: {
                            answer: "(Bỏ qua Speaking)",
                            spokenText: "",
                          },
                        }));
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
                    >
                      Bỏ qua câu nói này
                    </button>
                  </div>

                  {/* Mic Action Button */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={
                        isRecording
                          ? handleStopRecording
                          : () =>
                              handleStartRecording(
                                currentQ.speakingPrompt?.targetSentence
                              )
                      }
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all w-full sm:w-auto cursor-pointer ${
                        isRecording
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-4 h-4" /> Bấm để Dừng ghi âm
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" /> Bấm để Nói vào Micro
                        </>
                      )}
                    </button>

                    {userAns?.spokenText && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã ghi nhận giọng nói
                      </span>
                    )}
                  </div>

                  {micError && (
                    <p className="text-xs text-rose-600 font-medium">
                      ⚠️ {micError}
                    </p>
                  )}

                  {/* Transcript Display */}
                  {userAns?.spokenText && (
                    <div className="bg-white p-3 rounded-xl border border-rose-200 text-xs text-slate-800">
                      <span className="font-bold text-slate-500">Giọng nói nhận diện: </span>
                      &quot;{userAns.spokenText}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Câu trước
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Nộp bài kiểm tra
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))
              }
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              Câu tiếp theo <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal: Submit Confirmation */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Xác nhận nộp bài?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn đã trả lời {Object.keys(userAnswers).length} / {totalCount} câu hỏi. Hệ thống sẽ tiến hành chấm điểm và ước lượng trình độ CEFR ngay lập tức.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Xem lại
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitTest}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang chấm...
                    </>
                  ) : (
                    "Nộp bài ngay"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Exit Confirmation */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Thoát bài kiểm tra?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tiến trình làm bài hiện tại sẽ không được lưu. Bạn có chắc chắn muốn thoát về màn hình giới thiệu?
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    setScreen("intro");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors"
                >
                  Xác nhận thoát
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: COMPREHENSIVE RESULT & ANALYTICS
  // =========================================================================
  if (screen === "result" && latestResult) {
    const cefrMeta = CEFR_BADGES[latestResult.estimatedCefrLevel] || CEFR_BADGES.B1;
    const confidenceLabel =
      latestResult.confidenceLevel === "high"
        ? "Cao"
        : latestResult.confidenceLevel === "medium"
        ? "Trung bình"
        : "Thấp (Cần làm thêm bài đánh giá)";

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setScreen("intro")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Làm lại bài kiểm tra
          </button>
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Về Trang chủ &rarr;
          </Link>
        </div>

        {/* Level Certificate Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                KẾT QUẢ ĐÁNH GIÁ TRÌNH ĐỘ TIẾNG ANH (SPEAKFLOW PLACEMENT)
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {cefrMeta.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
                {cefrMeta.desc}
              </p>
            </div>

            {/* Overall Score Circle */}
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0">
              <span className="text-3xl font-extrabold text-white">
                {latestResult.overallScore}
              </span>
              <span className="text-[10px] font-bold text-indigo-200">
                / 100 ĐIỂM
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
            <div>
              <p className="text-indigo-300 text-[10px] uppercase font-bold">
                Khoảng trình độ
              </p>
              <p className="font-bold text-white mt-0.5">
                {latestResult.possibleLevelRange}
              </p>
            </div>
            <div>
              <p className="text-indigo-300 text-[10px] uppercase font-bold">
                Độ tin cậy
              </p>
              <p className="font-bold text-white mt-0.5">{confidenceLabel}</p>
            </div>
            <div>
              <p className="text-indigo-300 text-[10px] uppercase font-bold">
                Đề xuất học
              </p>
              <p className="font-bold text-amber-300 mt-0.5">
                Cấp độ {latestResult.recommendedLearningLevel}
              </p>
            </div>
            <div>
              <p className="text-indigo-300 text-[10px] uppercase font-bold">
                Số câu đúng
              </p>
              <p className="font-bold text-white mt-0.5">
                {latestResult.correctAnswersCount} / {latestResult.totalQuestions}
              </p>
            </div>
          </div>
        </div>

        {/* 5-Skill Radar Score Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" /> Điểm số chi tiết 5 kỹ năng
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(latestResult.skillScores).map(([skillKey, summary]) => {
              const skill = skillKey as SkillCategory;
              const theme = SKILL_THEMES[skill] || SKILL_THEMES.grammar;
              const Icon = SKILL_ICONS[skill] || BookOpen;

              return (
                <div
                  key={skill}
                  className={`p-4 rounded-2xl border ${theme.border} ${theme.bg} space-y-2 flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 capitalize">
                      <Icon className="w-3.5 h-3.5" /> {skill}
                    </span>
                    {summary.isAssessed && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs">
                        {summary.levelEstimate}
                      </span>
                    )}
                  </div>

                  <div>
                    {summary.isAssessed ? (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-extrabold text-slate-900">
                            {summary.score}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            / 100
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full ${theme.bar} rounded-full`}
                            style={{ width: `${summary.score}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="py-2 text-[11px] font-semibold text-slate-400 italic">
                        Chưa kiểm tra
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Điểm mạnh nổi bật
            </h4>
            <ul className="space-y-2 text-xs text-emerald-800">
              {latestResult.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Điểm cần cải thiện
            </h4>
            <ul className="space-y-2 text-xs text-amber-800">
              {latestResult.weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations Box */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Khuyến nghị từ SpeakFlow AI
          </h4>
          <ul className="space-y-2 text-xs text-indigo-950">
            {latestResult.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold shrink-0">&rarr;</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary CTA: Build Learning Path */}
        <div className="bg-white border-2 border-indigo-600/90 rounded-3xl p-6 text-center space-y-4 shadow-md">
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              Sẵn sàng chinh phục mục tiêu tiếp theo?
            </h3>
            <p className="text-xs text-slate-600">
              SpeakFlow sẽ tự động tạo lộ trình cá nhân hóa dựa trên trình độ {latestResult.estimatedCefrLevel} và tập trung vào các kỹ năng bạn cần cải thiện.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              disabled={isBridging}
              onClick={handleConnectToLearningPath}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isBridging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tạo lộ trình...
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" /> Xây dựng lộ trình học cho tôi
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDetailedReview((prev) => !prev)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {showDetailedReview ? (
                <>
                  Ẩn đáp án & giải thích <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Xem lại đáp án & giải thích <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Question-by-Question Review */}
        {showDetailedReview && (
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Chi tiết câu trả lời & Giải thích sư phạm
            </h3>
            <div className="space-y-3">
              {latestResult.responses.map((resp, idx) => {
                const fullQ = getAllQuestions().find(
                  (q) => q.id === resp.questionId
                );
                return (
                  <div
                    key={resp.questionId}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        Câu {idx + 1} • {fullQ?.skill.toUpperCase()} ({fullQ?.level})
                      </span>
                      {resp.isCorrect ? (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Chính xác (+{resp.score})
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                          <X className="w-3 h-3" /> Chưa đúng (0)
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-900 whitespace-pre-line">
                      {fullQ?.prompt}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-500 font-bold">Bạn đã chọn: </span>
                        <span className="font-semibold text-slate-800">
                          {resp.userAnswer || "(Bỏ trống)"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-emerald-700 font-bold">Đáp án chuẩn: </span>
                        <span className="font-bold text-emerald-900">
                          {fullQ?.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {fullQ?.explanationVi && (
                      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <span className="font-bold text-indigo-700">💡 Giải thích: </span>
                        {fullQ.explanationVi}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function PlacementTestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <PlacementTestContent />
    </Suspense>
  );
}
