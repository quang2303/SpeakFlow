"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  Zap,
  MessageSquare,
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
} from "lucide-react";
import {
  getCurrentUser,
  getStoredUserProfile,
  signOutUser,
  UserProfile,
} from "@/lib/dataService";
import { UserAvatar } from "./AuthModal";

export const NAV_ITEMS = [
  {
    href: "/",
    label: "Trang chủ",
    icon: Home,
  },
  {
    href: "/study",
    label: "Học & Nói",
    icon: BookOpen,
  },
  {
    href: "/reflex",
    label: "Phản xạ 60s",
    icon: Zap,
  },
  {
    href: "/roleplay",
    label: "Nhập vai",
    icon: MessageSquare,
  },
  {
    href: "/manage",
    label: "Kho thẻ",
    icon: Layers,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const syncUser = useCallback(() => {
    setUser(getStoredUserProfile());
  }, []);

  useEffect(() => {
    syncUser();
    void getCurrentUser().then((u) => setUser(u));
    const handleAuthChange = () => syncUser();
    window.addEventListener("speakflow-auth-changed", handleAuthChange);
    return () => window.removeEventListener("speakflow-auth-changed", handleAuthChange);
  }, [syncUser]);

  async function handleLogout() {
    await signOutUser();
    setUser(null);
    router.push("/login");
  }

  const displayName = user?.full_name || "Quang Đức";

  return (
    <>
      {/* ================= DESKTOP SIDEBAR (md:flex) ================= */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200/90 z-40 transition-all duration-200 select-none ${
          collapsed ? "w-20 px-3 py-5" : "w-64 lg:w-72 px-5 py-6"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo & Collapse Toggle */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <Link
              href="/"
              className={`flex items-center gap-3 group min-w-0 ${
                collapsed ? "justify-center w-full" : ""
              }`}
              title="SpeakFlow - Trang chủ"
            >
              <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-white" />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                    SpeakFlow
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Học tiếng Anh phản xạ
                  </span>
                </div>
              )}
            </Link>

            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Thu gọn thanh điều hướng"
                aria-label="Thu gọn sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expand Button when Collapsed */}
          {collapsed && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Mở rộng thanh điều hướng"
                aria-label="Mở rộng sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Navigation Menu */}
          <nav className="mt-6 space-y-1.5 flex-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-colors ${
                    collapsed ? "justify-center px-2" : ""
                  } ${
                    isActive
                      ? "bg-brand-50 text-brand-600 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-brand-600" : "text-slate-400"
                    }`}
                  />
                  {!collapsed && (
                    <span className="text-sm tracking-tight truncate">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Account Section at bottom */}
          <div className="pt-4 border-t border-slate-100">
            {user ? (
              <div
                className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-200/80 ${
                  collapsed ? "justify-center p-2" : ""
                }`}
              >
                <UserAvatar
                  user={user}
                  sizeClass="w-9 h-9 rounded-xl text-xs"
                  showOnlineDot={user.status !== "locked"}
                />

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium truncate">
                        {user.role === "admin" ? "Quản trị viên" : "Học viên"}
                      </span>
                    </div>
                  </div>
                )}

                {!collapsed && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-200/80 ${
                  collapsed ? "justify-center p-2" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  QĐ
                </div>

                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      Quang Đức
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                      <span className="text-xs text-slate-500 font-medium">
                        Học viên
                      </span>
                    </div>
                  </div>
                )}

                {!collapsed && (
                  <Link
                    href="/login"
                    className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Đăng nhập tài khoản"
                  >
                    <LogIn className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ================= MOBILE BOTTOM NAVIGATION (< md) ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-sm">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors ${
                  isActive
                    ? "text-brand-600 font-semibold bg-brand-50/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                <span className="text-[11px] mt-1 tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
