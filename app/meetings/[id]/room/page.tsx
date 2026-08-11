"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, MessageSquare, MoreVertical,
  Maximize2, Settings, ChevronLeft, Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface MeetingInfo {
  _id: string;
  title: string;
  organizerId: { _id: string; name: string; email: string };
  status: string;
  startTime: string;
  endTime: string;
}

export default function MeetingRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const jitsiContainer = useRef<HTMLDivElement>(null);
  const jitsiApi = useRef<any>(null);

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [jitsiReady, setJitsiReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [ending, setEnding] = useState(false);

  // Fetch meeting info
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await fetch(`/api/meetings/${id}`);
        if (res.ok) {
          const json = await res.json();
          setMeeting(json.meeting);
        }
      } finally {
        setLoadingMeeting(false);
      }
    };
    fetchMeeting();
  }, [id]);

  // Load Jitsi Meet API script
  useEffect(() => {
    const scriptId = "jitsi-api-script";
    if (document.getElementById(scriptId)) {
      setJitsiReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setJitsiReady(true);
    document.body.appendChild(script);
  }, []);

  // Initialize Jitsi when ready + meeting loaded
  useEffect(() => {
    if (!jitsiReady || !meeting || !jitsiContainer.current || !session?.user) return;

    // Room name based on meeting id so all participants join same room
    const roomName = `boardsync-${id}`;

    const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
      roomName,
      parentNode: jitsiContainer.current,
      width: "100%",
      height: "100%",
      userInfo: {
        displayName: session.user.name ?? "Participant",
        email: session.user.email ?? "",
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        toolbarButtons: [],          // Hide Jitsi toolbar — we use our own
        prejoinPageEnabled: false,
        disableInviteFunctions: true,
        hideConferenceSubject: true,
        hideConferenceTimer: true,
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
        TOOLBAR_BUTTONS: [],
        MOBILE_APP_PROMO: false,
        DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
      },
    });

    api.addEventListener("participantJoined", () => {
      setParticipantCount(api.getNumberOfParticipants());
    });
    api.addEventListener("participantLeft", () => {
      setParticipantCount(api.getNumberOfParticipants());
    });
    api.addEventListener("audioMuteStatusChanged", (e: any) => {
      setIsMuted(e.muted);
    });
    api.addEventListener("videoMuteStatusChanged", (e: any) => {
      setIsCameraOff(e.muted);
    });
    api.addEventListener("screenSharingStatusChanged", (e: any) => {
      setIsScreenSharing(e.on);
    });

    jitsiApi.current = api;

    return () => {
      api.dispose();
    };
  }, [jitsiReady, meeting, session, id]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const toggleMic = () => jitsiApi.current?.executeCommand("toggleAudio");
  const toggleCamera = () => jitsiApi.current?.executeCommand("toggleVideo");
  const toggleScreenShare = () => jitsiApi.current?.executeCommand("toggleShareScreen");

  const handleEndMeeting = async () => {
    if (!confirm("Are you sure you want to end this meeting?")) return;
    setEnding(true);
    try {
      // Update meeting status to Completed
      await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      jitsiApi.current?.executeCommand("hangup");
      router.push(`/meetings/${id}`);
    } finally {
      setEnding(false);
    }
  };

  const handleLeave = () => {
    jitsiApi.current?.executeCommand("hangup");
    router.push(`/meetings/${id}`);
  };

  if (loadingMeeting) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#080d1a" }}>
        <div className="flex flex-col items-center gap-4 text-white/60">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p>Loading meeting room…</p>
        </div>
      </div>
    );
  }

  const isOrganizer = meeting?.organizerId?._id === session?.user?.id ||
    (meeting?.organizerId as any)?.toString() === session?.user?.id;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#060b16" }}>
      {/* Top Bar */}
      <div
        className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06] z-20 shrink-0"
        style={{ background: "rgba(6,11,22,0.95)", backdropFilter: "blur(12px)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeave}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-700 text-white leading-tight">{meeting?.title ?? "Meeting"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-500">Live</span>
              <span className="text-xs text-white/30 ml-1">{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-white/60">
            <Users size={14} />
            <span>{participantCount}</span>
          </div>
          <button
            onClick={() => setShowSidebar((s) => !s)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center border transition-all",
              showSidebar
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400"
                : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white"
            )}
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Jitsi Container */}
        <div className="flex-1 relative bg-black">
          <div ref={jitsiContainer} className="w-full h-full" />
          {/* Loading overlay until Jitsi loads */}
          {!jitsiReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080d1a]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                </div>
                <p className="text-white/50 text-sm">Connecting to meeting room…</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div
            className="w-72 border-l border-white/[0.06] flex flex-col shrink-0 animate-fade-in"
            style={{ background: "#080d1a" }}
          >
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-600 text-white">Participants</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Show current user */}
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03]">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-700 text-indigo-300 shrink-0">
                  {getInitials(session?.user?.name || "Y")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-500 text-white truncate">{session?.user?.name} (You)</p>
                </div>
                <div className="flex items-center gap-1">
                  {isMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-emerald-400" />}
                  {isCameraOff ? <VideoOff size={12} className="text-red-400" /> : <Video size={12} className="text-emerald-400" />}
                </div>
              </div>
              {participantCount > 1 && (
                <p className="text-xs text-white/30 text-center py-2">
                  +{participantCount - 1} other participant{participantCount - 1 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-white/[0.06]">
              <p className="text-xs text-white/30 text-center">
                Share meeting link for others to join
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                className="w-full mt-2 py-2 rounded-lg text-xs font-500 text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                Copy Meeting Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className="h-24 flex items-center justify-center gap-4 border-t border-white/[0.06] shrink-0 px-6"
        style={{ background: "rgba(6,11,22,0.97)" }}
      >
        {/* Mic Toggle */}
        <button
          id="toggle-mic-btn"
          onClick={toggleMic}
          className={cn(
            "flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all font-500 text-xs",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          {isMuted ? "Unmute" : "Mute"}
        </button>

        {/* Camera Toggle */}
        <button
          id="toggle-camera-btn"
          onClick={toggleCamera}
          className={cn(
            "flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all font-500 text-xs",
            isCameraOff
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
          {isCameraOff ? "Start Video" : "Stop Video"}
        </button>

        {/* Screen Share */}
        <button
          id="toggle-screenshare-btn"
          onClick={toggleScreenShare}
          className={cn(
            "flex flex-col items-center gap-1.5 px-5 py-2.5 rounded-2xl transition-all font-500 text-xs",
            isScreenSharing
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          {isScreenSharing ? "Stop Share" : "Share Screen"}
        </button>

        {/* Divider */}
        <div className="w-px h-10 bg-white/[0.08]" />

        {/* Leave / End */}
        {isOrganizer ? (
          <button
            id="end-meeting-btn"
            onClick={handleEndMeeting}
            disabled={ending}
            className="flex flex-col items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 text-white font-600 text-xs transition-all shadow-lg shadow-red-500/30 disabled:opacity-60"
          >
            <PhoneOff size={20} />
            {ending ? "Ending…" : "End Meeting"}
          </button>
        ) : (
          <button
            id="leave-meeting-btn"
            onClick={handleLeave}
            className="flex flex-col items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-600 text-xs transition-all"
          >
            <PhoneOff size={20} />
            Leave
          </button>
        )}
      </div>
    </div>
  );
}
