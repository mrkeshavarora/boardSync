"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useSession } from "next-auth/react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[260px] transition-all duration-300">
        <Header user={session?.user ?? {}} title={title} />
        <main className="flex-1 pt-16 p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
