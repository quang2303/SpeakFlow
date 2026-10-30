"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import TopHeaderBar from "./TopHeaderBar";

export default function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex flex-col">
        <TopHeaderBar />
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col md:flex-row">
      <BottomNav />
      <main className="flex-1 md:pl-64 lg:pl-72 pb-24 md:pb-10 min-w-0 bg-[#FAFCFB]/60">
        <TopHeaderBar />
        <div className="max-w-5xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
