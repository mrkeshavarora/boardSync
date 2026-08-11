import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";

export const metadata: Metadata = { title: "Notifications | BoardSync" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="Notifications">
      <NotificationsPanel />
    </AppShell>
  );
}
