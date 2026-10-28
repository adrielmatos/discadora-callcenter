"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

const PUBLIC_ROUTES = ["/", "/login", "/download-extensao"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (isPublicRoute) {
    const isRootLanding = pathname === "/";
    return (
      <div className={`w-full ${isRootLanding ? "h-screen overflow-hidden" : "min-h-screen overflow-y-auto"} bg-[#070b14] text-slate-100`}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {children}
      </div>
    </div>
  );
}
