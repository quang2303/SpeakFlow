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
      <div className="rounded-3xl bg-white border border-rose-200 p-6 md:p-8 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 mx-auto flex items-center justify-center">
          <Lock className="w-7 h-7 text-rose-500" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Tài khoản tạm khóa</span>
          </span>

          <h1 className="text-xl md:text-2xl font-bold text-slate-900 pt-1 leading-snug">
            Tài khoản của bạn đang tạm khóa. Vui lòng liên hệ Quản trị viên để mở lại.
          </h1>

          {user && (
            <p className="text-xs text-slate-500">
              Tài khoản: <strong className="text-slate-800">{user.full_name}</strong> ({user.email})
            </p>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed text-left">
          💡 Bạn có thể đổi sang tài khoản khác hoặc liên hệ quản trị viên để mở khóa quyền truy cập bài học.
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <Link
            href="/login"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs md:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Đổi tài khoản</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs md:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
