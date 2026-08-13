"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, MessageSquare, ChevronLeft, Loader2, Circle, Download, Sparkles
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import io from "socket.io-client";
import LiveTranscriptPanel from "@/components/meetings/LiveTranscriptPanel";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4000";

const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface MeetingInfo {
  _id: string;
  title: string;
  organizerId: { _id: string; name: string; email: string };
  status: string;
  startTime: string;
  endTime: string;
}

interface PeerStream {
  peerId: string;
  name: string;
  stream: MediaStream;
}

export default function MeetingRoomPage() {
  const { id: meetingId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [ending, setEnding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isSttListening, setIsSttListening] = useState(false);
  const [sttStatusText, setSttStatusText] = useState("Live transcription");
  const [sttStatusColor, setSttStatusColor] = useState("text-emerald-400");
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // WebRTC refs and states
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<PeerStream[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Fetch meeting info
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (res.ok) {
          const json = await res.json();
          setMeeting(json.meeting);
        }
      } catch (err) {
        console.error("Error fetching meeting:", err);
      } finally {
        setLoadingMeeting(false);
      }
    };
    fetchMeeting();
  }, [meetingId]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Speech Recognition / STT Loop using Web Speech API + Whisper Backup
  const chunkIntervalRef = useRef<any>(null);
  const activeRecordersRef = useRef<MediaRecorder[]>([]);
  const speechRecRef = useRef<any>(null);

  // 1. Web Speech API (Browser Native Real-Time STT)
  useEffect(() => {
    if (!session?.user) return;

    if (isMuted) {
      setIsSttListening(false);
      setSttStatusText("Muted");
      setSttStatusColor("text-red-400");
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch {}
      }
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("STT: Web Speech API is not supported in this browser.");
      setSttStatusText("Speech API Not Supported (Use Chrome/Edge)");
      setSttStatusColor("text-amber-400");
    } else {
      try {
        if (speechRecRef.current) {
          try { speechRecRef.current.stop(); } catch {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsSttListening(true);
          setSttStatusText("Live transcription");
          setSttStatusColor("text-emerald-400");
        };

        recognition.onresult = async (event: any) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript.trim()) {
            const partialData = {
              meetingId,
              speakerId: session.user.id,
              speakerName: session.user.name || "Participant",
              text: interimTranscript.trim(),
              timestamp: new Date().toISOString(),
              isFinal: false,
            };

            window.dispatchEvent(new CustomEvent("local-transcript", { detail: partialData }));

            if (socketRef.current) {
              socketRef.current.emit("transcript:partial", partialData);
            }
          }

          const trimmed = finalTranscript.trim();
          if (trimmed.length > 0) {
            const timestamp = new Date().toISOString();
            const segment = {
              meetingId,
              speakerId: session.user.id,
              speakerName: session.user.name || "Participant",
              text: trimmed,
              timestamp,
              isFinal: true,
            };

            window.dispatchEvent(new CustomEvent("local-transcript", { detail: segment }));

            if (socketRef.current) {
              socketRef.current.emit("transcript:final", segment);
            }

            // Save segment to MongoDB
            fetch(`/api/meetings/${meetingId}/transcript`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(segment),
            }).catch((err) => console.error("Failed to save transcript segment:", err));
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("Web Speech recognition error:", err.error);
          if (err.error === "no-speech") return;
          setSttStatusText(`Speech status: ${err.error}`);
        };

        recognition.onend = () => {
          setIsSttListening(false);
          // Restart if still active and not muted
          if (speechRecRef.current && !isMuted) {
            try { speechRecRef.current.start(); } catch {}
          }
        };

        speechRecRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Could not start Web Speech Recognition:", err);
      }
    }

    return () => {
      if (speechRecRef.current) {
        try { speechRecRef.current.abort(); } catch {}
      }
    };
  }, [isMuted, meetingId, session]);

  // 2. Secondary OpenAI Whisper Audio Chunking Recorder
  useEffect(() => {
    if (!session?.user || isMuted) return;

    const recordNextChunk = () => {
      if (!cameraStreamRef.current) return;
      const audioTrack = cameraStreamRef.current.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) return;

      const audioStream = new MediaStream([audioTrack]);
      const chunks: Blob[] = [];

      let recorderOptions: any = {};
      let extension = "webm";
      let mimeType = "audio/webm";

      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          recorderOptions = { mimeType: "audio/webm;codecs=opus" };
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          recorderOptions = { mimeType: "audio/webm" };
          mimeType = "audio/webm";
        }
      }

      try {
        const recorder = new MediaRecorder(audioStream, recorderOptions);
        activeRecordersRef.current.push(recorder);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          activeRecordersRef.current = activeRecordersRef.current.filter((r) => r !== recorder);
          if (chunks.length === 0) return;
          const blob = new Blob(chunks, { type: mimeType });

          const formData = new FormData();
          formData.append("audio", blob, `chunk.${extension}`);

          try {
            const res = await fetch(`/api/meetings/${meetingId}/transcript/chunk`, {
              method: "POST",
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              if (data.text && data.text.trim()) {
                const timestamp = new Date().toISOString();
                const segment = {
                  meetingId,
                  speakerId: session.user.id,
                  speakerName: session.user.name || "Participant",
                  text: data.text.trim(),
                  timestamp,
                  isFinal: true,
                };

                window.dispatchEvent(new CustomEvent("local-transcript", { detail: segment }));

                if (socketRef.current) {
                  socketRef.current.emit("transcript:final", segment);
                }

                await fetch(`/api/meetings/${meetingId}/transcript`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(segment),
                });
              }
            }
          } catch {}
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            try { recorder.stop(); } catch {}
          }
        }, 5000);
      } catch {}
    };

    const interval = setInterval(recordNextChunk, 6000);
    chunkIntervalRef.current = interval;

    return () => {
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      activeRecordersRef.current.forEach((r) => {
        if (r.state !== "inactive") {
          try { r.stop(); } catch {}
        }
      });
      activeRecordersRef.current = [];
    };
  }, [isMuted, meetingId, session]);

  // WebRTC & Signalling Setup
  useEffect(() => {
    if (!meeting || !session?.user) return;

    console.log("Initializing WebRTC Socket. URL:", SIGNALING_URL);
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    // Set up socket listeners first so we don't miss any messages
    socket.on("connect", () => {
      console.log("Connected to signaling server:", socket.id);
      setSocketConnected(true);
    });

    socket.on("current-participants", ({ participants }: { participants: string[] }) => {
      participants.forEach((otherId) => createOfferFor(otherId));
    });

    socket.on("user-joined", ({ socketId, user }) => {
      console.log("User joined:", socketId, user);
      if (user?.name) {
        setParticipantNames((prev) => ({ ...prev, [socketId]: user.name }));
      }
    });

    socket.on("offer", async ({ from, description, userName }: any) => {
      console.log("Received offer from:", from);
      if (userName) {
        setParticipantNames((prev) => ({ ...prev, [from]: userName }));
      }
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(description));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { to: from, from: socket.id, description: pc.localDescription });
    });

    socket.on("answer", async ({ from, description }: any) => {
      console.log("Received answer from:", from);
      const pc = pcs.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(description));
      }
    });

    socket.on("ice-candidate", ({ from, candidate }: any) => {
      const pc = pcs.current[from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.warn("Failed to add ICE candidate:", e));
      }
    });

    socket.on("user-left", ({ socketId }: any) => {
      console.log("User left:", socketId);
      cleanupPeer(socketId);
    });

    async function startMedia() {
      let localStream: MediaStream | null = null;
      
      try {
        // Try getting both Video and Audio with Echo Cancellation
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (err) {
        console.warn("Camera and Mic failed, trying microphone-only:", err);
        try {
          // Fallback to Microphone only (useful for desktops without webcams)
          localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          setIsCameraOff(true);
        } catch (audioErr) {
          console.error("Microphone failed too. Joining with no media devices:", audioErr);
          setIsCameraOff(true);
          setIsMuted(true);
        }
      }

      if (localStream) {
        cameraStreamRef.current = localStream;
        if (localVideoRef.current && localStream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = localStream;
        }

        // Attach tracks to any peer connections created while media was initializing
        Object.values(pcs.current).forEach((pc) => {
          localStream.getTracks().forEach((track) => {
            const senders = pc.getSenders();
            if (!senders.some((s) => s.track === track)) {
              pc.addTrack(track, localStream);
            }
          });
        });
      }

      // Join room once media setup is resolved
      socket.emit("join-room", { 
        meetingId, 
        user: { name: session?.user?.name || "Guest" } 
      });
    }

    startMedia();

    function createPeerConnection(peerId: string) {
      if (pcs.current[peerId]) {
        return pcs.current[peerId];
      }

      const pc = new RTCPeerConnection(pcConfig);
      pcs.current[peerId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", { to: peerId, from: socketRef.current.id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log("OnTrack: Remote stream added from peer:", peerId);
        const remoteStream = event.streams[0];
        setRemoteStreams((prev) => {
          if (prev.some((p) => p.peerId === peerId)) {
            return prev.map((p) => p.peerId === peerId ? { ...p, stream: remoteStream } : p);
          }
          return [...prev, { peerId, name: participantNames[peerId] || "Participant", stream: remoteStream }];
        });
      };

      // Add local audio/video tracks to peer connection
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          const senders = pc.getSenders();
          if (!senders.some((s) => s.track === track)) {
            pc.addTrack(track, cameraStreamRef.current!);
          }
        });
      }

      return pc;
    }

    async function createOfferFor(peerId: string) {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit("offer", { 
          to: peerId, 
          from: socketRef.current.id, 
          description: pc.localDescription,
          userName: session?.user?.name || "Guest"
        });
      }
    }

    function cleanupPeer(peerId: string) {
      if (pcs.current[peerId]) {
        pcs.current[peerId].close();
        delete pcs.current[peerId];
      }
      setRemoteStreams((prev) => prev.filter((p) => p.peerId !== peerId));
      setParticipantNames((prev) => {
        const copy = { ...prev };
        delete copy[peerId];
        return copy;
      });
    }

    return () => {
      if (socket) {
        socket.emit("leave-room", { meetingId });
        socket.disconnect();
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.keys(pcs.current).forEach(cleanupPeer);
    };
  }, [meeting, session, meetingId]);

  // Sync names as they are resolved
  useEffect(() => {
    setRemoteStreams((prev) =>
      prev.map((p) => ({
        ...p,
        name: participantNames[p.peerId] || p.name,
      }))
    );
  }, [participantNames]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const toggleMic = () => {
    if (!cameraStreamRef.current) return;
    const audioTracks = cameraStreamRef.current.getAudioTracks();
    const newMutedState = !isMuted;
    audioTracks.forEach((t) => (t.enabled = !newMutedState));
    setIsMuted(newMutedState);
  };

  const toggleCamera = () => {
    if (!cameraStreamRef.current) return;
    const videoTracks = cameraStreamRef.current.getVideoTracks();
    const newCameraState = !isCameraOff;
    videoTracks.forEach((t) => (t.enabled = !newCameraState));
    setIsCameraOff(newCameraState);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = displayStream;
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        const displayTrack = displayStream.getVideoTracks()[0];
        Object.values(pcs.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(displayTrack).catch((e) => console.warn("replaceTrack failed:", e));
          }
        });

        displayTrack.onended = () => {
          stopScreenSharingFlow();
        };
      } else {
        stopScreenSharingFlow();
      }
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenSharingFlow = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (cameraStreamRef.current) {
      const cameraTrack = cameraStreamRef.current.getVideoTracks()[0];
      Object.values(pcs.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(cameraTrack).catch((e) => console.warn("replaceTrack failed:", e));
        }
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
      }
    }
  };

  const handleEndMeeting = async () => {
    if (!confirm("Are you sure you want to end this meeting for everyone?")) return;
    setEnding(true);
    try {
      // 1. Mark meeting as completed
      await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });

      // 2. Generate AI Minutes from live transcript segments
      try {
        await fetch(`/api/meetings/${meetingId}/generate-ai-minutes`, {
          method: "POST",
        });
      } catch (aiErr) {
        console.error("AI minutes generation failed:", aiErr);
      }

      handleLeave();
    } finally {
      setEnding(false);
    }
  };

  const handleLeave = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    }
    router.push(`/meetings/${meetingId}`);
  };

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!cameraStreamRef.current) {
        alert("Microphone is not initialized.");
        return;
      }
      setRecordedChunks([]);
      try {
        const mr = new MediaRecorder(cameraStreamRef.current, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) {
            setRecordedChunks((prev) => [...prev, e.data]);
          }
        };
        mr.start(1000);
        setIsRecording(true);
      } catch (err) {
        console.error("Recording failed", err);
        alert("Recording failed to start. Browser may not support audio/webm.");
      }
    }
  };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting_recording_${meetingId}.webm`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      setRecordedChunks([]);
      alert("Recording downloaded! You can upload this file to Generate Minutes.");
    }
  }, [isRecording, recordedChunks, meetingId]);

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

  const totalParticipants = remoteStreams.length + 1;

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
            <span>{totalParticipants}</span>
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
        {/* Live Transcript Panel (Left Side) */}
        {showTranscript && (
          <LiveTranscriptPanel
            socket={socketRef.current}
            meetingId={meetingId}
            currentUser={{ id: session?.user?.id || "", name: session?.user?.name || "Participant" }}
            isListening={isSttListening}
            statusText={sttStatusText}
            statusColorClass={sttStatusColor}
          />
        )}

        {/* Streams Container */}
        <div className="flex-1 relative bg-black p-2 sm:p-4 flex items-center justify-center overflow-y-auto">
          <div className={cn(
            "grid gap-3 sm:gap-4 w-full h-full max-h-[80vh] items-center justify-center",
            totalParticipants === 1 ? "grid-cols-1 max-w-4xl" : "grid-cols-1 md:grid-cols-2 max-w-6xl"
          )}>
            {/* Local Video Card */}
            <div className="relative w-full h-full bg-[#0d1222] rounded-2xl overflow-hidden border border-white/[0.08] flex items-center justify-center aspect-video shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn("w-full h-full object-cover scale-x-[-1]", (isCameraOff) && "hidden")}
              />
              
              {/* Camera Off / Screen Share Overlay */}
              {(isCameraOff || isScreenSharing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4">
                  {isScreenSharing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400">
                        <Monitor size={36} />
                      </div>
                      <span className="text-base font-semibold">You are sharing your screen</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-white/10 text-white/60">
                        <VideoOff size={36} />
                      </div>
                      <span className="text-base font-semibold">Your Camera is Off</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Participant Name Badge */}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                {session?.user?.name || "You"} (You)
              </div>
            </div>

            {/* Remote Streams Cards */}
            {remoteStreams.map(({ peerId, name, stream }) => (
              <div 
                key={peerId}
                className="relative w-full h-full bg-[#0d1222] rounded-2xl overflow-hidden border border-white/[0.08] flex items-center justify-center aspect-video shadow-2xl animate-fade-in"
              >
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                  className="w-full h-full object-cover"
                />
                
                {/* Participant Name Badge */}
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                  {name}
                </div>
              </div>
            ))}
          </div>

          {/* Loading overlay until WebRTC is ready */}
          {!socketConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080d1a] z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
                </div>
                <p className="text-white/50 text-sm">Connecting to custom signaling server…</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div
            className="w-72 border-l border-white/[0.06] flex flex-col shrink-0 animate-fade-in absolute right-0 top-0 bottom-0 z-20 lg:relative lg:z-0 h-full shadow-2xl"
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

              {/* Show other participants */}
              {remoteStreams.map(({ peerId, name }) => (
                <div key={peerId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03]">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-700 text-indigo-300 shrink-0">
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 text-white truncate">{name}</p>
                  </div>
                </div>
              ))}
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
        className="h-20 sm:h-24 flex items-center justify-center gap-2 sm:gap-4 border-t border-white/[0.06] shrink-0 px-3 sm:px-6"
        style={{ background: "rgba(6,11,22,0.97)" }}
      >
        {/* Mic Toggle */}
        <button
          id="toggle-mic-btn"
          onClick={toggleMic}
          className={cn(
            "flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Camera Toggle */}
        <button
          id="toggle-camera-btn"
          onClick={toggleCamera}
          className={cn(
            "flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0",
            isCameraOff
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
          <span className="hidden sm:inline">{isCameraOff ? "Start Video" : "Stop Video"}</span>
        </button>

        {/* Transcript Toggle */}
        <button
          id="toggle-transcript-btn"
          onClick={() => setShowTranscript((s) => !s)}
          className={cn(
            "flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0",
            showTranscript
              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
          title={showTranscript ? "Hide Transcript" : "Show Transcript"}
        >
          <Sparkles size={18} />
          <span className="hidden sm:inline">{showTranscript ? "Hide CC" : "Show CC"}</span>
        </button>

        {/* Screen Share */}
        <button
          id="toggle-screenshare-btn"
          onClick={toggleScreenShare}
          className={cn(
            "flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0",
            isScreenSharing
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
          <span className="hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
        </button>

        {/* Record */}
        {isOrganizer && (
          <button
            onClick={toggleRecording}
            className={cn(
              "flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0",
              isRecording
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 animate-pulse"
                : "bg-white/[0.06] text-white/70 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
            )}
          >
            <Circle size={18} className={isRecording ? "text-red-400" : ""} />
            <span className="hidden sm:inline">{isRecording ? "Stop Record" : "Record"}</span>
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-8 sm:h-10 bg-white/[0.08] mx-1 shrink-0" />

        {/* Leave / End */}
        {isOrganizer ? (
          <div className="flex gap-2 shrink-0">
            <button
              id="leave-meeting-btn"
              onClick={handleLeave}
              className="flex flex-col items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-2 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-600 text-[10px] sm:text-xs transition-all border border-white/10"
            >
              <PhoneOff size={18} />
              <span className="hidden sm:inline">Leave</span>
            </button>
            <button
              id="end-meeting-btn"
              onClick={handleEndMeeting}
              disabled={ending}
              className="flex flex-col items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-2 rounded-xl sm:rounded-2xl bg-red-500 hover:bg-red-400 text-white font-600 text-[10px] sm:text-xs transition-all shadow-lg shadow-red-500/30 disabled:opacity-60"
            >
              <PhoneOff size={18} />
              <span className="hidden sm:inline">{ending ? "Ending…" : "End Meeting"}</span>
              <span className="sm:hidden">{ending ? "End…" : "End"}</span>
            </button>
          </div>
        ) : (
          <button
            id="leave-meeting-btn"
            onClick={handleLeave}
            className="flex flex-col items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-2 rounded-xl sm:rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-600 text-[10px] sm:text-xs transition-all shrink-0"
          >
            <PhoneOff size={18} />
            <span>Leave</span>
          </button>
        )}
      </div>
    </div>
  );
}


