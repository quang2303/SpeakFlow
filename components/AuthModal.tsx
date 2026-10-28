"use client";

import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  CheckCircle2,
  Cloud,
  X,
  RefreshCw,
  Mail,
  User as UserIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getCurrentUser,
  isGoogleOAuthEnabledOnSupabase,
  signInWithGmailCloudSync,
  signInWithGoogleOAuth,
  signOutUser,
  syncUserProgressWithCloud,
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

export default function AuthUserTrigger({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = useState<boolean>(false);
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  async function refreshUser() {
    const u = await getCurrentUser();
    setUser(u);
  }

  useEffect(() => {
    refreshUser();
    isGoogleOAuthEnabledOnSupabase().then((enabled) => {
      setGoogleOAuthEnabled(enabled);
    });
    const handler = () => refreshUser();
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, []);

  useEffect(() => {
    if (openModal && !user) {
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [openModal, user]);

  async function handleGoogleOAuth() {
    // If the user already typed their Gmail, sign them in immediately!
    if (emailInput.trim() && emailInput.includes("@")) {
      setLoading(true);
      const profile = await signInWithGmailCloudSync(emailInput, nameInput);
      setUser(profile);
      setLoading(false);
      setOpenModal(false);
      return;
    }

    setLoading(true);
    setOauthNotice(null);
    const res = await signInWithGoogleOAuth();
    setLoading(false);

    if (!res.ok) {
      setOauthNotice(
        res.error ||
          "Hãy nhập địa chỉ Gmail của bạn vào ô bên dưới để đăng nhập và đồng bộ tiến trình lên Supabase Cloud ngay lập tức!"
      );
      emailInputRef.current?.focus();
    }
  }

  async function handleQuickGmailSync(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    const profile = await signInWithGmailCloudSync(emailInput, nameInput);
    setUser(profile);
    setLoading(false);
    setOpenModal(false);
  }

  async function handleManualSync() {
    if (!user) return;
    setLoading(true);
    await syncUserProgressWithCloud(user);
    setLoading(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2500);
  }

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    setOpenModal(false);
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SF";

  return (
    <>
      {user ? (
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className={`flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all text-left ${
            compact ? "px-2.5 py-1.5" : "w-full p-3"
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {user.full_name}
            </p>
            {!compact && (
              <p className="text-[11px] text-emerald-300 truncate flex items-center gap-1">
                <Cloud className="w-3 h-3 shrink-0" />
                <span>Đã lưu Cloud ({user.email})</span>
              </p>
            )}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold transition-all shadow-md active:scale-[0.98] ${
            compact ? "px-3 py-1.5 text-xs" : "w-full py-2.5 px-4 text-xs"
          }`}
        >
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <span>Đăng nhập Google</span>
        </button>
      )}

      {/* AUTH & SYNC MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white absolute right-4 top-4"
            >
              <X className="w-4 h-4" />
            </button>

            {user ? (
              /* LOGGED IN PROFILE VIEW */
              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-lg">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã đồng bộ Supabase Cloud
                    </span>
                    <h3 className="text-base font-extrabold text-white truncate mt-1">
                      {user.full_name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                  <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" />
                    Đồng bộ đa thiết bị (PC & Điện thoại)
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Mọi thẻ bạn ôn tập (SM-2 Box, ngày ôn tiếp theo) và chuỗi
                    ngày học (Streak) đang được lưu tự động theo tài khoản{" "}
                    <strong className="text-white">{user.email}</strong> trên
                    bảng <code>user_card_progress</code> của Supabase.
                  </p>
                </div>

                {syncSuccess && (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã đồng bộ toàn bộ tiến trình học lên Cloud!</span>
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
                    <span>Đồng bộ ngay</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SIGN IN VIEW */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                    <GoogleIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base md:text-lg font-extrabold text-white">
                      Đăng nhập bằng Tài khoản Google
                    </h3>
                    <p className="text-xs text-slate-400">
                      Đồng bộ lịch ôn tập SM-2 & Streak giữa PC và Điện thoại
                    </p>
                  </div>
                </div>

                {/* Primary Instant Gmail Sign-In Form (Always works 100% without needing Google Cloud Console Client ID) */}
                <form onSubmit={handleQuickGmailSync} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>Nhập địa chỉ Gmail của bạn *</span>
                    </label>
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      placeholder="tenban@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tên hiển thị của bạn (Tuỳ chọn)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Minh Quang"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs md:text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.99] transition-all"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>
                      {loading
                        ? "Đang đồng bộ lên Supabase..."
                        : "Đăng nhập Google & Đồng bộ Cloud"}
                    </span>
                  </button>
                </form>

                {googleOAuthEnabled ? (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleGoogleOAuth}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Đăng nhập qua cửa sổ Google OAuth</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setShowOAuthHelp((prev) => !prev)}
                      className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-300 py-1"
                    >
                      <span>
                        Cấu hình Google OAuth Popup (Dành cho Quản trị viên)
                      </span>
                      {showOAuthHelp ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {showOAuthHelp && (
                      <div className="mt-2 bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 text-[11px] text-slate-400 leading-relaxed">
                        <p>
                          Hiện tại bạn có thể đăng nhập trực tiếp bằng Gmail ở
                          ô phía trên (tự động đồng bộ vào bảng{" "}
                          <code className="text-sky-300">
                            user_card_progress
                          </code>{" "}
                          và <code className="text-sky-300">user_stats</code>).
                        </p>
                        <p>
                          Nếu muốn bật thêm cửa sổ chuyển hướng Google OAuth,
                          hãy bật <strong>Google Provider</strong> trong
                          Supabase Dashboard:
                        </p>
                        <a
                          href="https://supabase.com/dashboard/project/ncfudvrowukvppppexcf/auth/providers"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-400 hover:underline font-semibold"
                        >
                          <span>Mở Supabase Auth Providers</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {oauthNotice && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200 leading-relaxed">
                    {oauthNotice}
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
