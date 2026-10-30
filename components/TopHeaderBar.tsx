"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  LogOut,
  LogIn,
  Zap,
  Flame,
  Palette,
} from "lucide-react";
import {
  getCurrentUser,
  getStoredUserProfile,
  getStreakData,
  signOutUser,
  StreakData,
  UserProfile,
} from "@/lib/dataService";
import { UserAvatar } from "./AuthModal";

const THEME_OPTIONS = [
  { id: "emerald", label: "Xanh Mint tươi sáng", dotColor: "bg-emerald-500", ringColor: "ring-emerald-400" },
  { id: "sky", label: "Xanh Da Trời tươi", dotColor: "bg-sky-500", ringColor: "ring-sky-400" },
  { id: "coral", label: "Cam Nắng ấm áp", dotColor: "bg-orange-500", ringColor: "ring-orange-400" },
];

export default function TopHeaderBar() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("emerald");
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 1,
    lastStudyDate: null,
    todayReviewedCount: 0,
  });

  const syncState = useCallback(() => {
    setUser(getStoredUserProfile());
    setStreak(getStreakData());
  }, []);

  useEffect(() => {
    syncState();
    void getCurrentUser().then((u) => setUser(u));

    // Load saved theme
    try {
      const saved = localStorage.getItem("speakflow_color_theme");
      if (saved && ["emerald", "sky", "coral"].includes(saved)) {
        setCurrentTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.setAttribute("data-theme", "emerald");
      }
    } catch {
      // fallback
    }

    window.addEventListener("speakflow-auth-changed", syncState);
    return () => window.removeEventListener("speakflow-auth-changed", syncState);
  }, [syncState]);

  function handleSelectTheme(themeId: string) {
    setCurrentTheme(themeId);
    try {
      localStorage.setItem("speakflow_color_theme", themeId);
      document.documentElement.setAttribute("data-theme", themeId);
    } catch {
      // ignore
    }
  }

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    router.push("/login");
  }

  const displayName = user?.full_name || (user?.email ? user.email.split("@")[0] : "Học viên");

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Mobile Brand & Desktop Welcome / Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex md:hidden items-center gap-2 shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              SpeakFlow
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Tiếng Anh phản xạ</span>
            <span>•</span>
            <span className="text-slate-700">Học thông minh mỗi ngày</span>
          </div>
        </div>

        {/* Right: Theme Color Switcher + Streak + Account Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Theme Color Picker */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/90 shadow-xs"
            title="Đổi màu sắc giao diện sáng hơn"
          >
            <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1">
              {THEME_OPTIONS.map((t) => {
                const isActive = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTheme(t.id)}
                    title={t.label}
                    className={`w-4 h-4 rounded-full ${t.dotColor} transition-transform ${
                      isActive
                        ? `scale-110 ring-2 ${t.ringColor} ring-offset-1`
                        : "opacity-60 hover:opacity-100 hover:scale-105"
                    }`}
                    aria-label={`Chọn màu ${t.label}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Daily Streak Pill */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-700 text-xs font-semibold shadow-xs shrink-0"
            title={`Chuỗi học: ${streak.currentStreak} ngày liên tiếp`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>
              {streak.currentStreak}
              <span className="hidden sm:inline"> ngày</span>
            </span>
          </div>

          {/* Admin shortcut if admin */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200/60 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Quản trị</span>
            </Link>
          )}

          {/* User Account / Profile Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                title="Xem thông tin học viên & Tiến trình"
              >
                <UserAvatar
                  user={user}
                  sizeClass="w-7 h-7 rounded-lg text-xs"
                  showOnlineDot={user.status !== "locked"}
                />
                <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[120px] truncate group-hover:text-brand-600 transition-colors">
                  {displayName}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
