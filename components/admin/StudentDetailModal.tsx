"use client";

import { useEffect } from "react";
import {
  X,
  Flame,
  Clock,
  Mic,
  Lock,
  Unlock,
  Shield,
  GraduationCap,
  BarChart3,
  Layers,
  AlertTriangle,
  Volume2,
  History,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { AdminStudentMetrics, StudyActivityLog } from "@/lib/dataService";
import { UserAvatar } from "@/components/AuthModal";
import { speakEnglish, speakText } from "@/lib/speech";

interface StudentDetailModalProps {
  student: AdminStudentMetrics;
  onClose: () => void;
  onToggleStatus: (student: AdminStudentMetrics) => void;
  onToggleRole: (student: AdminStudentMetrics) => void;
  onResetProgress: (student: AdminStudentMetrics) => void;
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  }
  if (score >= 65) {
    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }
  return "bg-rose-500/15 text-rose-300 border-rose-500/40";
}

function formatModeLabel(
  mode: StudyActivityLog["mode"]
): { label: string; style: string } {
  switch (mode) {
    case "study":
      return {
        label: "Học thẻ",
        style: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      };
    case "shadowing":
      return {
        label: "Shadowing",
        style: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
      };
    case "reflex":
      return {
        label: "Phản xạ 60s",
        style: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    case "roleplay":
      return {
        label: "Hội thoại",
        style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
  }
}

function formatRelativeAndClock(isoDate: string): string {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return "Chưa rõ";
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));

  let rel = "";
  if (diffSec < 90) rel = "Vừa xong";
  else if (diffSec < 3600) rel = `${Math.floor(diffSec / 60)} phút trước`;
  else if (diffSec < 86400) rel = `${Math.floor(diffSec / 3600)} giờ trước`;
  else rel = `${Math.floor(diffSec / 86400)} ngày trước`;

  const clock = new Date(isoDate).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  return `${rel} (${clock})`;
}

export default function StudentDetailModal({
  student,
  onClose,
  onToggleStatus,
  onToggleRole,
  onResetProgress,
}: StudentDetailModalProps) {
  const u = student.profile;
  const isLocked = u.status === "locked";
  const isAdmin = u.role === "admin";

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // 7-day chart scaling
  const maxPhrases = Math.max(
    10,
    ...student.dailyActivity7Days.map((d) => d.phrasesCount)
  );
  const maxMinutes = Math.max(
    30,
    ...student.dailyActivity7Days.map((d) => d.minutes)
  );
  const total7DayPhrases = student.dailyActivity7Days.reduce(
    (sum, d) => sum + d.phrasesCount,
    0
  );
  const total7DayMinutes = student.dailyActivity7Days.reduce(
    (sum, d) => sum + d.minutes,
    0
  );
  const activeDaysInLast7 = student.dailyActivity7Days.filter(
    (d) => d.phrasesCount > 0
  ).length;

  // SRS Box percentages
  const totalCards = student.totalCards || 100;
  const box1Pct = Math.round((student.box1Count / totalCards) * 100);
  const box23Pct = Math.round((student.box23Count / totalCards) * 100);
  const box45Pct = Math.round((student.box45Count / totalCards) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* ================================================================ */}
        {/* 1. STUDENT PROFILE HEADER                                        */}
        {/* ================================================================ */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <UserAvatar
              user={u}
              sizeClass="w-14 h-14 rounded-2xl text-base shrink-0"
              showOnlineDot={!isLocked && student.studiedToday}
            />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                  {u.full_name}
                </h2>
                <span className="text-xs text-slate-400">({u.email})</span>
              </div>

              {/* Quick KPI Pills in Header */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 font-extrabold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                  <span>🔥 Streak: {student.streak} ngày</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>⏱️ Tổng: {student.totalMinutes} phút</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border font-extrabold ${getScoreBadgeClass(
                    student.avgPronunciation
                  )}`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Phát âm TB: {student.avgPronunciation}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Role Toggle, Status Toggle, Reset & Close */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Role Toggle Button */}
            <button
              type="button"
              onClick={() => onToggleRole(student)}
              title="Nhấn để chuyển đổi vai trò Học viên / Admin"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                isAdmin
                  ? "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-500/40"
                  : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-500/30"
              }`}
            >
              {isAdmin ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vai trò: Admin (Đổi)</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Vai trò: Học viên (Đổi)</span>
                </>
              )}
            </button>

            {/* Status Lock/Unlock Toggle Button */}
            <button
              type="button"
              onClick={() => onToggleStatus(student)}
              title="Nhấn để Khóa hoặc Mở khóa tài khoản"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                isLocked
                  ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/30"
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Đang khóa (Nhấn để Mở)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hoạt động (Nhấn để Khóa)</span>
                </>
              )}
            </button>

            {/* Reset Progress */}
            <button
              type="button"
              onClick={() => onResetProgress(student)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all"
              title="Đặt lại tiến độ học tập"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ chi tiết"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SCROLLABLE ANALYTICS BODY                                        */}
        {/* ================================================================ */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Grid Row: 2. 7-Day Learning Activity Chart + 3. SRS Box Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 2. 7-DAY LEARNING ACTIVITY CHART (7 Cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-slate-950/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span>Biểu đồ Hoạt động Học tập 7 Ngày qua</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đã học {activeDaysInLast7}/7 ngày • Tổng {total7DayPhrases}{" "}
                    mẫu câu ({total7DayMinutes} phút)
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="inline-flex items-center gap-1.5 text-sky-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                    Số câu luyện
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/80" />
                    Số phút học
                  </span>
                </div>
              </div>

              {/* Visual Bar Chart */}
              <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-4 pb-1 items-end h-44 border-b border-slate-800/90">
                {student.dailyActivity7Days.map((day) => {
                  const phraseHeightPct =
                    day.phrasesCount > 0
                      ? Math.max(
                          12,
                          Math.round((day.phrasesCount / maxPhrases) * 100)
                        )
                      : 4;
                  const minHeightPct =
                    day.minutes > 0
                      ? Math.max(
                          12,
                          Math.round((day.minutes / maxMinutes) * 100)
                        )
                      : 4;

                  return (
                    <div
                      key={day.date}
                      className="flex flex-col items-center h-full justify-end group"
                    >
                      {/* Values on top of bars */}
                      <div className="text-[10px] font-bold text-slate-400 mb-1.5 text-center leading-tight">
                        <span className="text-sky-300">{day.phrasesCount}c</span>{" "}
                        <span className="text-slate-600">•</span>{" "}
                        <span className="text-indigo-300">{day.minutes}p</span>
                      </div>

                      {/* Dual Bars Container */}
                      <div className="w-full max-w-[44px] h-28 flex items-end justify-center gap-1 bg-slate-900/70 rounded-xl p-1 border border-slate-800/70">
                        <div
                          style={{ height: `${phraseHeightPct}%` }}
                          title={`${day.dayLabel}: ${day.phrasesCount} câu`}
                          className={`flex-1 rounded-t-md transition-all duration-300 ${
                            day.phrasesCount > 0
                              ? "bg-gradient-to-t from-sky-600 to-sky-400"
                              : "bg-slate-800"
                          }`}
                        />
                        <div
                          style={{ height: `${minHeightPct}%` }}
                          title={`${day.dayLabel}: ${day.minutes} phút`}
                          className={`flex-1 rounded-t-md transition-all duration-300 ${
                            day.minutes > 0
                              ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                              : "bg-slate-800"
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span
                        className={`text-[10px] mt-2 font-bold truncate max-w-full ${
                          day.dayLabel === "Hôm nay"
                            ? "text-amber-300"
                            : "text-slate-400"
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Consistency evaluation footnote */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Nhịp độ học:{" "}
                  <strong
                    className={
                      activeDaysInLast7 >= 5
                        ? "text-emerald-400"
                        : activeDaysInLast7 >= 3
                        ? "text-amber-300"
                        : "text-rose-400"
                    }
                  >
                    {activeDaysInLast7 >= 5
                      ? "Đều đặn hàng ngày (Rất tốt)"
                      : activeDaysInLast7 >= 3
                      ? "Học ngắt quãng (Cần duy trì thêm)"
                      : "Học dồn / Đang bỏ bê (Cần nhắc nhở)"}
                  </strong>
                </span>
                <span>Trung bình: {Math.round(total7DayMinutes / 7)} phút/ngày</span>
              </div>
            </div>

            {/* 3. SRS MEMORY BOX BREAKDOWN (BOX 1 TO BOX 5) (5 Cols) */}
            <div className="lg:col-span-5 rounded-2xl bg-slate-950/90 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Phân bổ Trí nhớ SRS (Box 1 → Box 5)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổng số {totalCards} mẫu câu giao tiếp trong lộ trình
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Box 1: Mới / Hay quên (Cần ôn gấp) */}
                <div className="p-3.5 rounded-2xl bg-rose-950/25 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-rose-300">
                      Box 1: Mới / Hay quên (Cần ôn gấp)
                    </span>
                    <span className="font-extrabold text-white">
                      {student.box1Count} câu ({box1Pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      style={{ width: `${box1Pct}%` }}
                      className="h-full bg-rose-500 rounded-full transition-all"
                    />
                  </div>
                </div>

                {/* Box 2-3: Đang ghi nhớ */}
                <div className="p-3.5 rounded-2xl bg-sky-950/25 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-sky-300">
                      Box 2-3: Đang ghi nhớ
                    </span>
                    <span className="font-extrabold text-white">
                      {student.box23Count} câu ({box23Pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      style={{ width: `${box23Pct}%` }}
                      className="h-full bg-sky-500 rounded-full transition-all"
                    />
                  </div>
                </div>

                {/* Box 4-5: Đã phản xạ tự nhiên (Mastered) */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-300">
                      Box 4-5: Đã phản xạ tự nhiên (Mastered)
                    </span>
                    <span className="font-extrabold text-white">
                      {student.box45Count} câu ({box45Pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      style={{ width: `${box45Pct}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. TOP MISPRONOUNCED "RED WORDS" TABLE                         */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>
                    Từ &amp; Cụm câu hay đọc sai nhất (Top Mispronounced Red
                    Words)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổng hợp từ nhật ký nhận diện giọng nói AI của học viên • Bấm{" "}
                  <strong className="text-rose-300">🔊 Nghe từ</strong> để kiểm
                  tra phát âm mẫu
                </p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 self-start sm:self-auto">
                {student.redWordDetails.length} từ cần sửa phát âm
              </span>
            </div>

            {student.redWordDetails.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Tuyệt vời! Học viên này hiện không có từ tiếng Anh nào bị báo
                  đỏ.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Từ / Cụm từ bị sai (Red)</th>
                      <th className="py-3 px-4">Micro nhận diện thành</th>
                      <th className="py-3 px-4">Thuộc mẫu câu giao tiếp</th>
                      <th className="py-3 px-4 text-center">Số lần sai</th>
                      <th className="py-3 px-4 text-right">Nghe phát âm mẫu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {student.redWordDetails.map((rw) => (
                      <tr
                        key={rw.word}
                        className="hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 font-extrabold text-xs underline decoration-rose-500 decoration-wavy">
                            {rw.word}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-semibold">
                            Nghe thành: &ldquo;{rw.heardAs}&rdquo;
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <p className="text-slate-200 font-medium">
                            &ldquo;{rw.sentenceEn}&rdquo;
                          </p>
                          <p className="text-[11px] text-sky-400 mt-0.5">
                            Cụm chính: {rw.phraseEn}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-extrabold text-[11px]">
                            {rw.errorCount} lần
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => speakText(rw.word, 0.75)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 font-bold text-xs transition-all active:scale-95"
                              title={`Nghe phát âm chậm từ "${rw.word}" (0.75x)`}
                            >
                              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>🔊 Nghe từ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => speakEnglish(rw.sentenceEn, 1.0)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-xs transition-all active:scale-95"
                              title="Nghe toàn bộ câu mẫu (1x)"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Cả câu</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* 5. RECENT STUDY SESSIONS LOG (TIMELINE OF LAST 10 ACTIVITIES)  */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>
                    Nhật ký 10 Phiên Luyện tập Gần nhất (Recent Study Sessions)
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Theo dõi chi tiết thời gian, chế độ luyện, câu đã nói và điểm
                  số AI
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {student.recentLogs.length} hoạt động gần nhất
              </span>
            </div>

            {student.recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Học viên này chưa có phiên luyện tập nào được ghi lại.
              </p>
            ) : (
              <div className="space-y-2.5">
                {student.recentLogs.slice(0, 10).map((log) => {
                  const modeMeta = formatModeLabel(log.mode);
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${modeMeta.style}`}
                          >
                            {modeMeta.label}
                          </span>
                          <span className="text-xs font-extrabold text-sky-300">
                            Cụm: &ldquo;{log.phrase_en}&rdquo;
                          </span>
                          <span className="text-[11px] text-slate-400">
                            • {formatRelativeAndClock(log.created_at)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white">
                          Câu mẫu: &ldquo;{log.sentence_en}&rdquo;
                        </p>

                        {log.spoken_text && (
                          <p className="text-[11px] text-slate-400">
                            Học viên nói:{" "}
                            <em className="text-slate-200">
                              &ldquo;{log.spoken_text}&rdquo;
                            </em>
                          </p>
                        )}

                        {log.mispronounced_words.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-rose-400">
                              Từ đọc sai:
                            </span>
                            {log.mispronounced_words.map((w, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => speakText(w, 0.75)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[10px] font-bold hover:bg-rose-900/80"
                              >
                                <Volume2 className="w-2.5 h-2.5" />
                                <span>{w}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${getScoreBadgeClass(
                            log.score
                          )}`}
                        >
                          Điểm: {log.score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
