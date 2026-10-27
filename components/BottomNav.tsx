"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpenCheck, Flame, PlusSquare } from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Trang chủ",
    icon: Home,
  },
  {
    href: "/study",
    label: "Học & Nói",
    icon: BookOpenCheck,
  },
  {
    href: "/reflex",
    label: "Phản xạ 60s",
    icon: Flame,
  },
  {
    href: "/manage",
    label: "Kho thẻ",
    icon: PlusSquare,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
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
  );
}
