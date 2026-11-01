"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Zap,
  Mail,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Brain,
  Sparkles,
} from "lucide-react";
import {
  loginWithCredentials,
  registerUserAccount,
  signInWithGoogleOAuth,
  UserProfile,
} from "@/lib/dataService";

export interface PromptLoginOptions {
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
  onAuthenticated?: () => void;
}

/**
 * Dispatch global event to open the login modal from any button or page
 */
export function promptLoginToLearn(options?: PromptLoginOptions): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("speakflow-prompt-login", { detail: options || {} })
    );
  }
}

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

export default function RequireAuthModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PromptLoginOptions>({});

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [account, setAccount] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleOpen = useCallback((event: Event) => {
    const custom = event as CustomEvent<PromptLoginOptions>;
    setOptions(custom.detail || {});
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(false);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, []);

  useEffect(() => {
    window.addEventListener("speakflow-prompt-login", handleOpen);
    return () => {
      window.removeEventListener("speakflow-prompt-login", handleOpen);
    };
  }, [handleOpen]);

  // Handle escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  async function handleGoogleLogin() {
    setErrorMsg(null);
    setLoading(true);
    const res = await signInWithGoogleOAuth({ forceRedirect: true });
    if (!res.ok) {
      setLoading(false);
      setErrorMsg(res.error || "Không thể chuyển hướng đăng nhập Google OAuth.");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === "login") {
      const res = await loginWithCredentials(account, password);
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Tài khoản hoặc mật khẩu không chính xác.");
        return;
      }

      setSuccessMsg("Đăng nhập thành công!");
      handleSuccessfulAuth(res.user);
    } else {
      const res = await registerUserAccount({ email: account, fullName, password });
      if (!res.ok || !res.user) {
        setLoading(false);
        setErrorMsg(res.error || "Đăng ký không thành công. Vui lòng thử lại.");
        return;
      }

      setSuccessMsg("Tạo tài khoản thành công!");
      handleSuccessfulAuth(res.user);
    }
  }

  function handleSuccessfulAuth(user: UserProfile) {
    // Notify all app listeners
    try {
      window.dispatchEvent(new Event("speakflow-auth-changed"));
    } catch {
      // ignore
    }

    setTimeout(() => {
      handleClose();
      if (options.onAuthenticated) {
        options.onAuthenticated();
      } else if (options.redirectUrl) {
        router.push(options.redirectUrl);
      }
    }, 400);
  }

  const title = options.title || "Đăng nhập để bắt đầu học";
  const subtitle =
    options.subtitle ||
    "Tiến trình học tập, chuỗi Streak và phân tích phản xạ AI sẽ được lưu trữ an toàn trong tài khoản của bạn.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 absolute right-4 top-4 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon + Title */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/25">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
          >
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-2">
            {subtitle}
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 py-1 text-center">
          <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 space-y-1">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto" />
            <p className="text-[11px] font-bold text-amber-900 leading-tight">
              Giữ chuỗi Streak
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 space-y-1">
            <Brain className="w-4 h-4 text-emerald-600 mx-auto" />
            <p className="text-[11px] font-bold text-emerald-900 leading-tight">
              Ghi nhớ SRS
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/60 space-y-1">
            <Sparkles className="w-4 h-4 text-indigo-600 mx-auto" />
            <p className="text-[11px] font-bold text-indigo-900 leading-tight">
              Gia sư AI
            </p>
          </div>
        </div>

        {/* Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-xs active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <GoogleIcon className="w-4 h-4" />
            )}
            <span>Tiếp tục với Google</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 shrink-0">
            hoặc đăng nhập bằng Email
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tạo tài khoản
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {/* Inline Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Họ và tên
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-900"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Email hoặc Tên tài khoản
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>{mode === "login" ? "Đăng nhập ngay" : "Tạo tài khoản và học ngay"}</span>
          </button>
        </form>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 pt-1">
          Bằng việc đăng nhập, bạn đồng ý với Điều khoản và Chính sách bảo mật của SpeakFlow.
        </p>
      </div>
    </div>
  );
}
