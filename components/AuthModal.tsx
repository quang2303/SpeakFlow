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
  ChevronRight,
  ArrowLeftRight,
  Shield,
  Lock,
} from "lucide-react";
import {
  AccountProgressSummary,
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

  const initials = user?.full_name?.trim()
    ? user.full_name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SF";

  return (
    <div className="relative shrink-0 inline-flex">
      {user?.avatar_url && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.full_name || "User Avatar"}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${sizeClass} object-cover shrink-0 shadow-xs border border-emerald-400`}
        />
      ) : (
        <div
          className={`${sizeClass} bg-brand-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs`}
        >
          {initials}
        </div>
      )}
      {showOnlineDot && (
        <span
          title="Đã đăng nhập"
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
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
    const handleAuth = () => void refreshUserAndProgress();
    window.addEventListener("speakflow-auth-changed", handleAuth);
    return () => window.removeEventListener("speakflow-auth-changed", handleAuth);
  }, [refreshUserAndProgress]);

  async function handleTriggerGoogleLogin(skipNotice = false) {
    setLoading(true);
    setOauthError(null);
    try {
      const res = await signInWithGoogleOAuth({ forceRedirect: true });
      if (!res.ok) {
        setOauthError(res.error || "Không thể khởi động Google OAuth.");
        setLoading(false);
      }
    } catch {
      setOauthError("Lỗi kết nối khi gọi Google OAuth.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    await signOutUser();
    setUser(null);
    setOpenModal(false);
    setLoading(false);
    window.location.reload();
  }

  async function handleManualSync() {
    if (!user) return;
    setLoading(true);
    setSyncSuccess(false);
    await syncUserProgressWithCloud(user);
    setSyncSuccess(true);
    const fresh = await getCurrentUser();
    setUser(fresh);
    setProgress(getInitialAccountProgressSummary());
    setLoading(false);
    setTimeout(() => setSyncSuccess(false), 3000);
  }

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setLoading(true);
    const updated = await updateUserDisplayName(nameDraft.trim());
    if (updated) {
      setUser(updated);
      setIsEditingName(false);
    }
    setLoading(false);
  }

  function handlePrimaryButtonClick() {
    setOpenModal(true);
  }

  async function handleCopyCallbackUrl() {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  }

  return (
    <>
      {user ? (
        compact ? (
          /* ================= COMPACT PILL ================= */
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1 pr-2 shadow-xs">
            <button
              type="button"
              onClick={handlePrimaryButtonClick}
              className="flex items-center gap-2 px-1.5 py-0.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
              title="Xem hồ sơ"
            >
              <UserAvatar
                user={user}
                sizeClass="w-7 h-7 rounded-lg text-xs"
                showOnlineDot
              />
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                {user.full_name}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              title="Đăng xuất"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* ================= SIDEBAR PROFILE CARD ================= */
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            <div
              onClick={handlePrimaryButtonClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handlePrimaryButtonClick();
                }
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <UserAvatar
                user={user}
                sizeClass="w-9 h-9 rounded-xl text-xs"
                showOnlineDot={user.status !== "locked"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.role === "admin" ? "Quản trị viên" : "Học viên"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
            </div>
          </div>
        )
      ) : compact ? (
        /* ================= COMPACT LOGGED-OUT BUTTON ================= */
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors shadow-xs px-3 py-1.5 text-xs"
        >
          <GoogleIcon className="w-3.5 h-3.5" />
          <span>Đăng nhập</span>
        </Link>
      ) : (
        /* ================= SIDEBAR LOGGED-OUT CARD ================= */
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <Link
            href="/login"
            className="w-full py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Đăng nhập tài khoản</span>
          </Link>
        </div>
      )}

      {/* AUTH & CLOUD PROGRESS MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 absolute right-4 top-4 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {user ? (
              /* ================= LOGGED IN PROFILE VIEW ================= */
              <div className="space-y-5">
                <div className="flex items-center gap-3.5 pr-8">
                  <UserAvatar
                    user={user}
                    sizeClass="w-14 h-14 rounded-2xl text-lg"
                    showOnlineDot
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã kết nối tài khoản
                    </span>

                    {isEditingName ? (
                      <form
                        onSubmit={handleSaveDisplayName}
                        className="mt-2 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          className="w-full bg-white border border-brand-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                          placeholder="Tên hiển thị"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-brand-600 text-white font-semibold text-xs shrink-0"
                        >
                          Lưu
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {user.full_name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setNameDraft(user.full_name);
                            setIsEditingName(true);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-600"
                          title="Đổi tên hiển thị"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Progress Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-brand-600" />
                      <span>Tiến độ học tập</span>
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
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-xs">
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-bold text-base">
                        <Flame className="w-4 h-4 fill-amber-500" />
                        <span>{progress?.currentStreak || 1}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Ngày liên tiếp
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-xs">
                      <div className="flex items-center justify-center gap-1 text-brand-600 font-bold text-base">
                        <BookOpenCheck className="w-4 h-4" />
                        <span>
                          {progress?.practicedCards || 0}/
                          {progress?.totalCards || 100}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Mẫu câu đã học
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-xs">
                      <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-base">
                        <Trophy className="w-4 h-4" />
                        <span>{progress?.masteredCards || 0}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Câu thành thạo
                      </p>
                    </div>
                  </div>
                </div>

                {syncSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã đồng bộ dữ liệu thành công!</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleManualSync}
                    className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
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
                    className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
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
                  <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center shadow-xs shrink-0">
                    <GoogleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Đăng nhập tài khoản
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lưu và đồng bộ tiến độ học tập trên mọi thiết bị
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTriggerGoogleLogin(true)}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs md:text-sm flex items-center justify-center gap-2.5 shadow-xs transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                  ) : (
                    <GoogleIcon className="w-4 h-4" />
                  )}
                  <span>
                    {loading
                      ? "Đang chuyển hướng tới Google..."
                      : "Tiếp tục với tài khoản Google"}
                  </span>
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    onClick={() => setOpenModal(false)}
                    className="text-xs text-brand-600 hover:underline font-medium"
                  >
                    Đăng nhập bằng tài khoản hoặc mật khẩu →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
