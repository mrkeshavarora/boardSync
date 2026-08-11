import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="Dashboard">
      <DashboardContent user={session.user} />
    </AppShell>
  );
}
