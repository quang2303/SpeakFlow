"use client";

import Link from "next/link";
import { Lock, ArrowLeftRight, Home, ShieldAlert } from "lucide-react";
import { UserProfile } from "@/lib/dataService";

export default function AccountLockScreen({
  user,
}: {
  user?: UserProfile | null;
}) {
  return (
    <div className="px-4 md:px-8 pt-10 pb-12 max-w-lg mx-auto">
      <div className="rounded-3xl bg-gradient-to-b from-rose-950/50 via-slate-900 to-slate-950 border border-rose-500/40 p-6 md:p-8 text-center space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 mx-auto flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Lock className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>TRẠNG THÁI: TÀI KHOẢN TẠM KHÓA (LOCKED)</span>
          </span>

          <h1 className="text-xl md:text-2xl font-extrabold text-white pt-1 leading-snug">
            🔒 Tài khoản của bạn đang tạm khóa. Vui lòng liên hệ Quản trị viên
            để mở lại.
          </h1>

          {user && (
            <p className="text-xs text-slate-400">
              Tài khoản đang đăng nhập:{" "}
              <strong className="text-rose-300">{user.full_name}</strong> (
              {user.email})
            </p>
          )}
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed text-left">
          💡 <strong>Mẹo kiểm thử nhanh:</strong> Bạn có thể bấm nút bên dưới để
          chuyển sang tài khoản <strong>🛡️ Quản trị viên (Admin)</strong> tại{" "}
          <code>/admin</code> để mở khóa tài khoản này, hoặc đổi sang tài khoản{" "}
          <strong>🔥 Học viên chăm chỉ</strong> để tiếp tục luyện tập.
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <Link
            href="/login"
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Đổi tài khoản (/login)</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
