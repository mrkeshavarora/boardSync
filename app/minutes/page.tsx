import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Minutes" };

export default async function MinutesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <AppShell title="Meeting Minutes">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-white/[0.06] p-16 flex flex-col items-center justify-center text-center"
          style={{ background: "var(--bg-card)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.1))", border: "1px solid rgba(245,158,11,0.2)" }}>
            <BookOpen size={28} className="text-amber-400" />
          </div>
          <h3 className="text-lg font-600 text-white mb-2">Meeting Minutes — Phase 3 & 4</h3>
          <p className="text-sm text-white/40 max-w-sm">AI-generated and human-reviewed minutes with approval workflows coming in Phase 3 and 4.</p>
        </div>
      </div>
    </AppShell>
  );
}
