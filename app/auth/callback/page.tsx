"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  getCurrentUser,
  syncUserProgressWithCloud,
} from "@/lib/dataService";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState(
    "Đang xác thực tài khoản Google và đồng bộ tiến độ học..."
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleOAuthCallback() {
      try {
        if (typeof window !== "undefined") {
          const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
          );
          const queryParams = new URLSearchParams(window.location.search);
          const errorDesc =
            queryParams.get("error_description") ||
            hashParams.get("error_description");

          if (errorDesc) {
            if (active) {
              setErrorMsg(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
            }
            return;
          }
        }

        const user = await getCurrentUser();
        if (user) {
          if (active) {
            setStatusText(
              `Xin chào ${user.full_name}! Đang tải tiến độ học từ Cloud...`
            );
          }
          await syncUserProgressWithCloud(user);
        }

        if (active) {
          router.replace("/");
        }
      } catch (err) {
        if (active) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Không thể hoàn tất xác thực Google OAuth."
          );
        }
      }
    }

    handleOAuthCallback();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-4 shadow-2xl">
        {errorMsg ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-lg font-extrabold text-white">
              Chưa hoàn tất đăng nhập Google
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all"
            >
              Quay về Trang chủ
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 mx-auto flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            </div>
            <h1 className="text-lg font-extrabold text-white">
              Đang kết nối Google Account
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusText}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
