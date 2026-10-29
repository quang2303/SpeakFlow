"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  LogOut,
  ArrowLeftRight,
  LogIn,
  Lock,
  GraduationCap,
  Zap,
} from "lucide-react";
import {
  getCurrentUser,
  getStoredUserProfile,
  signOutUser,
  UserProfile,
} from "@/lib/dataService";
import { UserAvatar } from "./AuthModal";

export default function TopHeaderBar() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  const syncUser = useCallback(() => {
    setUser(getStoredUserProfile());
  }, []);

  useEffect(() => {
    syncUser();
    void getCurrentUser().then((u) => setUser(u));
    window.addEventListener("speakflow-auth-changed", syncUser);
    return () => window.removeEventListener("speakflow-auth-changed", syncUser);
  }, [syncUser]);

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-2.5">
      <div className="max-w-md md:max-w-6xl mx-auto flex items-center justify-between gap-2.5">
        {/* Left: Mobile Brand or Desktop Active Account Role Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="flex md:hidden items-center gap-2 shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 p-[1.5px]">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              </div>
            </div>
            <span className="text-sm font-extrabold text-white">SpeakFlow</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                user={user}
                sizeClass="w-8 h-8 rounded-xl text-xs"
                showOnlineDot={user.status !== "locked"}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs md:text-sm font-extrabold text-white truncate max-w-[130px] sm:max-w-[220px]">
                    {user.full_name}
                  </span>

                  {/* Role Badge */}
                  {user.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <GraduationCap className="w-3 h-3 text-emerald-400" />
                      <span>Học viên</span>
                    </span>
                  )}

                  {/* Locked Badge if locked */}
                  {user.status === "locked" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>Đang khóa</span>
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-[11px] text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Chưa đăng nhập • Chế độ khách</span>
            </div>
          )}
        </div>

        {/* Right: Admin Button + Switch Account / Logout Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-md shadow-indigo-950/50 transition-all active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>🛡️ Quản trị (Admin)</span>
            </Link>
          )}

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-xs transition-all"
            title="Chuyển nhanh giữa các tài khoản Demo hoặc Đăng nhập"
          >
            {user ? (
              <>
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Đổi tài khoản</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập / Demo</span>
              </>
            )}
          </Link>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all"
              title="Đăng xuất tài khoản hiện tại"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
