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
        className="btn-gradient w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-600 text-xs text-white keep-white transition-all shadow-md cursor-pointer"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 45%, #C026D3 100%)",
          color: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(192, 38, 211, 0.35)"
        }}
      >
        <Sparkles size={14} className="text-white keep-white stroke-white" />
        <span className="text-white keep-white font-600">Generate Minutes</span>
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
