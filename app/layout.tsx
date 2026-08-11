import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "BoardSync - Board Meeting Management",
    template: "%s | BoardSync",
  },
  description:
    "A comprehensive board meeting management system for scheduling, minutes, actions, and documents.",
  keywords: ["board meetings", "minutes", "governance", "action items"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
