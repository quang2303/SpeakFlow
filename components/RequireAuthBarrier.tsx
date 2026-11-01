"use client";

import Link from "next/link";
import { Zap, LogIn, ArrowLeft } from "lucide-react";
import { promptLoginToLearn } from "./RequireAuthModal";

export default function RequireAuthBarrier({
  title = "Đăng nhập để bắt đầu học",
  description = "Tiến trình học tập, chuỗi Streak và phân tích phản xạ AI sẽ được lưu trữ an toàn trong tài khoản của bạn.",
  redirectUrl,
}: {
  title?: string;
  description?: string;
  redirectUrl?: string;
}) {
  return (
    <div className="px-4 py-16 max-w-md mx-auto text-center space-y-6 animate-in fade-in">
      <div className="w-16 h-16 rounded-3xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mx-auto shadow-sm">
        <Zap className="w-8 h-8 fill-brand-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() =>
            promptLoginToLearn({
              title,
              subtitle: description,
              redirectUrl,
            })
          }
          className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập ngay</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
