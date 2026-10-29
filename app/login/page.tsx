"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  getStoredUserProfile,
  loginWithCredentials,
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
  const [account, setAccount] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [redirectingMsg, setRedirectingMsg] = useState<string | null>(null);
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
    setRedirectingMsg(null);
    setLoading(true);

    if (mode === "login") {
      const res = await loginWithCredentials(account, password);
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Tài khoản hoặc mật khẩu không chính xác.");
        return;
      }

      if (res.user.role === "admin") {
        setRedirectingMsg("Đăng nhập Quản trị viên thành công. Đang chuyển hướng sang Trang Quản lý...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 350);
      } else {
        setRedirectingMsg("Đăng nhập thành công. Đang chuyển hướng sang Trang Học tập...");
        setTimeout(() => {
          window.location.href = "/";
        }, 350);
      }
    } else {
      const res = await registerUserAccount({ email: account, fullName, password });
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Đăng ký không thành công. Vui lòng thử lại.");
        return;
      }

      if (res.user.role === "admin") {
        setRedirectingMsg("Đăng ký thành công. Đang chuyển hướng sang Trang Quản lý...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 350);
      } else {
        setRedirectingMsg("Đăng ký thành công. Đang chuyển hướng sang Trang Học tập...");
        setTimeout(() => {
          window.location.href = "/";
        }, 350);
      }
    }
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

  return (
    <div className="px-4 py-10 md:py-16 max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 p-[1.5px] mx-auto shadow-xl shadow-indigo-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Zap className="w-7 h-7 text-sky-400 fill-sky-400/20" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          SpeakFlow
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Phản xạ giao tiếp tiếng Anh PC &amp; Mobile
        </p>
      </div>

      {/* Main Login / Register Card */}
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-6 md:p-8 space-y-5 shadow-2xl">
        {/* Switch Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
              setRedirectingMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
              mode === "login"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
              setRedirectingMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all ${
              mode === "signup"
                ? "bg-sky-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {/* Current Active Session Chip */}
        {currentUser && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate text-slate-300">
              Đang đăng nhập: <strong className="text-white">{currentUser.full_name}</strong>
            </div>
          </div>
        )}

        {/* Credentials Form */}
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
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>Email hoặc Tên đăng nhập</span>
            </label>
            <input
              type="text"
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="VD: yourname@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none font-medium"
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
                placeholder="Nhập mật khẩu của bạn"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
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

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success / Redirecting Message */}
          {redirectingMsg && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-200 flex items-start gap-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{redirectingMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {mode === "login"
                ? "Đăng nhập vào SpeakFlow"
                : "Tạo tài khoản & Đăng nhập"}
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
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all disabled:opacity-60"
        >
          <GoogleIcon className="w-4 h-4" />
          <span>Tiếp tục với Google OAuth</span>
        </button>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-sky-300 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay về Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
