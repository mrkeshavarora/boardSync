"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GenerateMinutesModal from "./GenerateMinutesModal";

export default function GenerateMinutesBtn({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-600 text-xs text-white transition-all"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
      >
        <Sparkles size={13} /> Generate Minutes
      </button>

      {showModal && (
        <GenerateMinutesModal
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
