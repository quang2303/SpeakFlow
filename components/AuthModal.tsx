"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LogOut,
  CheckCircle2,
  Cloud,
  X,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Flame,
  Trophy,
  BookOpenCheck,
  Pencil,
  AlertTriangle,
  Loader2,
  UserCheck,
  ChevronRight,
  ArrowLeftRight,
  Shield,
  Lock,
} from "lucide-react";
import {
  AccountProgressSummary,
  getAccountProgressSummary,
  getCurrentUser,
  getInitialAccountProgressSummary,
  getStoredUserProfile,
  getSupabaseCallbackUrl,
  isGoogleOAuthEnabledOnSupabase,
  signInWithGoogleOAuth,
  signOutUser,
  syncUserProgressWithCloud,
  updateUserDisplayName,
  UserProfile,
} from "@/lib/dataService";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
      />
    </svg>
  );
}

export function UserAvatar({
  user,
  sizeClass = "w-9 h-9 rounded-xl text-xs",
  showOnlineDot = false,
}: {
  user: UserProfile;
  sizeClass?: string;
  showOnlineDot?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SF";

  return (
    <div className="relative shrink-0 inline-flex">
      {user.avatar_url && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.full_name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${sizeClass} object-cover shrink-0 shadow border border-emerald-400/40`}
        />
      ) : (
        <div
          className={`${sizeClass} bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow border border-white/15`}
        >
          {initials}
        </div>
      )}
      {showOnlineDot && (
        <span
          title="Đã đăng nhập Google"
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-[0_0_8px_#34d399]"
        />
      )}
    </div>
  );
}

export default function AuthUserTrigger({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [progress, setProgress] = useState<AccountProgressSummary | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean>(true);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Editing display name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const callbackUrl = getSupabaseCallbackUrl();

  const syncFromLocalCache = useCallback(() => {
    const immediateUser = getStoredUserProfile();
    const immediateSummary = getInitialAccountProgressSummary();
    setUser(immediateUser);
    setProgress(immediateSummary);
    if (immediateUser) {
      setNameDraft(immediateUser.full_name);
    }
  }, []);

  const refreshUserAndProgress = useCallback(async () => {
    syncFromLocalCache();

    const [u, enabled] = await Promise.all([
      getCurrentUser(),
      isGoogleOAuthEnabledOnSupabase(),
    ]);
    setUser(u);
    setProgress(getInitialAccountProgressSummary());
    setGoogleOAuthEnabled(enabled);
    if (u) {
      setNameDraft(u.full_name);
    }
  }, [syncFromLocalCache]);

  useEffect(() => {
    void refreshUserAndProgress();
    const handler = () => syncFromLocalCache();
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, [refreshUserAndProgress, syncFromLocalCache]);

  async function handleTriggerGoogleLogin(forceRedirect = false) {
    setLoading(true);
    setOauthError(null);

    const res = await signInWithGoogleOAuth({ forceRedirect });

    if (!res.ok) {
      setLoading(false);
      if (res.providerDisabled) {
        setGoogleOAuthEnabled(false);
      }
      setOauthError(
        res.error || "Không thể khởi tạo kết nối đăng nhập với Google."
      );
      setOpenModal(true);
    }
  }

  async function handlePrimaryButtonClick() {
    if (user) {
      setOpenModal(true);
      void refreshUserAndProgress();
      return;
    }

    setLoading(true);
    const enabled = await isGoogleOAuthEnabledOnSupabase();
    setGoogleOAuthEnabled(enabled);

    if (enabled) {
      await handleTriggerGoogleLogin(true);
    } else {
      setLoading(false);
      setOpenModal(true);
    }
  }

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setLoading(true);
    const updated = await updateUserDisplayName(nameDraft);
    if (updated) {
      setUser(updated);
    }
    setIsEditingName(false);
    setLoading(false);
  }

  async function handleManualSync() {
    if (!user) return;
    setLoading(true);
    await syncUserProgressWithCloud(user);
    await refreshUserAndProgress();
    setLoading(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2500);
  }

  async function handleLogout(e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
    }
    setLoading(true);
    await signOutUser();
    setUser(null);
    await refreshUserAndProgress();
    setLoading(false);
    setOpenModal(false);
  }

  function handleCopyCallbackUrl() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  }

  return (
    <>
      {user ? (
        compact ? (
          /* ================= COMPACT TOP-RIGHT LOGGED-IN PILL ================= */
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-1 pr-2 shadow-sm">
            <button
              type="button"
              onClick={handlePrimaryButtonClick}
              className="flex items-center gap-2 px-1.5 py-0.5 rounded-xl hover:bg-emerald-500/15 transition-all text-left"
              title="Xem hồ sơ & tiến độ đã lưu"
            >
              <UserAvatar
                user={user}
                sizeClass="w-7 h-7 rounded-lg text-[11px]"
                showOnlineDot
              />
              <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-white truncate">
                    {user.full_name}
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-emerald-300 truncate flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                  <span>Đã đăng nhập</span>
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              title="Đăng xuất tài khoản Google"
              className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* ================= SIDEBAR FULL LOGGED-IN ACCOUNT CARD ================= */
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 via-slate-900/95 to-slate-900 p-3.5 space-y-3 shadow-lg shadow-emerald-950/20">
            {/* Status Header Badge */}
            <div className="flex items-center justify-between gap-2">
              {user.status === "locked" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <Lock className="w-3 h-3" />
                  Đang tạm khóa
                </span>
              ) : user.role === "admin" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  <Shield className="w-3 h-3" />
                  Quản trị viên (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Học viên • Đã đăng nhập
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300">
                <Cloud className="w-3 h-3" />
                <span>Đã đồng bộ</span>
              </span>
            </div>

            {/* User Avatar + Name + Email */}
            <div
              onClick={handlePrimaryButtonClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handlePrimaryButtonClick();
                }
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <UserAvatar
                user={user}
                sizeClass="w-10 h-10 rounded-xl text-xs"
                showOnlineDot={user.status !== "locked"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-white truncate group-hover:text-sky-300 transition-colors">
                  {user.full_name}
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  {user.email}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white shrink-0" />
            </div>

            {/* Mini Saved Progress Bar */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/80 border border-slate-800/90 rounded-xl p-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold px-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                <span className="truncate">
                  Streak: {progress?.currentStreak || 1} ngày
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sky-300 font-bold px-1 border-l border-slate-800">
                <BookOpenCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">
                  Lưu: {progress?.practicedCards || 0}/
                  {progress?.totalCards || 100} câu
                </span>
              </div>
            </div>

            {user.role === "admin" && (
              <Link
                href="/admin"
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>🛡️ Mở Bảng Quản trị (Admin)</span>
              </Link>
            )}

            {/* Direct Action Buttons: Đổi TK & Đăng xuất */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Link
                href="/login"
                className="py-2 px-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                <span>Đổi tài khoản</span>
              </Link>
              <button
                type="button"
                disabled={loading}
                onClick={handleLogout}
                className="py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )
      ) : compact ? (
        /* ================= COMPACT LOGGED-OUT BUTTON ================= */
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold transition-all shadow-md active:scale-[0.98] px-3.5 py-2 text-xs"
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>Đăng nhập</span>
        </Link>
      ) : (
        /* ================= SIDEBAR LOGGED-OUT BOX ================= */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Chưa đăng nhập
            </span>
            <span className="text-slate-400">Lưu tạm trên máy</span>
          </div>

          <Link
            href="/login"
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Đăng nhập tài khoản</span>
          </Link>

          <button
            type="button"
            disabled={loading}
            onClick={handlePrimaryButtonClick}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-800 shrink-0" />
            ) : (
              <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{loading ? "Đang gọi Google..." : "Đăng nhập Google"}</span>
          </button>
        </div>
      )}

      {/* AUTH & CLOUD PROGRESS MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white absolute right-4 top-4"
            >
              <X className="w-4 h-4" />
            </button>

            {user ? (
              /* ================= LOGGED IN GOOGLE ACCOUNT & SAVED PROGRESS VIEW ================= */
              <div className="space-y-5">
                <div className="flex items-center gap-3.5 pr-8">
                  <UserAvatar
                    user={user}
                    sizeClass="w-14 h-14 rounded-2xl text-lg"
                    showOnlineDot
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Đang đăng nhập Google
                    </span>

                    {isEditingName ? (
                      <form
                        onSubmit={handleSaveDisplayName}
                        className="mt-1.5 flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          className="w-full bg-slate-950 border border-sky-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          placeholder="Tên hiển thị"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs shrink-0"
                        >
                          Lưu
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <h3 className="text-base font-extrabold text-white truncate">
                          {user.full_name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setNameDraft(user.full_name);
                            setIsEditingName(true);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300"
                          title="Đổi tên hiển thị"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Saved Account Progress Breakdown */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4" />
                      <span>Tiến độ học đã lưu theo tài khoản</span>
                    </p>
                    {progress?.lastSyncedAt && (
                      <span className="text-[10px] text-slate-400">
                        Đồng bộ:{" "}
                        {new Date(progress.lastSyncedAt).toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-400 font-extrabold text-base">
                        <Flame className="w-4 h-4 fill-amber-400/20" />
                        <span>{progress?.currentStreak || 1}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Ngày liên tiếp
                      </p>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-sky-400 font-extrabold text-base">
                        <BookOpenCheck className="w-4 h-4" />
                        <span>
                          {progress?.practicedCards || 0}/
                          {progress?.totalCards || 100}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Mẫu câu đã học
                      </p>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-emerald-400 font-extrabold text-base">
                        <Trophy className="w-4 h-4" />
                        <span>{progress?.masteredCards || 0}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Câu thành thạo
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
                    Hôm nay đã ôn:{" "}
                    <strong className="text-white">
                      {progress?.todayReviewedCount || 0} thẻ
                    </strong>{" "}
                    • Cần ôn hôm nay:{" "}
                    <strong className="text-amber-300">
                      {progress?.dueCards || 0} thẻ
                    </strong>
                    . Toàn bộ thông tin hồ sơ, chuỗi Streak ({" "}
                    <code>user_stats</code> ) và tiến độ SM-2 từng thẻ ({" "}
                    <code>user_card_progress</code> ) được lưu tự động trên
                    Supabase Cloud.
                  </p>
                </div>

                {syncSuccess && (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Đã đồng bộ hồ sơ & toàn bộ tiến trình học lên Supabase
                      Cloud!
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleManualSync}
                    className="flex-1 py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    <span>Đồng bộ tiến độ ngay</span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleLogout}
                    className="py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= GOOGLE OAUTH SIGN-IN VIEW ================= */
              <div className="space-y-4">
                <div className="flex items-center gap-3 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                    <GoogleIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base md:text-lg font-extrabold text-white">
                      Đăng nhập bằng Google
                    </h3>
                    <p className="text-xs text-slate-400">
                      Xác thực qua Google OAuth & lưu tiến độ học lên Cloud
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                  <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    <span>Quyền lợi khi đăng nhập Google:</span>
                  </p>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside leading-relaxed">
                    <li>
                      Tự động lưu hồ sơ Google (Tên, Email, Ảnh đại diện) vào{" "}
                      <code className="text-sky-300">user_stats</code>.
                    </li>
                    <li>
                      Lưu lịch ôn tập Spaced Repetition (SM-2) của từng thẻ vào{" "}
                      <code className="text-sky-300">user_card_progress</code>.
                    </li>
                    <li>
                      Đồng bộ chuỗi ngày học (Streak) và kết quả Phản xạ 60s
                      xuyên suốt giữa máy tính (PC) và điện thoại.
                    </li>
                  </ul>
                </div>

                {/* Primary Google OAuth Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTriggerGoogleLogin(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs md:text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? "Đang chuyển hướng tới Google..."
                      : "Tiếp tục với Google (accounts.google.com)"}
                  </span>
                </button>

                {!googleOAuthEnabled && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex items-start gap-2 text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-300">
                          Cần bật Google Provider trên Supabase Dashboard
                        </p>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Hệ thống phát hiện <strong>Google Provider</strong>{" "}
                          trên project Supabase của bạn đang ở trạng thái tắt (
                          <code>external.google = false</code>). Hãy bật theo 2
                          bước sau để gọi tới Google:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300">
                      <p>
                        <strong>Bước 1:</strong> Trong Google Cloud Console (mục{" "}
                        <em>OAuth 2.0 Client IDs</em>), dán Callback URL này vào{" "}
                        <strong>Authorized redirect URIs</strong>:
                      </p>
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                        <code className="text-[10px] text-sky-300 truncate flex-1">
                          {callbackUrl}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyCallbackUrl}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 shrink-0"
                        >
                          {copiedCallback ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="pt-1">
                        <strong>Bước 2:</strong> Mở Supabase Auth Providers, bật{" "}
                        <strong>Enable Sign in with Google</strong>, dán{" "}
                        <em>Client ID</em> & <em>Client Secret</em> rồi bấm{" "}
                        <strong>Save</strong>:
                      </p>
                      <a
                        href="https://supabase.com/dashboard/project/ncfudvrowukvppppexcf/auth/providers"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-400 hover:underline font-bold pt-0.5"
                      >
                        <span>Mở Supabase Auth Providers Dashboard</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {oauthError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-200 leading-relaxed">
                    {oauthError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
