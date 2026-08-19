import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SettingsPanel from "@/components/settings/SettingsPanel";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const metadata: Metadata = { title: "Settings | BoardSync" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  await connectDB();
  const dbUser = await User.findOne({ email: session.user.email }).lean();

  if (!dbUser) redirect("/login");

  return (
    <AppShell title="Settings">
      <SettingsPanel user={{
        name: dbUser.name,
        email: dbUser.email,
        title: dbUser.title,
        department: dbUser.department,
        bio: dbUser.bio,
        avatar: dbUser.avatar,
        role: dbUser.role || session.user.role,
      }} />
    </AppShell>
  );
}
