"use client";

import Link from "next/link";
import { Video, ArrowRightCircle } from "lucide-react";

interface RejoinMeetingBtnProps {
  meetingId: string;
}

export default function RejoinMeetingBtn({ meetingId }: RejoinMeetingBtnProps) {
  return (
    <Link
      id="rejoin-meeting-btn"
      href={`/meetings/${meetingId}/room`}
      className="w-full py-3 rounded-xl flex items-center justify-center gap-2.5 font-600 text-sm text-white transition-all relative overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)",
        boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
      }}
    >
      {/* animated shimmer on hover */}
      <span
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      {/* pulsing live dot */}
      <span className="relative flex items-center justify-center w-2 h-2 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-60 animate-ping" />
        <span className="relative w-2 h-2 rounded-full bg-white" />
      </span>
      <Video size={17} className="shrink-0 relative z-10" />
      <span className="relative z-10">Join Meeting</span>
      <ArrowRightCircle
        size={16}
        className="shrink-0 relative z-10 opacity-70 group-hover:translate-x-0.5 transition-transform"
      />
    </Link>
  );
}
