import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import ReportsDashboard from "@/components/reports/ReportsDashboard";

export const metadata: Metadata = { title: "Reports & Analytics | BoardSync" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="Reports & Analytics">
      <ReportsDashboard />
    </AppShell>
  );
}
