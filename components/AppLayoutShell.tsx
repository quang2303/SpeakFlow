"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import TopHeaderBar from "./TopHeaderBar";

export default function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("speakflow_sidebar_collapsed");
      if (saved === "true") setIsSidebarCollapsed(true);
    } catch {
      // ignore
    }

    const handleToggle = (e: Event) => {
      const custom = e as CustomEvent<{ collapsed?: boolean }>;
      setIsSidebarCollapsed(Boolean(custom.detail?.collapsed));
    };

    window.addEventListener("speakflow-sidebar-toggle", handleToggle);
    return () => window.removeEventListener("speakflow-sidebar-toggle", handleToggle);
  }, []);

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
      <main
        className={`flex-1 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64 lg:pl-72"
        } pb-24 md:pb-10 min-w-0 bg-[#FAFCFB]/60 transition-all duration-200`}
      >
        <TopHeaderBar />
        <div className="max-w-5xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
