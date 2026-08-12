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
        className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-600 text-sm text-white bg-indigo-500 hover:bg-indigo-400 shadow-lg shadow-indigo-500/30 transition-all"
      >
        <Sparkles size={18} /> Generate Minutes
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
