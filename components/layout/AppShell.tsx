"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import GlobalCallToast from "@/components/layout/GlobalCallToast";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Sidebar Navigation */}
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      
      {/* Backdrop overlay for mobile sidebar */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Main Panel */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"
        } ml-0`}
      >
        <Header 
          user={session?.user ?? {}} 
          title={title} 
          setMobileOpen={setMobileOpen}
          collapsed={collapsed}
        />
        <main className="flex-1 pt-24 pb-6 px-4 sm:px-6 min-w-0">
          {children}
        </main>
      </div>
      {/* Global incoming call notification — visible on all pages */}
      <GlobalCallToast />
    </div>
  );
}
