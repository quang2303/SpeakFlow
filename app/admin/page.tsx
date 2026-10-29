"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Lock,
  Unlock,
  Flame,
  Volume2,
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  getAllUsersForAdmin,
  getStoredUserProfile,
  getStudyActivityLogs,
  loginWithDemoAccount,
  toggleUserAccountStatus,
  StudyActivityLog,
  UserProfile,
} from "@/lib/dataService";
import { speakText } from "@/lib/speech";

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<ReturnType<typeof getAllUsersForAdmin>>([]);
  const [allLogs, setAllLogs] = useState<StudyActivityLog[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  function refreshAdminData() {
    setCurrentUser(getStoredUserProfile());
    setUsers(getAllUsersForAdmin());
    setAllLogs(getStudyActivityLogs());
  }

  useEffect(() => {
    refreshAdminData();
    const handler = () => {
      refreshAdminData();
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, []);

  function handleToggleLock(userId: string) {
    toggleUserAccountStatus(userId);
    refreshAdminData();
  }

  const displayedLogs = selectedUserId
    ? allLogs.filter((l) => l.user_id === selectedUserId)
    : allLogs.slice(0, 25);

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white">
                Trung tâm Quản trị Học viên (Admin)
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Real-time Monitor
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Theo dõi tiến độ SM-2, điểm phát âm, danh sách từ phát âm sai (Đỏ)
              & Khóa/Mở tài khoản
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role !== "admin" && (
            <button
              type="button"
              onClick={() => {
                loginWithDemoAccount("demo-admin-01");
                refreshAdminData();
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all"
            >
              ⚡ Chuyển nhanh sang quyền Admin
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Tổng số tài khoản
          </p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {users.length}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Đang hoạt động
          </p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            {users.filter((u) => u.profile.status !== "locked").length}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            Tài khoản đang khóa
          </p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">
            {users.filter((u) => u.profile.status === "locked").length}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Nhật ký luyện nói
          </p>
          <p className="text-2xl font-extrabold text-amber-300 mt-1">
            {allLogs.length} lượt
          </p>
        </div>
      </div>

      {/* Student Management Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-extrabold text-white">
              Danh sách Tài khoản & Tiến độ Phát âm
            </h2>
            <p className="text-xs text-slate-400">
              Nhấn nút Khóa / Mở khóa để kiểm tra tính năng chặn truy cập tức thì
            </p>
          </div>
          {selectedUserId && (
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="text-xs font-bold text-sky-400 hover:underline"
            >
              Xem tất cả nhật ký
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800/80">
          {users.map((item) => {
            const u = item.profile;
            const isLocked = u.status === "locked";
            const isAdmin = u.role === "admin";

            return (
              <div
                key={u.id}
                className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-950/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm md:text-base font-extrabold text-white">
                      {u.full_name}
                    </span>
                    <span className="text-xs text-slate-400">({u.email})</span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isAdmin
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                      }`}
                    >
                      {isAdmin ? "🛡️ Admin" : "🎓 Học viên"}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isLocked
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {isLocked ? "🔒 Đang tạm khóa" : "● Hoạt động"}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      Streak: <strong>{item.streak} ngày</strong>
                    </span>
                    <span>
                      Đã luyện: <strong>{item.practicedCount} thẻ</strong>
                    </span>
                    <span>
                      Thành thạo: <strong>{item.masteredCount} câu</strong>
                    </span>
                    <span>
                      Điểm phát âm TB:{" "}
                      <strong
                        className={
                          item.avgPronunciation >= 80
                            ? "text-emerald-400"
                            : item.avgPronunciation > 0
                            ? "text-amber-300"
                            : "text-slate-400"
                        }
                      >
                        {item.avgPronunciation}%
                      </strong>
                    </span>
                  </div>

                  {/* Red Mispronounced Words */}
                  {item.redWords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Từ phát âm sai (Red words):
                      </span>
                      {item.redWords.map((word) => (
                        <button
                          key={word}
                          type="button"
                          onClick={() => speakText(word, 0.75)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[11px] font-bold hover:bg-rose-900/70"
                          title="Chạm để nghe phát âm chuẩn"
                        >
                          <Volume2 className="w-2.5 h-2.5" />
                          <span>{word}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedUserId(
                        selectedUserId === u.id ? null : u.id
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    {selectedUserId === u.id
                      ? "Đang lọc nhật ký"
                      : `Nhật ký (${item.recentLogs.length})`}
                  </button>

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleToggleLock(u.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        isLocked
                          ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa tài khoản</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Khóa tài khoản</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Study Activity Logs */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>
            Nhật ký Luyện tập Thực tế (logStudyActivity) — {displayedLogs.length}{" "}
            bản ghi
          </span>
        </h3>

        {displayedLogs.length === 0 ? (
          <p className="text-xs text-slate-400">
            Chưa có hoạt động nào cho bộ lọc này.
          </p>
        ) : (
          <div className="space-y-2.5">
            {displayedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-white">
                      {log.user_name}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-800 text-sky-300">
                      {log.mode}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Câu mẫu: <strong>&ldquo;{log.sentence_en}&rdquo;</strong>
                  </p>
                  {log.mispronounced_words.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-rose-400 font-semibold">
                        Từ sai:
                      </span>
                      {log.mispronounced_words.map((w, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 font-bold"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
                      log.score >= 80
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {log.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
