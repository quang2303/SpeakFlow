"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Shield,
  Flame,
  AlertTriangle,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ArrowLeft,
  Check,
} from "lucide-react";
import {
  DEMO_ACCOUNTS,
  DemoAccountPreset,
  getStoredUserProfile,
  loginWithCredentials,
  loginWithDemoAccount,
  registerUserAccount,
  signInWithGoogleOAuth,
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

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRedirectMsg, setSuccessRedirectMsg] = useState<string | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUserProfile());
    const handler = () => setCurrentUser(getStoredUserProfile());
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, []);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessRedirectMsg(null);
    setLoading(true);

    if (mode === "login") {
      const res = await loginWithCredentials(email, password);
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Đăng nhập không thành công.");
        return;
      }

      if (res.user.role === "admin") {
        setSuccessRedirectMsg(
          `🛡️ Đăng nhập Quản trị viên thành công! Đang chuyển hướng sang Trang Quản lý (/admin)...`
        );
        setTimeout(() => {
          window.location.href = "/admin";
        }, 350);
      } else {
        setSuccessRedirectMsg(
          `🎓 Đăng nhập Học viên thành công! Đang chuyển hướng sang Trang Học tập (/)...`
        );
        setTimeout(() => {
          window.location.href = "/";
        }, 350);
      }
    } else {
      const res = await registerUserAccount({ email, fullName, password });
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Đăng ký không thành công.");
        return;
      }

      if (res.user.role === "admin") {
        setSuccessRedirectMsg(
          `🛡️ Tài khoản Quản trị viên mới đã sẵn sàng! Đang chuyển hướng sang Trang Quản lý (/admin)...`
        );
        setTimeout(() => {
          window.location.href = "/admin";
        }, 350);
      } else {
        setSuccessRedirectMsg(
          `🎓 Tạo tài khoản thành công! Đang chuyển hướng sang Trang Học tập (/)...`
        );
        setTimeout(() => {
          window.location.href = "/";
        }, 350);
      }
    }
  }

  async function handleQuickDemoLogin(demo: DemoAccountPreset) {
    setErrorMsg(null);
    setSuccessRedirectMsg(null);
    setActiveDemoId(demo.id);
    setLoading(true);
    const loggedInUser = await loginWithDemoAccount(demo.id);

    if (loggedInUser.role === "admin") {
      setSuccessRedirectMsg(
        `🛡️ Chuyển quyền Admin thành công! Đang mở Trang Quản lý (/admin)...`
      );
      setTimeout(() => {
        window.location.href = "/admin";
      }, 350);
    } else {
      setSuccessRedirectMsg(
        `🎓 Đã đăng nhập tài khoản "${loggedInUser.full_name}"! Đang mở Trang Học tập (/)...`
      );
      setTimeout(() => {
        window.location.href = "/";
      }, 350);
    }
  }

  function handleAutoFillAdmin() {
    setMode("login");
    setEmail("admin@speakflow.vn");
    setPassword("123");
    setErrorMsg(null);
  }

  function handleAutoFillStudent() {
    setMode("login");
    setEmail("chamchi@speakflow.vn");
    setPassword("123");
    setErrorMsg(null);
  }

  async function handleGoogleLogin() {
    setErrorMsg(null);
    setLoading(true);
    const res = await signInWithGoogleOAuth({ forceRedirect: true });
    if (!res.ok) {
      setLoading(false);
      setErrorMsg(
        res.error || "Không thể chuyển hướng đăng nhập Google OAuth."
      );
    }
  }

  function getDemoCardStyle(color: DemoAccountPreset["badge_color"]) {
    switch (color) {
      case "indigo":
        return {
          card: "border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 hover:border-indigo-400",
          badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
          iconBox: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
          Icon: Shield,
        };
      case "emerald":
        return {
          card: "border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 hover:border-emerald-400",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          iconBox: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          Icon: Flame,
        };
      case "amber":
        return {
          card: "border-amber-500/40 bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 hover:border-amber-400",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          iconBox: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          Icon: AlertTriangle,
        };
      case "rose":
        return {
          card: "border-rose-500/40 bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-950 hover:border-rose-400",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          iconBox: "bg-rose-500/20 text-rose-300 border-rose-500/30",
          Icon: Lock,
        };
    }
  }

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-10 pb-14 max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-sky-400 fill-sky-400/20" />
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Đăng nhập SpeakFlow
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Hệ thống tự động chuyển hướng:{" "}
              <strong className="text-indigo-300">Admin</strong> → Bảng Quản trị
              (/admin) • <strong className="text-sky-300">Học viên</strong> →
              Trang Học tập (/)
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white leading-tight">
                Đang đăng nhập: {currentUser.full_name}
              </p>
              <p className="text-[11px] text-slate-400">
                {currentUser.email} •{" "}
                {currentUser.role === "admin" ? (
                  <span className="text-indigo-300 font-extrabold">
                    🛡️ Quản trị viên
                  </span>
                ) : (
                  <span className="text-emerald-300 font-bold">
                    🎓 Học viên
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN (6 Cols): STANDARD CREDENTIALS LOGIN / SIGN UP FORM */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 md:p-7 space-y-5 shadow-2xl">
            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessRedirectMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  mode === "login"
                    ? "bg-sky-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng nhập tài khoản
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMsg(null);
                  setSuccessRedirectMsg(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
                  mode === "signup"
                    ? "bg-sky-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Đăng ký tài khoản mới
              </button>
            </div>

            {/* Quick Auto-fill shortcuts for convenience */}
            {mode === "login" && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Điền nhanh thông tin tài khoản mẫu:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillAdmin}
                    className="p-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all text-left"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Điền Admin: admin / 123</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoFillStudent}
                    className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all text-left"
                  >
                    <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Điền Học viên: chamchi / 123</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Họ và tên</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>Email hoặc Tên tài khoản</span>
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập 'admin' hoặc email (VD: admin@speakflow.vn)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white focus:outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>Mật khẩu</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (VD: 123)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs md:text-sm text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label="Hiện/ẩn mật khẩu"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Informational Role Redirect Box */}
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center gap-1 text-indigo-300 font-bold">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>Tài khoản Admin: Tự động chuyển thẳng sang /admin</span>
                </p>
                <p className="flex items-center gap-1 text-slate-400">
                  <UserIcon className="w-3 h-3 text-sky-400" />
                  <span>Tài khoản Học viên: Chuyển sang Trang học tập (/)</span>
                </p>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Redirect Alert */}
              {successRedirectMsg && (
                <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-200 flex items-start gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successRedirectMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {loading && !activeDemoId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>
                  {mode === "login"
                    ? "Đăng nhập vào Hệ thống"
                    : "Đăng ký tài khoản & Đăng nhập"}
                </span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800" />
              <span className="flex-shrink mx-3 text-[11px] font-semibold uppercase text-slate-500">
                Hoặc kết nối Cloud
              </span>
              <div className="flex-grow border-t border-slate-800" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Tiếp tục với Google OAuth</span>
            </button>

            <div className="text-center pt-1">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay về Bảng điều khiển Trang chủ</span>
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (6 Cols): 1-CLICK QUICK DEMO SWITCHER */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-7 space-y-4 shadow-xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ĐĂNG NHẬP 1-CLICK ĐỂ TEST NHANH</span>
              </div>
              <h2 className="text-base md:text-lg font-extrabold text-white pt-1">
                ⚡ Chọn nhanh tài khoản mẫu (Demo Switcher)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bạn cũng có thể chạm trực tiếp vào thẻ bất kỳ bên dưới để đăng
                nhập tự động:
              </p>
            </div>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((demo) => {
                const style = getDemoCardStyle(demo.badge_color);
                const Icon = style.Icon;
                const isSelected = currentUser?.id === demo.id;
                const isLoggingIn = activeDemoId === demo.id;

                return (
                  <button
                    key={demo.id}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin(demo)}
                    className={`w-full group text-left rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 shadow-md active:scale-[0.99] ${
                      style.card
                    } ${
                      isSelected
                        ? "ring-2 ring-sky-400 shadow-sky-500/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${style.badge}`}
                      >
                        {demo.persona_label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/40">
                          Đang phiên này
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${style.iconBox}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-sky-300 transition-colors">
                            {demo.full_name}
                          </h3>
                          <span className="text-[10px] font-mono text-slate-400">
                            MK: {demo.password}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate">
                          {demo.email}
                        </p>
                      </div>
                    </div>

                    <div className="w-full pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-sky-300 group-hover:text-white">
                      <span>
                        {isLoggingIn
                          ? "Đang chuyển tài khoản..."
                          : demo.role === "admin"
                          ? "🛡️ Đăng nhập & Vào Trang Quản lý (/admin)"
                          : "🎓 Đăng nhập & Vào Trang Học tập (/)"}
                      </span>
                      {isLoggingIn ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
