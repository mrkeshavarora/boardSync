"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, MessageSquare, ChevronLeft, Loader2, Circle, Download, Sparkles,
  PictureInPicture2, UserX, VolumeX
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import io from "socket.io-client";
import LiveTranscriptPanel from "@/components/meetings/LiveTranscriptPanel";
import GenerateMinutesModal from "@/components/minutes/GenerateMinutesModal";

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
  const [showGenerateMinutesModal, setShowGenerateMinutesModal] = useState(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState<Record<string, boolean>>({});

  // WebRTC refs and states
  const socketRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  const pendingRemoteIceCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const [remoteStreams, setRemoteStreams] = useState<PeerStream[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Picture-in-Picture Toggle
  const togglePiP = async (videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    try {
      if (document.pictureInPictureElement === videoEl) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoEl.requestPictureInPicture();
      } else {
        alert("Picture-in-Picture is not supported in this browser.");
      }
    } catch (err) {
      console.error("Picture-in-Picture error:", err);
    }
  };

  // Host Controls
  const sendHostControl = (action: "mute-mic" | "mute-camera" | "kick", targetPeerId: string = "*") => {
    if (socketRef.current) {
      socketRef.current.emit("host-control", {
        meetingId,
        targetPeerId,
        action,
      });
    }

    fetch("/api/chat/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        room: `meeting-${meetingId}`,
        to: "*",
        data: {
          type: "host-control",
          payload: { action, targetPeerId },
        },
      }),
    }).catch(() => { });
  };

  const handleMuteAll = () => {
    if (!confirm("Mute microphones for all participants?")) return;
    sendHostControl("mute-mic", "*");
  };

  const handleMuteUserMic = (peerId: string) => {
    sendHostControl("mute-mic", peerId);
  };

  const handleMuteUserCamera = (peerId: string) => {
    sendHostControl("mute-camera", peerId);
  };

  const handleKickUser = (peerId: string) => {
    const peerName = participantNames[peerId] || "Participant";
    if (!confirm(`Are you sure you want to remove ${peerName} from the meeting?`)) return;
    sendHostControl("kick", peerId);
  };

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

  // Speech Recognition / STT Loop using Web Speech API
  // Single stable instance with robust lifecycle management
  const chunkIntervalRef = useRef<any>(null);
  const activeRecordersRef = useRef<MediaRecorder[]>([]);
  const speechRecRef = useRef<any>(null);
  const isMutedRef = useRef(isMuted);
  const isRecognizingRef = useRef(false);
  const isExplicitlyStoppedRef = useRef(isMuted);
  const isDestroyedRef = useRef(false);
  const restartTimerRef = useRef<any>(null);

  // Keep isMutedRef in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // 1. Web Speech API — initialised ONCE per meeting session
  useEffect(() => {
    if (!session?.user) return;

    isDestroyedRef.current = false;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("STT: Web Speech API is not supported in this browser.");
      setSttStatusText("Speech API Not Supported (Use Chrome/Edge)");
      setSttStatusColor("text-amber-400");
      return;
    }

    // Abort and clean up any previous instance
    if (speechRecRef.current) {
      try { speechRecRef.current.abort(); } catch { }
      speechRecRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    const safeStart = () => {
      if (isDestroyedRef.current || isMutedRef.current || isExplicitlyStoppedRef.current) return;
      if (!speechRecRef.current || isRecognizingRef.current) return;

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      try {
        speechRecRef.current.start();
      } catch (err: any) {
        // If Chrome throws InvalidStateError, safely schedule retry
        if (err?.name === "InvalidStateError" || err?.message?.includes("already started")) {
          if (!restartTimerRef.current && !isMutedRef.current && !isDestroyedRef.current) {
            restartTimerRef.current = setTimeout(() => {
              restartTimerRef.current = null;
              safeStart();
            }, 200);
          }
        }
      }
    };

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setIsSttListening(true);
      setSttStatusText("Live transcription");
      setSttStatusColor("text-emerald-400");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // ── Interim: show word-by-word as user speaks ──
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
        if (socketRef.current?.connected) {
          socketRef.current.emit("transcript:partial", partialData);
        }
      }

      // ── Final: commit confirmed sentence ──
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
        if (socketRef.current?.connected) {
          socketRef.current.emit("transcript:final", segment);
        }
        // Save to DB in the background (non-blocking)
        fetch(`/api/meetings/${meetingId}/transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(segment),
        }).catch(() => { });
      }
    };

    recognition.onerror = (err: any) => {
      const errorType = err?.error;
      // "no-speech" is normal pause/silence — do not display error
      if (errorType === "no-speech" || errorType === "aborted") return;
      if (errorType === "not-allowed" || errorType === "service-not-allowed") {
        console.warn("Speech recognition permission denied:", errorType);
        isExplicitlyStoppedRef.current = true;
        setSttStatusText("Mic Permission Blocked");
        setSttStatusColor("text-red-400");
        return;
      }
      console.warn("Web Speech recognition error:", errorType);
      setSttStatusText(`Speech: ${errorType}`);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setIsSttListening(false);
      // Restart safely when browser engine finishes pausing/cycle
      if (!isMutedRef.current && !isExplicitlyStoppedRef.current && !isDestroyedRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          safeStart();
        }, 150);
      }
    };

    speechRecRef.current = recognition;

    if (!isMutedRef.current) {
      safeStart();
    }

    return () => {
      isDestroyedRef.current = true;
      isExplicitlyStoppedRef.current = true;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (speechRecRef.current) {
        try { speechRecRef.current.abort(); } catch { }
        speechRecRef.current = null;
      }
    };
  }, [meetingId, session]);

  // 2. Handle mute/unmute transitions safely without destroying instance
  useEffect(() => {
    if (!speechRecRef.current) return;
    if (isMuted) {
      isExplicitlyStoppedRef.current = true;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (isRecognizingRef.current) {
        try { speechRecRef.current.stop(); } catch { }
      }
      setIsSttListening(false);
      setSttStatusText("Muted");
      setSttStatusColor("text-red-400");
    } else {
      isExplicitlyStoppedRef.current = false;
      setSttStatusText("Live transcription");
      setSttStatusColor("text-emerald-400");
      if (!isRecognizingRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (speechRecRef.current && !isRecognizingRef.current && !isMutedRef.current) {
            try { speechRecRef.current.start(); } catch { }
          }
        }, 100);
      }
    }
  }, [isMuted]);

  // 3. Whisper chunk recorder — only used as a FALLBACK when Web Speech API
  //    is NOT available (Firefox, some mobile browsers).
  //    When Web Speech API is running, skip to avoid 6–11 second delayed duplicates.
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Web Speech API available → Whisper fallback not needed
    if (SpeechRecognition) return;
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
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          activeRecordersRef.current = activeRecordersRef.current.filter((r) => r !== recorder);
          if (chunks.length === 0) return;
          const blob = new Blob(chunks, { type: mimeType });
          const formData = new FormData();
          formData.append("audio", blob, `chunk.${extension}`);
          try {
            const res = await fetch(`/api/meetings/${meetingId}/transcript/chunk`, {
              method: "POST", body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text?.trim()) {
                const segment = {
                  meetingId,
                  speakerId: session.user.id,
                  speakerName: session.user.name || "Participant",
                  text: data.text.trim(),
                  timestamp: new Date().toISOString(),
                  isFinal: true,
                };
                window.dispatchEvent(new CustomEvent("local-transcript", { detail: segment }));
                if (socketRef.current?.connected) {
                  socketRef.current.emit("transcript:final", segment);
                }
                await fetch(`/api/meetings/${meetingId}/transcript`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(segment),
                });
              }
            }
          } catch { }
        };
        recorder.start();
        setTimeout(() => {
          if (recorder.state !== "inactive") { try { recorder.stop(); } catch { } }
        }, 5000);
      } catch { }
    };

    const interval = setInterval(recordNextChunk, 6000);
    chunkIntervalRef.current = interval;

    return () => {
      if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
      activeRecordersRef.current.forEach((r) => {
        if (r.state !== "inactive") { try { r.stop(); } catch { } }
      });
      activeRecordersRef.current = [];
    };
  }, [isMuted, meetingId, session]);

  // Real-time local speaking detection using Web Audio API
  useEffect(() => {
    if (isMuted || !cameraStreamRef.current) {
      setIsLocalSpeaking(false);
      if (socketRef.current) {
        socketRef.current.emit("speaking", { meetingId, isSpeaking: false });
      }
      return;
    }

    const audioTracks = cameraStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      setIsLocalSpeaking(false);
      if (socketRef.current) {
        socketRef.current.emit("speaking", { meetingId, isSpeaking: false });
      }
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;

        const audioStream = new MediaStream([audioTracks[0]]);
        source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudio = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray as any);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const isSpeakingNow = avg > 14;

          setIsLocalSpeaking((prev) => {
            if (prev !== isSpeakingNow) {
              if (socketRef.current) {
                socketRef.current.emit("speaking", { meetingId, isSpeaking: isSpeakingNow });
              }
              return isSpeakingNow;
            }
            return prev;
          });

          animId = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      }
    } catch (e) {
      console.warn("Local audio analyzer error", e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      try {
        source?.disconnect();
        analyser?.disconnect();
        audioCtx?.close();
      } catch { }
    };
  }, [isMuted, cameraStreamRef.current, meetingId]);

  // Real-time remote peers speaking detection via local audio analysis
  useEffect(() => {
    if (remoteStreams.length === 0) {
      setSpeakingPeers({});
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctxs: AudioContext[] = [];
    let animId: number;
    const analyzers: { peerId: string; analyser: AnalyserNode; dataArray: any }[] = [];

    remoteStreams.forEach(({ peerId, stream }) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0 && audioTracks[0].enabled) {
        try {
          const audioCtx = new AudioContextClass();
          ctxs.push(audioCtx);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyzers.push({ peerId, analyser, dataArray });
        } catch (e) {
          console.warn("Remote audio analyzer error for peer:", peerId, e);
        }
      }
    });

    const checkRemoteAudios = () => {
      const updates: Record<string, boolean> = {};
      analyzers.forEach(({ peerId, analyser, dataArray }) => {
        analyser.getByteFrequencyData(dataArray as any);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        updates[peerId] = avg > 12;
      });

      setSpeakingPeers((prev) => {
        let changed = false;
        for (const k in updates) {
          if (prev[k] !== updates[k]) {
            changed = true;
            break;
          }
        }
        return changed ? { ...prev, ...updates } : prev;
      });

      animId = requestAnimationFrame(checkRemoteAudios);
    };

    if (analyzers.length > 0) {
      checkRemoteAudios();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      ctxs.forEach((ctx) => {
        try { ctx.close(); } catch { }
      });
    };
  }, [remoteStreams]);

  // WebRTC & Signalling Setup
  useEffect(() => {
    if (!meeting || !session?.user) return;

    console.log("Initializing WebRTC Socket. URL:", SIGNALING_URL);
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    function flushRemoteIceCandidates(peerId: string, pc: RTCPeerConnection) {
      const queue = pendingRemoteIceCandidates.current[peerId];
      if (queue && queue.length > 0 && pc.remoteDescription) {
        while (queue.length > 0) {
          const cand = queue.shift();
          if (cand) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
              console.warn("Failed to add queued ICE candidate:", e)
            );
          }
        }
      }
    }

    // Set up socket listeners first so we don't miss any messages
    socket.on("connect", () => {
      console.log("Connected to signaling server:", socket.id);
      setSocketConnected(true);
    });

    socket.on("user-speaking", ({ peerId, isSpeaking }: { peerId: string; isSpeaking: boolean }) => {
      setSpeakingPeers((prev) => ({ ...prev, [peerId]: isSpeaking }));
    });

    socket.on("host-control", ({ targetPeerId, action }: { targetPeerId: string; action: string }) => {
      const myId = socket.id;
      const isTarget = targetPeerId === "*" || targetPeerId === myId;
      if (!isTarget) return;

      if (action === "mute-mic") {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setIsMuted(true);
      } else if (action === "mute-camera") {
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
        }
        setIsCameraOff(true);
      } else if (action === "kick") {
        alert("You were removed from the meeting by the organizer.");
        handleLeave();
      }
    });

    socket.on("current-participants", ({ participants }: { participants: any[] }) => {
      participants.forEach((item) => {
        const otherId = typeof item === "string" ? item : item.socketId;
        const otherName = typeof item === "string" ? "Participant" : (item.name || "Participant");
        if (otherId) {
          setParticipantNames((prev) => ({ ...prev, [otherId]: otherName }));
          createOfferFor(otherId);
        }
      });
    });

    socket.on("user-joined", ({ socketId, user }: any) => {
      console.log("User joined:", socketId, user);
      const name = user?.name || "Participant";
      setParticipantNames((prev) => ({ ...prev, [socketId]: name }));
    });

    socket.on("offer", async ({ from, description, userName }: any) => {
      console.log("Received offer from:", from, userName);
      if (userName) {
        setParticipantNames((prev) => ({ ...prev, [from]: userName }));
      }
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        flushRemoteIceCandidates(from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          to: from,
          from: socket.id,
          description: pc.localDescription,
          userName: session?.user?.name || "Guest"
        });
      } catch (err) {
        console.error("Error answering offer:", err);
      }
    });

    socket.on("answer", async ({ from, description, userName }: any) => {
      console.log("Received answer from:", from, userName);
      if (userName) {
        setParticipantNames((prev) => ({ ...prev, [from]: userName }));
      }
      const pc = pcs.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(description));
          flushRemoteIceCandidates(from, pc);
        } catch (err) {
          console.error("Error setting remote description from answer:", err);
        }
      }
    });

    socket.on("ice-candidate", ({ from, candidate }: any) => {
      const pc = pcs.current[from];
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) =>
          console.warn("Failed to add ICE candidate:", e)
        );
      } else {
        if (!pendingRemoteIceCandidates.current[from]) {
          pendingRemoteIceCandidates.current[from] = [];
        }
        pendingRemoteIceCandidates.current[from].push(candidate);
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

      // Add local audio and active video (screen share if active, else camera) to peer connection
      if (cameraStreamRef.current) {
        const audioTrack = cameraStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          const senders = pc.getSenders();
          if (!senders.some((s) => s.track === audioTrack)) {
            pc.addTrack(audioTrack, cameraStreamRef.current);
          }
        }
      }

      const activeVideoTrack = isScreenSharing && screenStreamRef.current?.getVideoTracks()[0]
        ? screenStreamRef.current.getVideoTracks()[0]
        : cameraStreamRef.current?.getVideoTracks()[0];

      if (activeVideoTrack) {
        const senders = pc.getSenders();
        if (!senders.some((s) => s.track === activeVideoTrack)) {
          const ownerStream = isScreenSharing && screenStreamRef.current ? screenStreamRef.current : cameraStreamRef.current!;
          pc.addTrack(activeVideoTrack, ownerStream);
        }
      }

      return pc;
    }

    async function createOfferFor(peerId: string) {
      try {
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
      } catch (err) {
        console.error("Error creating offer for peer:", peerId, err);
      }
    }

    function cleanupPeer(peerId: string) {
      if (pcs.current[peerId]) {
        pcs.current[peerId].close();
        delete pcs.current[peerId];
      }
      delete pendingRemoteIceCandidates.current[peerId];
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
        <div className="flex-1 relative bg-black p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
          <div className={cn(
            "grid gap-4 w-full max-h-[85vh] overflow-y-auto items-center justify-center p-2",
            totalParticipants === 1 ? "grid-cols-1 max-w-3xl" :
              totalParticipants === 2 ? "grid-cols-1 md:grid-cols-2 max-w-5xl" :
                totalParticipants <= 4 ? "grid-cols-1 sm:grid-cols-2 max-w-5xl" :
                  "grid-cols-2 sm:grid-cols-3 max-w-6xl"
          )}>
            {/* Local Video Card */}
            <div
              className={cn(
                "relative w-full aspect-video bg-[#0d1222] rounded-2xl overflow-hidden border flex items-center justify-center shadow-2xl group transition-all duration-300",
                isLocalSpeaking
                  ? "ring-2 ring-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] border-emerald-500/50"
                  : "border-white/[0.08]"
              )}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn("w-full h-full object-contain scale-x-[-1]", (isCameraOff) && "hidden")}
              />

              {/* Picture in Picture Button */}
              <button
                onClick={() => togglePiP(localVideoRef.current)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all z-10"
                title="Picture-in-Picture"
              >
                <PictureInPicture2 size={16} />
              </button>

              {/* Camera Off / Screen Share Overlay */}
              {(isCameraOff || isScreenSharing) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1d] text-white p-4">
                  {isScreenSharing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400">
                        <Monitor size={36} />
                      </div>
                      <span className="text-base font-semibold">You are sharing your screen</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl font-700 text-indigo-300 shadow-lg">
                        {getInitials(session?.user?.name || "You")}
                      </div>
                      <span className="text-xs text-white/50 font-500 mt-1">Your Camera is Off</span>
                    </div>
                  )}
                </div>
              )}

              {/* Participant Name Badge & Speaking Indicator */}
              <div
                className={cn(
                  "absolute bottom-4 left-4 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-medium flex items-center gap-2 transition-all duration-200 z-10",
                  isLocalSpeaking
                    ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-500/20"
                    : "bg-black/60 border border-white/10 text-white"
                )}
              >
                {isLocalSpeaking && (
                  <span className="flex items-center gap-0.5" title="Speaking">
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                    <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.4s]" />
                  </span>
                )}
                <span>{session?.user?.name || "You"} (You)</span>
              </div>
            </div>

            {/* Remote Streams Cards */}
            {remoteStreams.map(({ peerId, name, stream }) => {
              const displayName = participantNames[peerId] || name || "Participant";
              const isSpeaking = !!speakingPeers[peerId];
              const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some(t => t.enabled);

              return (
                <div
                  key={peerId}
                  className={cn(
                    "relative w-full aspect-video bg-[#0d1222] rounded-2xl overflow-hidden border flex items-center justify-center shadow-2xl animate-fade-in group transition-all duration-300",
                    isSpeaking
                      ? "ring-2 ring-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] border-emerald-500/50"
                      : "border-white/[0.08]"
                  )}
                >
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) {
                        el.srcObject = stream;
                        remoteVideoRefs.current[peerId] = el;
                      }
                    }}
                    className={cn("w-full h-full object-contain", !hasVideo && "hidden")}
                  />

                  {/* Remote Camera Off Avatar Fallback */}
                  {!hasVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1d] text-white p-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-lg sm:text-xl font-700 text-indigo-300 mb-2 shadow-lg">
                        {getInitials(displayName)}
                      </div>
                      <span className="text-xs text-white/40 font-500">Camera Off</span>
                    </div>
                  )}

                  {/* Action Buttons: Mute & Picture-in-Picture */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => handleMuteUserMic(peerId)}
                      className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-red-400 hover:bg-red-500/20 transition-all"
                      title={`Mute ${displayName}'s microphone`}
                    >
                      <MicOff size={15} />
                    </button>
                    <button
                      onClick={() => togglePiP(remoteVideoRefs.current[peerId])}
                      className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all"
                      title={`Picture-in-Picture (${displayName})`}
                    >
                      <PictureInPicture2 size={16} />
                    </button>
                  </div>

                  {/* Participant Name Badge & Speaking Indicator */}
                  <div
                    className={cn(
                      "absolute bottom-4 left-4 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-medium flex items-center gap-2 transition-all duration-200 z-10",
                      isSpeaking
                        ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-500/20"
                        : "bg-black/60 border border-white/10 text-white"
                    )}
                  >
                    {isSpeaking && (
                      <span className="flex items-center gap-0.5" title="Speaking">
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.4s]" />
                      </span>
                    )}
                    <span>{displayName}</span>
                  </div>
                </div>
              );
            })}
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
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-600 text-white">Participants ({totalParticipants})</h3>
              {remoteStreams.length > 0 && (
                <button
                  onClick={handleMuteAll}
                  className="px-2.5 py-1 rounded-md text-[11px] font-600 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-1"
                  title="Mute all participants"
                >
                  <VolumeX size={12} /> Mute All
                </button>
              )}
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
                <div className="flex items-center gap-1.5">
                  {isLocalSpeaking && (
                    <span className="flex items-center gap-0.5 mr-1" title="Speaking">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.4s]" />
                    </span>
                  )}
                  {isMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-emerald-400" />}
                  {isCameraOff ? <VideoOff size={12} className="text-red-400" /> : <Video size={12} className="text-emerald-400" />}
                </div>
              </div>

              {/* Show other participants */}
              {remoteStreams.map(({ peerId, name }) => {
                const displayName = participantNames[peerId] || name || "Participant";
                return (
                  <div key={peerId} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/[0.03] group">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-700 text-indigo-300 shrink-0">
                        {getInitials(displayName)}
                      </div>
                      <p className="text-sm font-500 text-white truncate">{displayName}</p>
                      {speakingPeers[peerId] && (
                        <span className="flex items-center gap-0.5 shrink-0" title="Speaking">
                          <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                          <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
                          <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.4s]" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMuteUserMic(peerId)}
                        className="p-1.5 rounded-md bg-white/[0.05] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                        title={`Mute ${displayName}'s microphone`}
                      >
                        <MicOff size={13} />
                      </button>
                      {isOrganizer && (
                        <>
                          <button
                            onClick={() => handleMuteUserCamera(peerId)}
                            className="p-1.5 rounded-md bg-white/[0.05] hover:bg-amber-500/20 text-white/50 hover:text-amber-400 transition-colors"
                            title={`Turn off ${displayName}'s camera`}
                          >
                            <VideoOff size={13} />
                          </button>
                          <button
                            onClick={() => handleKickUser(peerId)}
                            className="p-1.5 rounded-md bg-white/[0.05] hover:bg-red-500/30 text-white/50 hover:text-red-400 transition-colors"
                            title={`Remove ${displayName} from meeting`}
                          >
                            <UserX size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
          <span>{isMuted ? "Unmute" : "Mute"}</span>
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

        {/* Generate MoM */}
        <button
          id="generate-mom-btn"
          onClick={() => setShowGenerateMinutesModal(true)}
          className="flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 rounded-xl sm:rounded-2xl transition-all font-500 text-[10px] sm:text-xs shrink-0 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30"
          title="Generate Meeting Minutes"
        >
          <Sparkles size={18} className="text-indigo-400" />
          <span className="hidden sm:inline">Generate MoM</span>
        </button>

        {showGenerateMinutesModal && (
          <GenerateMinutesModal
            meetingId={meetingId}
            meetingTitle={meeting?.title || "Live Meeting"}
            onClose={() => setShowGenerateMinutesModal(false)}
          />
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


