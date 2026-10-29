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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <TopHeaderBar />
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <BottomNav />
      <main className="flex-1 md:pl-72 lg:pl-80 pb-24 md:pb-10">
        <TopHeaderBar />
        <div className="max-w-md md:max-w-6xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
