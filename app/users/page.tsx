import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import UsersContent from "@/components/users/UsersContent";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowedRoles = ["super_admin", "admin"];
  if (!allowedRoles.includes(session.user.role ?? "")) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="User Management">
      <UsersContent />
    </AppShell>
  );
}
