import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MeetingWizard from "@/components/meetings/MeetingWizard";

export const metadata: Metadata = { title: "Create Meeting" };

export default async function NewMeetingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="Create Meeting">
      <div className="max-w-4xl mx-auto">
        <MeetingWizard />
      </div>
    </AppShell>
  );
}
