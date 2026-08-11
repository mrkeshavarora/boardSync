import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";

export const metadata: Metadata = { title: "My Actions" };

export default async function ActionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="My Actions">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-white/[0.06] p-16 flex flex-col items-center justify-center text-center"
          style={{ background: "var(--bg-card)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.1))", border: "1px solid rgba(16,185,129,0.2)" }}>
            <CheckSquare size={28} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-600 text-white mb-2">Action Items — Phase 4</h3>
          <p className="text-sm text-white/40 max-w-sm">Full action management with overdue tracking, filtering, and completion workflows will be built in Phase 4.</p>
        </div>
      </div>
    </AppShell>
  );
}
