import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import DocumentsManager from "@/components/documents/DocumentsManager";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <AppShell title="Documents">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-white/[0.06] p-6" style={{ background: "var(--bg-card)" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(6,182,212,0.1),rgba(59,130,246,0.05))", border: "1px solid rgba(6,182,212,0.08)" }}>
                <FileText size={22} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-600 text-white mb-0">Documents</h3>
                <p className="text-sm text-white/40">Upload, preview, and download meeting documents stored in S3.</p>
              </div>
            </div>
          </div>

          <DocumentsManager />
        </div>
      </div>
    </AppShell>
  );
}
