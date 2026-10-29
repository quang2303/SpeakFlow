"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  BookOpenCheck,
  Mic,
  AlertTriangle,
  Search,
  RefreshCw,
  Download,
  UserPlus,
  ArrowLeft,
  Flame,
  Clock,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  Volume2,
  ArrowUpDown,
  GraduationCap,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  AdminStudentMetrics,
  createAccountByAdmin,
  deleteUserAccountByAdmin,
  getAllUsersForAdmin,
  getStoredUserProfile,
  resetUserProgressByAdmin,
  toggleUserAccountRole,
  toggleUserAccountStatus,
  UserProfile,
  UserRole,
} from "@/lib/dataService";
import { UserAvatar } from "@/components/AuthModal";
import StudentDetailModal from "@/components/admin/StudentDetailModal";
import AccountLockScreen from "@/components/AccountLockScreen";

type FilterOption =
  | "all"
  | "hardworking"
  | "weak_pronunciation"
  | "inactive_3days"
  | "locked";

type SortOption = "recent" | "pronunciation" | "progress" | "streak";

function formatRelativeTimeVi(isoDate: string): string {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return "Chưa rõ";
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));

  if (diffSec < 90) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hôm qua";
  return `${diffDays} ngày trước`;
}

function getPronunciationBadgeStyle(score: number): string {
  if (score >= 80) {
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  }
  if (score >= 65) {
    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }
  return "bg-rose-500/15 text-rose-300 border-rose-500/40";
}

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [students, setStudents] = useState<AdminStudentMetrics[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  // Create New Account Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("123456");
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [createError, setCreateError] = useState<string | null>(null);

  // Selected Student for Detail Preview (Step 4 Drill-Down ready)
  const [selectedStudent, setSelectedStudent] =
    useState<AdminStudentMetrics | null>(null);

  // Toast feedback banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }

  function refreshDashboardData(withSpinner = false) {
    if (withSpinner) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 450);
    }
    const user = getStoredUserProfile();
    setCurrentUser(user);
    if (user?.role === "admin") {
      const data = getAllUsersForAdmin();
      setStudents(data);
      setSelectedStudent((prev) => {
        if (!prev) return null;
        return data.find((s) => s.profile.id === prev.profile.id) || null;
      });
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }

  useEffect(() => {
    refreshDashboardData(false);
    const handler = () => refreshDashboardData(false);
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, []);

  // ==========================================================================
  // 1. EXECUTIVE KPI CALCULATIONS
  // ==========================================================================
  const kpiStats = useMemo(() => {
    const totalUsers = students.length;
    const activeTodayCount = students.filter((s) => s.studiedToday).length;
    const totalMasteredPhrases = students.reduce(
      (sum, s) => sum + s.box45Count,
      0
    );
    const avgPlatformPronunciation =
      totalUsers > 0
        ? Math.round(
            students.reduce((sum, s) => sum + s.avgPronunciation, 0) /
              totalUsers
          )
        : 0;
    const atRiskCount = students.filter(
      (s) =>
        s.daysInactive > 3 ||
        (s.avgPronunciation > 0 && s.avgPronunciation < 65)
    ).length;

    return {
      totalUsers,
      activeTodayCount,
      totalMasteredPhrases,
      avgPlatformPronunciation,
      atRiskCount,
    };
  }, [students]);

  // ==========================================================================
  // 2. SEARCH, FILTER & SORT PIPELINE
  // ==========================================================================
  const filteredAndSortedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = students.filter((item) => {
      if (q) {
        const matchName = item.profile.full_name.toLowerCase().includes(q);
        const matchEmail = item.profile.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }

      switch (activeFilter) {
        case "hardworking":
          return item.streak >= 5;
        case "weak_pronunciation":
          return item.avgPronunciation < 65;
        case "inactive_3days":
          return item.daysInactive > 3;
        case "locked":
          return item.profile.status === "locked";
        case "all":
        default:
          return true;
      }
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "pronunciation":
          return b.avgPronunciation - a.avgPronunciation;
        case "progress":
          return b.progressPercent - a.progressPercent;
        case "streak":
          return b.streak - a.streak;
        case "recent":
        default:
          return (
            new Date(b.lastActiveAt).getTime() -
            new Date(a.lastActiveAt).getTime()
          );
      }
    });
  }, [students, searchQuery, activeFilter, sortBy]);

  // ==========================================================================
  // 3. ADMIN CRUD HANDLERS & UTF-8 BOM CSV EXPORT
  // ==========================================================================
  async function handleToggleLock(item: AdminStudentMetrics) {
    const updated = await toggleUserAccountStatus(item.profile.id);
    refreshDashboardData(false);
    if (updated) {
      showToast(
        updated.status === "locked"
          ? `🔒 Đã tạm khóa tài khoản "${updated.full_name}"`
          : `🔓 Đã mở khóa tài khoản "${updated.full_name}"`
      );
    }
  }

  async function handleToggleRole(item: AdminStudentMetrics) {
    const updated = await toggleUserAccountRole(item.profile.id);
    refreshDashboardData(false);
    if (updated) {
      showToast(
        updated.role === "admin"
          ? `🛡️ Đã cấp quyền Admin cho "${updated.full_name}"`
          : `🎓 Đã chuyển "${updated.full_name}" sang vai trò Học viên`
      );
    }
  }

  function handleResetProgress(item: AdminStudentMetrics) {
    resetUserProgressByAdmin(item.profile.id);
    refreshDashboardData(false);
    showToast(
      `🔄 Đã đặt lại toàn bộ tiến độ học của "${item.profile.full_name}" về 0`
    );
  }

  function handleDeleteUser(item: AdminStudentMetrics) {
    deleteUserAccountByAdmin(item.profile.id);
    if (selectedStudent?.profile.id === item.profile.id) {
      setSelectedStudent(null);
    }
    refreshDashboardData(false);
    showToast(`🗑️ Đã xóa tài khoản "${item.profile.full_name}" khỏi hệ thống`);
  }

  function handleCreateNewAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    const res = createAccountByAdmin({
      fullName: newFullName,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });

    if (!res.ok) {
      setCreateError(res.error || "Không thể tạo tài khoản.");
      return;
    }

    setNewFullName("");
    setNewEmail("");
    setNewPassword("123456");
    setNewRole("student");
    setIsCreateModalOpen(false);
    refreshDashboardData(false);
    showToast(`✅ Đã tạo tài khoản mới: ${res.user?.full_name}`);
  }

  function handleExportCsv() {
    const headers = [
      "Họ và tên",
      "Email",
      "Vai trò",
      "Trạng thái",
      "Streak (ngày)",
      "Thời lượng học (phút)",
      "Đã thuộc Box 4-5 (câu)",
      "Đang ôn Box 2-3 (câu)",
      "Chưa thuộc Box 1 (câu)",
      "Tổng số câu",
      "Tiến độ (%)",
      "Điểm phát âm TB (%)",
      "Truy cập cuối",
      "Từ phát âm sai (Red Words)",
    ];

    const escapeCsvCell = (val: string | number) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = students.map((s) => [
      s.profile.full_name,
      s.profile.email,
      s.profile.role === "admin" ? "Admin" : "Học viên",
      s.profile.status === "locked" ? "Đã khóa" : "Hoạt động",
      s.streak,
      s.totalMinutes,
      s.box45Count,
      s.box23Count,
      s.box1Count,
      s.totalCards,
      `${s.progressPercent}%`,
      `${s.avgPronunciation}%`,
      formatRelativeTimeVi(s.lastActiveAt),
      s.redWords.join("; "),
    ]);

    const csvLines = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((r) => r.map(escapeCsvCell).join(",")),
    ];

    // UTF-8 BOM (\uFEFF) ensures Microsoft Excel opens Vietnamese characters cleanly
    const csvContent = "\uFEFF" + csvLines.join("\r\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `SpeakFlow_BaoCaoHocVien_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("📥 Đã xuất báo cáo Excel (CSV chuẩn UTF-8 BOM) thành công!");
  }

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  // 403 Forbidden Route Guard: Only role === "admin" is allowed to view the admin portal
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 md:py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto shadow-xl shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30">
            403 Forbidden • Quyền truy cập bị từ chối
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-white">
            Khu vực Quản trị viên (Admin)
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            {currentUser
              ? `Tài khoản "${currentUser.full_name}" (${currentUser.email}) hiện là Học viên và không có quyền truy cập Bảng Quản trị hệ thống.`
              : "Bạn cần đăng nhập bằng tài khoản Quản trị viên để có thể xem và quản lý danh sách học viên."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Đăng nhập tài khoản Quản trị</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay về Trang chủ</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 border border-sky-500/40 text-sky-200 text-xs md:text-sm font-bold shadow-2xl shadow-sky-950/60 backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. TOP NAVIGATION BAR                                                */}
      {/* ==================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-indigo-950/40 border border-slate-800/90 rounded-3xl p-4 md:p-6 shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Hệ thống Quản trị Học viên (Admin Portal)
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Executive Dashboard
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Giám sát tiến độ Spaced Repetition (SM-2), điểm phát âm AI & Quản
              lý tài khoản toàn hệ thống
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Quay lại trang học</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              refreshDashboardData(true);
              showToast("🔄 Đã làm mới dữ liệu học viên mới nhất!");
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-sky-300 border border-slate-700 text-xs font-bold transition-all"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>🔄 Làm mới dữ liệu</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 Xuất báo cáo Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-950/60 transition-all active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Tạo tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1B. EXECUTIVE KPI SUMMARY CARDS (4 CARDS)                            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng học viên */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng học viên
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-3xl font-extrabold text-white">
              {kpiStats.totalUsers}
            </p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {kpiStats.activeTodayCount} Active Today
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Học viên hoạt động hôm nay: {kpiStats.activeTodayCount}/
            {kpiStats.totalUsers}
          </p>
        </div>

        {/* KPI 2: Tổng câu đã thuộc */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng câu đã thuộc
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <BookOpenCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-3xl font-extrabold text-emerald-400">
              {kpiStats.totalMasteredPhrases}
            </p>
            <span className="text-xs font-bold text-emerald-300/90 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              SRS Box 4 &amp; 5
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Tổng số mẫu câu đạt mức phản xạ dài hạn toàn hệ thống
          </p>
        </div>

        {/* KPI 3: Điểm phát âm TB */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Điểm phát âm TB
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Mic className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-3xl font-extrabold ${
                kpiStats.avgPlatformPronunciation >= 80
                  ? "text-emerald-400"
                  : kpiStats.avgPlatformPronunciation >= 65
                  ? "text-amber-300"
                  : "text-rose-400"
              }`}
            >
              {kpiStats.avgPlatformPronunciation}%
            </p>
            <span
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getPronunciationBadgeStyle(
                kpiStats.avgPlatformPronunciation
              )}`}
            >
              {kpiStats.avgPlatformPronunciation >= 80
                ? "Chuẩn tốt"
                : kpiStats.avgPlatformPronunciation >= 65
                ? "Khá"
                : "Cần cải thiện"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Độ chính xác nhận diện giọng nói AI trung bình
          </p>
        </div>

        {/* KPI 4: Cần chú ý (At-Risk) */}
        <div className="rounded-3xl bg-slate-900/90 border border-rose-500/30 p-5 flex flex-col justify-between space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              Cần chú ý (At-Risk)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-3xl font-extrabold text-rose-400">
              {kpiStats.atRiskCount}
            </p>
            <span className="text-[11px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
              Nghỉ &gt;3 ngày / &lt;65%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Học viên nghỉ quá 3 ngày hoặc điểm phát âm dưới 65%
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SEARCH, FILTER PILLS & SORT TOOLBAR                               */}
      {/* ==================================================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm học viên theo họ tên hoặc email..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs md:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
              Sắp xếp theo:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs md:text-sm font-bold text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="recent">Hoạt động gần nhất</option>
              <option value="pronunciation">Điểm phát âm</option>
              <option value="progress">Tiến độ (%)</option>
              <option value="streak">Chuỗi ngày học (Streak)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(
            [
              { id: "all", label: `Tất cả (${students.length})` },
              {
                id: "hardworking",
                label: "🔥 Chăm chỉ (Streak >= 5)",
              },
              {
                id: "weak_pronunciation",
                label: "⚠️ Phát âm yếu (< 65%)",
              },
              {
                id: "inactive_3days",
                label: "💤 Nghỉ quá 3 ngày",
              },
              {
                id: "locked",
                label: "🔒 Đã khóa",
              },
            ] as Array<{ id: FilterOption; label: string }>
          ).map((pill) => {
            const active = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                  active
                    ? "bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm"
                    : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. STUDENT PROGRESS TRACKING TABLE (DESKTOP + MOBILE CARDS)          */}
      {/* ==================================================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-white">
              Bảng Theo dõi Tiến độ & Quản lý Học viên (
              {filteredAndSortedStudents.length})
            </h2>
            <p className="text-xs text-slate-400">
              Phân bổ thẻ ghi nhớ: <span className="text-rose-400">■ Box 1 (Mới)</span>{" "}
              • <span className="text-sky-400">■ Box 2-3 (Đang ôn)</span> •{" "}
              <span className="text-emerald-400">■ Box 4-5 (Đã thuộc)</span>
            </p>
          </div>
        </div>

        {filteredAndSortedStudents.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-slate-300">
              Không tìm thấy học viên nào khớp với bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (lg:block) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-5">Học viên</th>
                    <th className="py-3.5 px-4">Streak &amp; Thời lượng</th>
                    <th className="py-3.5 px-4 w-72">Tiến độ học (SRS Box)</th>
                    <th className="py-3.5 px-4">Điểm phát âm TB</th>
                    <th className="py-3.5 px-4">Truy cập cuối</th>
                    <th className="py-3.5 px-5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredAndSortedStudents.map((item) => {
                    const u = item.profile;
                    const isLocked = u.status === "locked";
                    const isAdmin = u.role === "admin";
                    const b1Pct = Math.round(
                      (item.box1Count / item.totalCards) * 100
                    );
                    const b23Pct = Math.round(
                      (item.box23Count / item.totalCards) * 100
                    );
                    const b45Pct = Math.max(
                      0,
                      100 - b1Pct - b23Pct
                    );

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-950/50 transition-colors"
                      >
                        {/* Col 1: Học viên */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={u}
                              sizeClass="w-10 h-10 rounded-2xl text-xs"
                              showOnlineDot={!isLocked && item.studiedToday}
                            />
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-extrabold text-white">
                                  {u.full_name}
                                </span>
                                {isAdmin ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                    <Shield className="w-2.5 h-2.5" />
                                    Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                    <GraduationCap className="w-2.5 h-2.5" />
                                    Học viên
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                    isLocked
                                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  }`}
                                >
                                  {isLocked ? "Đã khóa" : "Hoạt động"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Streak & Thời lượng */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1 font-extrabold text-amber-300 text-xs">
                              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                              <span>🔥 {item.streak} ngày</span>
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{item.totalMinutes} phút luyện tập</span>
                            </p>
                          </div>
                        </td>

                        {/* Col 3: Tiến độ học (Progress Bar) */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200">
                                Đã thuộc {item.box45Count} / {item.totalCards}{" "}
                                câu
                              </span>
                              <span className="font-extrabold text-emerald-400">
                                ({item.progressPercent}%)
                              </span>
                            </div>
                            {/* Mini Stacked Bar: Box 1 (Red), Box 2-3 (Blue), Box 4-5 (Emerald) */}
                            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                              <div
                                style={{ width: `${b45Pct}%` }}
                                className="h-full bg-emerald-500 transition-all"
                                title={`Box 4-5 (Đã thuộc): ${item.box45Count} câu`}
                              />
                              <div
                                style={{ width: `${b23Pct}%` }}
                                className="h-full bg-sky-500 transition-all"
                                title={`Box 2-3 (Đang ôn): ${item.box23Count} câu`}
                              />
                              <div
                                style={{ width: `${b1Pct}%` }}
                                className="h-full bg-rose-500/70 transition-all"
                                title={`Box 1 (Chưa thuộc): ${item.box1Count} câu`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="text-emerald-400">
                                Thuộc: {item.box45Count}
                              </span>
                              <span className="text-sky-400">
                                Đang ôn: {item.box23Count}
                              </span>
                              <span className="text-rose-400">
                                Box 1: {item.box1Count}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Col 4: Điểm phát âm TB */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${getPronunciationBadgeStyle(
                              item.avgPronunciation
                            )}`}
                          >
                            <Mic className="w-3 h-3" />
                            <span>{item.avgPronunciation}%</span>
                          </span>
                        </td>

                        {/* Col 5: Truy cập cuối */}
                        <td className="py-4 px-4">
                          <span
                            className={`text-xs font-semibold ${
                              item.daysInactive > 3
                                ? "text-rose-300"
                                : "text-slate-300"
                            }`}
                          >
                            {formatRelativeTimeVi(item.lastActiveAt)}
                          </span>
                        </td>

                        {/* Col 6: Hành động (Actions) */}
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs transition-all"
                              title="Xem chi tiết học viên"
                            >
                              🔍 Chi tiết
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleLock(item)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all ${
                                isLocked
                                  ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
                              }`}
                              title={
                                isLocked
                                  ? "Mở khóa tài khoản"
                                  : "Tạm khóa tài khoản"
                              }
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Mở khóa</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Khóa</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetProgress(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition-all"
                              title="Đặt lại tiến độ học tập về 0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Đặt lại tiến độ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE & TABLET CARD FALLBACK (< lg) */}
            <div className="lg:hidden divide-y divide-slate-800/80">
              {filteredAndSortedStudents.map((item) => {
                const u = item.profile;
                const isLocked = u.status === "locked";
                const isAdmin = u.role === "admin";
                const b1Pct = Math.round(
                  (item.box1Count / item.totalCards) * 100
                );
                const b23Pct = Math.round(
                  (item.box23Count / item.totalCards) * 100
                );
                const b45Pct = Math.max(0, 100 - b1Pct - b23Pct);

                return (
                  <div key={u.id} className="p-4 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          user={u}
                          sizeClass="w-10 h-10 rounded-2xl text-xs"
                          showOnlineDot={!isLocked && item.studiedToday}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-extrabold text-white">
                              {u.full_name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isAdmin
                                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                  : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                              }`}
                            >
                              {isAdmin ? "Admin" : "Học viên"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isLocked
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {isLocked ? "Đã khóa" : "Hoạt động"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border shrink-0 ${getPronunciationBadgeStyle(
                          item.avgPronunciation
                        )}`}
                      >
                        {item.avgPronunciation}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                      <span>🔥 {item.streak} ngày</span>
                      <span>⏱️ {item.totalMinutes} phút</span>
                      <span>
                        Truy cập: {formatRelativeTimeVi(item.lastActiveAt)}
                      </span>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold">
                          Đã thuộc {item.box45Count} / {item.totalCards} câu (
                          {item.progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                        <div
                          style={{ width: `${b45Pct}%` }}
                          className="h-full bg-emerald-500"
                        />
                        <div
                          style={{ width: `${b23Pct}%` }}
                          className="h-full bg-sky-500"
                        />
                        <div
                          style={{ width: `${b1Pct}%` }}
                          className="h-full bg-rose-500/70"
                        />
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(item)}
                        className="py-2 px-3 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold text-xs text-center"
                      >
                        🔍 Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleLock(item)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border text-center ${
                          isLocked
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isLocked ? "Mở khóa" : "Khóa"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetProgress(item)}
                        className="py-2 px-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs text-center"
                      >
                        Đặt lại tiến độ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(item)}
                        className="py-2 px-3 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold text-xs text-center"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. CREATE NEW ACCOUNT MODAL                                          */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Tạo tài khoản mới
                  </h3>
                  <p className="text-xs text-slate-400">
                    Thêm Học viên hoặc Quản trị viên vào hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="hocvien@speakflow.vn"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Mật khẩu
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Vai trò (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="student">🎓 Học viên</option>
                    <option value="admin">🛡️ Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-extrabold text-white shadow-lg"
                >
                  + Tạo tài khoản ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STUDENT DRILL-DOWN ANALYTICS MODAL ("SOI CHI TIẾT HỌC VIÊN")          */}
      {/* ==================================================================== */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onToggleStatus={handleToggleLock}
          onToggleRole={handleToggleRole}
          onResetProgress={handleResetProgress}
        />
      )}
    </div>
  );
}
