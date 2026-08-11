import LandingPage from "@/components/landing/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BoardSync — Intelligent Board Meeting Management",
  description:
    "The complete platform for modern boards. Manage meetings, minutes, resolutions, and action items in one secure place.",
};

export default function Home() {
  return <LandingPage />;
}

