"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpenCheck,
  Flame,
  PlusSquare,
  Zap,
  Keyboard,
  Database,
} from "lucide-react";
import AuthUserTrigger from "./AuthModal";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Trang chủ",
    desc: "Tổng quan & Tiến độ",
    icon: Home,
  },
  {
    href: "/study",
    label: "Học & Nói",
    desc: "Flashcard 3D & Shadowing",
    icon: BookOpenCheck,
  },
  {
    href: "/reflex",
    label: "Phản xạ 60s",
    desc: "Thử thách nói trong 7 giây",
    icon: Flame,
  },
  {
    href: "/manage",
    label: "Kho thẻ",
    desc: "Thêm từ & Nhập JSON/CSV",
    icon: PlusSquare,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ================= DESKTOP / PC LEFT SIDEBAR (md:flex) ================= */}
      <aside className="hidden md:flex md:w-72 lg:w-80 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-slate-950/95 border-r border-slate-800/90 px-5 py-6 justify-between z-40 select-none">
        <div className="space-y-6">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-sky-400 fill-sky-400/20" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                  SpeakFlow
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  PC & Mobile
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phản xạ giao tiếp tiếng Anh
              </p>
            </div>
          </Link>

          {/* Google Account / Cloud Progress Box */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Tài khoản & Tiến trình
            </p>
            <AuthUserTrigger />
          </div>

          {/* Desktop Navigation Menu */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Menu Học Tập
            </p>
            <nav className="space-y-1.5">
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
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/10 text-white border border-sky-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30"
                          : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom PC Keyboard Shortcuts & Cloud Status */}
        <div className="space-y-3">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
              <Keyboard className="w-4 h-4" />
              <span>Phím tắt học nhanh trên PC</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span>Lật thẻ</span>
                <kbd className="text-slate-200 font-mono font-bold">Space</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span>Thu âm</span>
                <kbd className="text-slate-200 font-mono font-bold">M</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span>Nghe 1x</span>
                <kbd className="text-slate-200 font-mono font-bold">R</kbd>
              </div>
              <div className="flex items-center justify-between bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <span>Đánh giá</span>
                <kbd className="text-slate-200 font-mono font-bold">1 - 4</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <Database className="w-3.5 h-3.5" />
              Supabase Cloud Connected
            </span>
            <span>v2.0</span>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE FIXED BOTTOM NAVIGATION (< md) ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-4 gap-1">
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
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-sky-400 bg-sky-500/10 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive ? "scale-110 stroke-[2.5px]" : "stroke-[1.8px]"
                      }`}
                    />
                    {isActive && (
                      <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                    )}
                  </div>
                  <span className="text-[11px] mt-1 tracking-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
