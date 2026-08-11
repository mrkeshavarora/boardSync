import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MinutesEditor from "@/components/minutes/MinutesEditor";

export const metadata: Metadata = { title: "Meeting Minutes" };

export default async function MinutesPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell title="Meeting Minutes">
      <MinutesEditor meetingId={params.id} />
    </AppShell>
  );
}
