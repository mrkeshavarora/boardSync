"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  CalendarDays, Users, List, FileText, 
  Mic, BookOpen, CheckSquare, Activity, Edit, Play
} from "lucide-react";
import TabOverview from "./tabs/TabOverview";
import TabAgenda from "./tabs/TabAgenda";
import TabParticipants from "./tabs/TabParticipants";
import TabDocuments from "./tabs/TabDocuments";
import TabMinutes from "./tabs/TabMinutes";
import TabResolutions from "./tabs/TabResolutions";
import TabActions from "./tabs/TabActions";
import dynamic from "next/dynamic";

// load VideoMeeting client component dynamically to avoid SSR issues
const VideoMeeting = dynamic(() => import("./VideoMeeting"), { ssr: false });

function JoinButton({ meetingId, initialJoined = false }: { meetingId: string; initialJoined?: boolean }) {
  const [joined, setJoined] = useState(initialJoined);

  // if initialJoined changes (e.g., prop change), update state
  React.useEffect(() => {
    setJoined(initialJoined);
  }, [initialJoined]);

  return (
    <div>
      {!joined ? (
        <button
          onClick={() => setJoined(true)}
          className="btn-gradient px-4 py-2 rounded-lg text-sm font-600 flex items-center gap-2"
        >
          <Play size={15} /> Join Meeting
        </button>
      ) : (
        <div className="w-full">
          <div className="mb-2 text-sm text-white/60">In call (demo)</div>
          <VideoMeeting meetingId={meetingId} onClose={() => setJoined(false)} />
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview", icon: CalendarDays },
  { id: "agenda", label: "Agenda", icon: List },
  { id: "participants", label: "Participants", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "minutes", label: "Minutes", icon: BookOpen },
  { id: "resolutions", label: "Resolutions", icon: CheckSquare },
  { id: "actions", label: "Actions", icon: Activity },
];

export default function MeetingWorkspace({ meetingId, autoJoin = false }: { meetingId?: string; autoJoin?: boolean }) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Workspace Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="badge bg-amber-500/20 text-amber-400 border-amber-500/30">
              Scheduled
            </span>
            <span className="text-xs font-500 text-white/40 border border-white/[0.1] px-2 py-0.5 rounded-full">
            ID: {meetingId ? `${String(meetingId).substring(0, 8)}...` : "N/A"}
            </span>
          </div>
          <h1 className="text-2xl font-700 text-white">Board Strategy Review</h1>
          <p className="text-sm text-white/50 mt-1">Aug 15, 2026 • 10:00 AM - 12:00 PM UTC</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg text-sm font-500 text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center gap-2">
            <Edit size={15} /> Edit Meeting
          </button>
          {/* Join Meeting toggles a demo video meeting UI (client + signalling). */}
          <JoinButton meetingId={meetingId ?? ''} initialJoined={autoJoin} />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-white/[0.06] mb-6">
        <div className="flex gap-1 min-w-max pb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-500 transition-all border-b-2",
                  isActive 
                    ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" 
                    : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/[0.03]"
                )}
              >
                <tab.icon size={15} className={isActive ? "text-indigo-400" : "text-white/40"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-card)] border border-white/[0.06] rounded-2xl p-6">
        {activeTab === "overview" && <TabOverview />}
        {activeTab === "agenda" && <TabAgenda />}
        {activeTab === "participants" && <TabParticipants />}
        {activeTab === "documents" && <TabDocuments />}
        {activeTab === "minutes" && <TabMinutes meetingId={meetingId ?? ''} />}
        {activeTab === "resolutions" && <TabResolutions meetingId={meetingId ?? ''} />}
        {activeTab === "actions" && <TabActions meetingId={meetingId ?? ''} /> }
      </div>
    </div>
  );
}
