"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, MessageSquare, ChevronLeft, ChevronRight, Loader2, Circle, Download, Sparkles,
  PictureInPicture2, UserX, VolumeX, FileText, Send, X, Paperclip, UploadCloud, File, ExternalLink, Plus, Check
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import io from "socket.io-client";
import LiveTranscriptPanel from "@/components/meetings/LiveTranscriptPanel";
import GenerateMinutesModal from "@/components/minutes/GenerateMinutesModal";
import DocumentChat from "@/components/documents/DocumentChat";
import { isAllowedDocument } from "@/lib/documentValidation";

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
  organizerId: { _id: string; name: string; email: string } | string;
  createdBy?: { _id: string; name: string; email: string } | string;
  status: string;
  startTime: string;
  endTime: string;
}

interface PeerStream {
  peerId: string;
  name: string;
  stream: MediaStream;
}

interface ChatAttachment {
  id?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  attachment?: ChatAttachment;
}

interface MeetingDocItem {
  _id: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  storageUrl?: string;
  uploadedBy?: { _id: string; name: string; email?: string } | string;
  createdAt?: string;
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
  const [sidebarTab, setSidebarTab] = useState<"chat" | "docs" | "participants" | null>(null);
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
  const [mutedPeers, setMutedPeers] = useState<Record<string, boolean>>({});

  // Resolve whether current user is the host/organizer who conducted the meeting
  const organizerIdStr = typeof meeting?.organizerId === "object" && meeting?.organizerId !== null
    ? (meeting.organizerId as any)._id?.toString() || (meeting.organizerId as any).toString()
    : meeting?.organizerId?.toString();

  const createdByIdStr = typeof (meeting as any)?.createdBy === "object" && (meeting as any)?.createdBy !== null
    ? ((meeting as any).createdBy as any)._id?.toString() || ((meeting as any).createdBy as any).toString()
    : (meeting as any)?.createdBy?.toString();

  const isOrganizer = Boolean(
    session?.user?.id && (
      (organizerIdStr && organizerIdStr === session.user.id) ||
      (createdByIdStr && createdByIdStr === session.user.id) ||
      session.user.role === "super_admin"
    )
  );

  // Meeting Group Chat & Document Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [meetingDocs, setMeetingDocs] = useState<MeetingDocItem[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);
  const docTabFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Document Upload Handler (Available to ANY meeting participant)
  const handleUploadDocument = async (file: File) => {
    if (!file || !meetingId) return;
    if (!isAllowedDocument(file.name, file.type)) {
      alert("Only document files (PDF, Word, Excel, PowerPoint, Text, Markdown) are allowed. Images and videos are blocked.");
      return;
    }
    setIsUploadingDoc(true);
    setUploadProgressText(`Uploading ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/meetings/${meetingId}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload document");
      }

      const json = await res.json();
      const newDoc: MeetingDocItem = json.document;

      // 1. Add to local meetingDocs list
      setMeetingDocs((prev) => {
        if (prev.some((d) => d._id === newDoc._id)) return prev;
        return [newDoc, ...prev];
      });

      // 2. Broadcast document-shared socket event so all meeting peers get the document in real-time
      if (socketRef.current) {
        socketRef.current.emit("meeting-document-shared", {
          meetingId,
          document: newDoc,
        });
      }

      // 3. Create a chat message with attachment and broadcast to chat
      const newMsg: ChatMessage = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: session?.user?.id || "local",
        senderName: session?.user?.name || "Participant",
        text: `Shared a new document: ${newDoc.fileName}`,
        attachment: {
          id: newDoc._id,
          fileName: newDoc.fileName,
          fileType: newDoc.fileType || file.type || "document",
          fileSize: newDoc.fileSize || file.size,
          storageUrl: newDoc.storageUrl || "",
        },
        timestamp: new Date().toISOString(),
      };

      if (socketRef.current) {
        socketRef.current.emit("meeting-chat", {
          ...newMsg,
          meetingId,
        });
      }

      setChatMessages((prev) => [...prev, newMsg]);
    } catch (err: any) {
      console.error("Document upload error:", err);
      alert(err.message || "Failed to upload document.");
    } finally {
      setIsUploadingDoc(false);
      setUploadProgressText("");
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIconColor = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (["doc", "docx"].includes(ext)) return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (["xls", "xlsx", "csv"].includes(ext)) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (["ppt", "pptx"].includes(ext)) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "text-purple-400 bg-purple-500/10 border-purple-500/20";
    return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  };

  // WebRTC refs and states
  const socketRef = useRef<any>(null);
  const [socketInstance, setSocketInstance] = useState<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [cameraStreamReady, setCameraStreamReady] = useState(false);
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

  // Host Controls (Strictly for meeting organizer / host)
  const sendHostControl = (action: "mute-mic" | "mute-camera" | "kick", targetPeerId: string = "*") => {
    if (!isOrganizer) {
      console.warn("Unauthorized host-control action attempted by non-organizer.");
      return;
    }
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
    if (!isOrganizer) return;
    if (!confirm("Mute microphones for all participants?")) return;
    sendHostControl("mute-mic", "*");
  };

  const handleMuteUserMic = (peerId: string) => {
    if (!isOrganizer) return;
    sendHostControl("mute-mic", peerId);
  };

  const handleMuteUserCamera = (peerId: string) => {
    if (!isOrganizer) return;
    sendHostControl("mute-camera", peerId);
  };

  const handleKickUser = (peerId: string) => {
    if (!isOrganizer) return;
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

  // Fetch meeting documents for Doc Chat
  useEffect(() => {
    if (!meetingId) return;
    const fetchDocs = async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/documents`);
        if (res.ok) {
          const json = await res.json();
          setMeetingDocs(json.documents || []);
        }
      } catch (err) {
        console.error("Failed to load meeting documents:", err);
      }
    };
    fetchDocs();
  }, [meetingId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, sidebarTab]);

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
      let fullLiveInterim = "";

      // 1. Extract newly finalized phrases starting from resultIndex
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }

      // 2. Extract ALL active interim results (0 to length) for complete live word-by-word sentence
      for (let i = 0; i < event.results.length; ++i) {
        if (!event.results[i].isFinal) {
          fullLiveInterim += event.results[i][0].transcript;
        }
      }

      // ── Interim: stream instant word-by-word live preview as user speaks ──
      const liveText = fullLiveInterim.trim();
      if (liveText) {
        const partialData = {
          meetingId,
          speakerId: session.user.id,
          speakerName: session.user.name || "Participant",
          text: liveText,
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
      // Restart immediately with zero delay when browser engine completes cycle
      if (!isMutedRef.current && !isExplicitlyStoppedRef.current && !isDestroyedRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        safeStart();
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
  }, [isMuted, cameraStreamReady, meetingId]);

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
    setSocketInstance(socket);

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

    socket.on("peer-mute-changed", ({ peerId, isMuted }: { peerId: string; isMuted: boolean }) => {
      if (isMuted) {
        setSpeakingPeers((prev) => ({ ...prev, [peerId]: false }));
      }
      setMutedPeers((prev) => ({ ...prev, [peerId]: isMuted }));
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

    socket.on("meeting-chat", (data: any) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // If this chat message has a document attachment, make sure it's reflected in meetingDocs too
      if (data?.attachment) {
        setMeetingDocs((prev) => {
          if (prev.some((d) => (data.attachment.id && d._id === data.attachment.id) || d.fileName === data.attachment.fileName)) {
            return prev;
          }
          return [
            {
              _id: data.attachment.id || `doc-${Date.now()}`,
              fileName: data.attachment.fileName,
              fileType: data.attachment.fileType,
              fileSize: data.attachment.fileSize,
              storageUrl: data.attachment.storageUrl,
              uploadedBy: data.senderName,
              createdAt: data.timestamp,
            },
            ...prev,
          ];
        });
      }
    });

    socket.on("meeting-document-shared", ({ document }: any) => {
      if (document) {
        setMeetingDocs((prev) => {
          if (prev.some((d) => d._id === document._id || d.fileName === document.fileName)) {
            return prev;
          }
          return [document, ...prev];
        });
      }
    });

    socket.on("call-ended", () => {
      alert("This meeting has been ended.");
      handleLeave();
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
        // Explicitly enable microphone tracks so mic is active by default
        localStream.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
        setIsMuted(false);
        isMutedRef.current = false;
        isExplicitlyStoppedRef.current = false;

        cameraStreamRef.current = localStream;
        setCameraStreamReady(true);
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
    isMutedRef.current = newMutedState;
    setIsMuted(newMutedState);

    if (socketRef.current?.connected) {
      socketRef.current.emit("mute-status-changed", { meetingId, isMuted: newMutedState });
    }

    // Sync across active WebRTC peer connection senders
    Object.values(pcs.current).forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = !newMutedState;
        }
      });
    });
  };

  const toggleCamera = () => {
    if (!cameraStreamRef.current) return;
    const videoTracks = cameraStreamRef.current.getVideoTracks();
    const newCameraState = !isCameraOff;
    videoTracks.forEach((t) => (t.enabled = !newCameraState));
    setIsCameraOff(newCameraState);

    // Sync across active WebRTC peer connection senders
    Object.values(pcs.current).forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.track.enabled = !newCameraState;
        }
      });
    });
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
    if (!isOrganizer) {
      alert("Only the host who conducted this video call can end it for everyone.");
      return;
    }
    if (!confirm("Are you sure you want to end this meeting totally for everyone?")) return;
    setEnding(true);
    try {
      // 1. Notify all participants in real-time via socket that meeting is ended
      if (socketRef.current) {
        socketRef.current.emit("call-ended", { meetingId });
      }

      // 2. Mark meeting as completed in database via dedicated /end endpoint
      await fetch(`/api/meetings/${meetingId}/end`, {
        method: "POST",
      });

      // 3. Generate AI Minutes from live transcript segments in background
      try {
        await fetch(`/api/meetings/${meetingId}/generate-ai-minutes`, {
          method: "POST",
        });
      } catch (aiErr) {
        console.error("AI minutes generation failed:", aiErr);
      }

      handleLeave();
    } catch (err) {
      console.error("Failed to end meeting:", err);
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

  const totalParticipants = remoteStreams.length + 1;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#060b16" }}>
      {/* Top Bar */}
      <div
        className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.08] z-20 shrink-0"
        style={{ background: "rgba(6,11,22,0.97)", backdropFilter: "blur(12px)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xs sm:text-sm font-600 text-white leading-tight">{meeting?.title ?? "Meeting"}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10.5px] text-emerald-400 font-500">Live</span>
              <span className="text-[10.5px] text-white/30 ml-1">{formatTime(elapsed)}</span>
            </div>
          </div>
        </div>

        {/* Right - Group Chat & Doc Chat Options */}
        <div className="flex items-center gap-2">
          {/* Option 1: Chat with everyone in meeting */}
          <button
            onClick={() => setSidebarTab((curr) => (curr === "chat" ? null : "chat"))}
            className={cn(
              "px-3 py-1.5 rounded-xl flex items-center gap-2 border text-xs transition-all cursor-pointer",
              sidebarTab === "chat"
                ? "bg-indigo-500/25 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20 font-600"
                : "bg-white/[0.04] border-white/[0.08] text-white/75 hover:text-white hover:bg-white/[0.08]"
            )}
            title="Chat with everyone joined in the meeting"
          >
            <MessageSquare size={14} className="text-indigo-400" />
            <span className="hidden sm:inline">Meeting Chat</span>
          </button>

          {/* Option 2: Doc Chat for meeting documents */}
          <button
            onClick={() => setSidebarTab((curr) => (curr === "docs" ? null : "docs"))}
            className={cn(
              "px-3 py-1.5 rounded-xl flex items-center gap-2 border text-xs transition-all cursor-pointer",
              sidebarTab === "docs"
                ? "bg-indigo-500/25 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20 font-600"
                : "bg-white/[0.04] border-white/[0.08] text-white/75 hover:text-white hover:bg-white/[0.08]"
            )}
            title="Ask AI about meeting documents"
          >
            <FileText size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Doc Chat</span>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI
            </span>
          </button>

          {/* Participants Counter Pill */}
          <button
            onClick={() => setSidebarTab((curr) => (curr === "participants" ? null : "participants"))}
            className={cn(
              "px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border text-xs transition-all cursor-pointer",
              sidebarTab === "participants"
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white"
            )}
            title="View participants"
          >
            <Users size={13} />
            <span className="font-500">{totalParticipants}</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Live Transcript Panel (Left Side) */}
        {showTranscript ? (
          <LiveTranscriptPanel
            socket={socketInstance}
            meetingId={meetingId}
            currentUser={{ id: session?.user?.id || "", name: session?.user?.name || "Participant" }}
            isListening={isSttListening}
            statusText={sttStatusText}
            statusColorClass={sttStatusColor}
            onClose={() => setShowTranscript(false)}
          />
        ) : (
          <button
            onClick={() => setShowTranscript(true)}
            className="absolute left-3 top-3 z-30 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/90 transition-all flex items-center gap-1.5 text-xs shadow-2xl group cursor-pointer"
            title="Show Live Transcript"
          >
            <Sparkles size={13} className="text-indigo-400" />
            <span className="font-500">Live Transcript</span>
            <ChevronRight size={14} className="text-white/40 group-hover:translate-x-0.5 transition-transform" />
          </button>
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
                className="w-full h-full object-contain scale-x-[-1]"
                style={{ visibility: isCameraOff ? "hidden" : "visible" }}
              />

              {/* Local Mute Status Badge — ONLY show when local mic is OFF */}
              {isMuted && (
                <div
                  className="absolute top-3 left-3 p-2 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 shadow-lg z-10 flex items-center justify-center animate-fade-in"
                  title="Your microphone is muted"
                >
                  <MicOff size={15} />
                </div>
              )}

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
                  "absolute bottom-3 left-3 px-2.5 py-1 rounded-md backdrop-blur-md text-[11px] font-500 flex items-center gap-1.5 transition-all duration-200 z-10",
                  isLocalSpeaking
                    ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/20"
                    : "bg-black/60 border border-white/10 text-white/90"
                )}
              >
                {isLocalSpeaking && (
                  <span className="flex items-center gap-0.5" title="Speaking">
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
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
              const isPeerMuted = !!mutedPeers[peerId] || (stream && stream.getAudioTracks().length > 0 && !stream.getAudioTracks().some(t => t.enabled));
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

                  {/* Action Buttons & Mute Status Indicator */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    {/* ONLY show Mute Icon when the member's mic is OFF (muted) */}
                    {isPeerMuted && (
                      <div
                        className="p-2 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 shadow-lg flex items-center justify-center animate-fade-in"
                        title={`${displayName}'s microphone is muted`}
                      >
                        <MicOff size={15} />
                      </div>
                    )}

                    {isOrganizer && (
                      <button
                        onClick={() => handleMuteUserMic(peerId)}
                        className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                        title={`Mute ${displayName}'s microphone`}
                      >
                        <MicOff size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => togglePiP(remoteVideoRefs.current[peerId])}
                      className="p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      title={`Picture-in-Picture (${displayName})`}
                    >
                      <PictureInPicture2 size={16} />
                    </button>
                  </div>

                  {/* Participant Name Badge & Speaking Indicator */}
                  <div
                    className={cn(
                      "absolute bottom-3 left-3 px-2.5 py-1 rounded-md backdrop-blur-md text-[11px] font-500 flex items-center gap-1.5 transition-all duration-200 z-10",
                      isSpeaking
                        ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/20"
                        : "bg-black/60 border border-white/10 text-white/90"
                    )}
                  >
                    {isSpeaking && (
                      <span className="flex items-center gap-0.5" title="Speaking">
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_0.2s]" />
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

        {/* Right Sidebar */}
        {sidebarTab && (
          <div
            className="w-80 sm:w-96 border-l border-white/[0.08] flex flex-col shrink-0 animate-fade-in absolute right-0 top-0 bottom-0 z-30 lg:relative lg:z-0 h-full shadow-2xl"
            style={{ background: "#080d1a" }}
          >
            {/* Sidebar Header & Tab Navigation */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                <button
                  onClick={() => setSidebarTab("chat")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-500 transition-all flex items-center gap-1.5 cursor-pointer",
                    sidebarTab === "chat"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  <MessageSquare size={13} />
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => setSidebarTab("docs")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-500 transition-all flex items-center gap-1.5 cursor-pointer",
                    sidebarTab === "docs"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  <FileText size={13} />
                  <span>Doc Chat</span>
                </button>
                <button
                  onClick={() => setSidebarTab("participants")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-500 transition-all flex items-center gap-1.5 cursor-pointer",
                    sidebarTab === "participants"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                      : "text-white/50 hover:text-white"
                  )}
                  title="Participants"
                >
                  <Users size={13} />
                  <span>({totalParticipants})</span>
                </button>
              </div>

              <button
                onClick={() => setSidebarTab(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* TAB 1: Meeting Group Chat */}
            {sidebarTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#080d1a]">
                {/* Hidden File Input for Chat */}
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadDocument(file);
                      e.target.value = "";
                    }
                  }}
                />

                {/* Messages List */}
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                >
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <MessageSquare size={18} />
                      </div>
                      <p className="text-xs font-500 text-white/60">No messages yet</p>
                      <p className="text-[11px] text-white/30 max-w-[200px]">
                        Send a message or click the attachment icon to share documents with everyone in this meeting.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderId === session?.user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex flex-col space-y-1", isMe ? "items-end" : "items-start")}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-white/40 px-1">
                            <span className="font-500 text-white/60">{isMe ? "You" : msg.senderName}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          {msg.attachment ? (
                            <div
                              className={cn(
                                "rounded-2xl text-xs max-w-[90%] sm:max-w-[85%] break-words overflow-hidden border shadow-sm",
                                isMe
                                  ? "bg-indigo-600/30 border-indigo-500/40 text-white rounded-tr-sm"
                                  : "bg-white/[0.06] border-white/[0.1] text-white rounded-tl-sm"
                              )}
                            >
                              <div className="p-2.5 space-y-2">
                                <p className="text-[11px] text-white/80 font-500">{msg.text}</p>
                                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", getFileIconColor(msg.attachment.fileName))}>
                                    <FileText size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-600 text-xs text-white truncate" title={msg.attachment.fileName}>
                                      {msg.attachment.fileName}
                                    </p>
                                    <p className="text-[10px] text-white/40">{formatBytes(msg.attachment.fileSize)}</p>
                                  </div>
                                  <a
                                    href={msg.attachment.storageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={msg.attachment.fileName}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                                    title={`Download ${msg.attachment.fileName}`}
                                  >
                                    <Download size={13} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words",
                                isMe
                                  ? "bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20"
                                  : "bg-white/[0.06] border border-white/[0.08] text-white rounded-tl-sm"
                              )}
                            >
                              {msg.text}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Upload Progress Status Banner */}
                {isUploadingDoc && (
                  <div className="px-3.5 py-1.5 bg-indigo-500/15 border-t border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300 animate-pulse">
                    <div className="flex items-center gap-2 min-w-0">
                      <Loader2 size={13} className="animate-spin text-indigo-400 shrink-0" />
                      <span className="truncate">{uploadProgressText || "Uploading document to meeting..."}</span>
                    </div>
                  </div>
                )}

                {/* Message Input Box with Attachment Button */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInputText.trim()) return;
                    const newMsg: ChatMessage = {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      senderId: session?.user?.id || "local",
                      senderName: session?.user?.name || "Participant",
                      text: chatInputText.trim(),
                      timestamp: new Date().toISOString(),
                    };
                    if (socketRef.current) {
                      socketRef.current.emit("meeting-chat", {
                        ...newMsg,
                        meetingId,
                      });
                    }
                    setChatMessages((prev) => [...prev, newMsg]);
                    setChatInputText("");
                  }}
                  className="p-3 border-t border-white/[0.08] bg-black/30 flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-indigo-500/20 text-white/70 hover:text-indigo-300 border border-white/[0.08] hover:border-indigo-500/30 transition-all flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
                    title="Upload & share document with meeting participants"
                  >
                    {isUploadingDoc ? <Loader2 size={14} className="animate-spin text-indigo-400" /> : <Paperclip size={14} />}
                  </button>

                  <input
                    type="text"
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="Message everyone or share a doc..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
                  />

                  <button
                    type="submit"
                    disabled={!chatInputText.trim()}
                    className="p-2 rounded-xl btn-gradient text-white shadow-md disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="Send message"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Doc Chat & Meeting Documents */}
            {sidebarTab === "docs" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#080d1a]">
                {/* Hidden File Input for Doc Tab */}
                <input
                  ref={docTabFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadDocument(file);
                      e.target.value = "";
                    }
                  }}
                />

                {/* Header & Upload Button */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
                  <div>
                    <h4 className="text-xs font-600 text-white flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-400" />
                      Meeting Documents ({meetingDocs.length})
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Accessible by all participants during and after meeting
                    </p>
                  </div>

                  <button
                    onClick={() => docTabFileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-500 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    title="Upload new document to this meeting"
                  >
                    {isUploadingDoc ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-indigo-400" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Add Doc</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Documents List */}
                {meetingDocs.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {meetingDocs.map((doc) => {
                      const uploaderName =
                        typeof doc.uploadedBy === "object" && doc.uploadedBy !== null
                          ? (doc.uploadedBy as any).name
                          : typeof doc.uploadedBy === "string"
                          ? doc.uploadedBy
                          : "Participant";
                      return (
                        <div
                          key={doc._id || doc.fileName}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 text-xs", getFileIconColor(doc.fileName))}>
                              <FileText size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-500 text-white truncate" title={doc.fileName}>
                                {doc.fileName}
                              </p>
                              <p className="text-[10px] text-white/40 truncate">
                                {doc.fileSize ? formatBytes(doc.fileSize) : "Document"} • Added by {uploaderName}
                              </p>
                            </div>
                          </div>

                          {doc.storageUrl && (
                            <a
                              href={doc.storageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.fileName}
                              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors shrink-0"
                              title={`Download ${doc.fileName}`}
                            >
                              <Download size={13} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] flex flex-col items-center justify-center text-center text-white/30 space-y-1.5">
                    <UploadCloud size={20} className="text-white/20" />
                    <p className="text-xs text-white/50">No documents added yet</p>
                    <p className="text-[10.5px] text-white/30 max-w-[200px]">
                      Anyone in this meeting can click &quot;Add Doc&quot; to share a file.
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <h4 className="text-xs font-600 text-white flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} className="text-cyan-400" />
                    AI Document Assistant
                  </h4>
                  <p className="text-[11px] text-white/40 mb-3">
                    Ask AI questions about the uploaded meeting documents.
                  </p>

                  {/* Render the Reusable DocumentChat component */}
                  <DocumentChat
                    documentNames={meetingDocs.map((d) => d.fileName)}
                    meetingId={meetingId}
                    placeholder={
                      meetingDocs.length > 0
                        ? "Ask questions about this meeting's documents..."
                        : "No documents attached to this meeting..."
                    }
                    className="bg-white/[0.02] border-white/[0.08] p-4 sm:p-4 text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: Joined Participants */}
            {sidebarTab === "participants" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <h4 className="text-xs font-600 text-white/80">Joined Participants ({totalParticipants})</h4>
                  {isOrganizer && remoteStreams.length > 0 && (
                    <button
                      onClick={handleMuteAll}
                      className="px-2.5 py-1 rounded-md text-[11px] font-600 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-1"
                      title="Mute all participants"
                    >
                      <VolumeX size={12} /> Mute All
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {/* Current User */}
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03]">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-700 text-indigo-300 shrink-0">
                      {getInitials(session?.user?.name || "Y")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-500 text-white truncate">{session?.user?.name} (You)</p>
                        {isOrganizer && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
                            Host
                          </span>
                        )}
                      </div>
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

                  {/* Remote Participants */}
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

                        {isOrganizer && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleMuteUserMic(peerId)}
                              className="p-1.5 rounded-md bg-white/[0.05] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                              title={`Mute ${displayName}'s microphone`}
                            >
                              <MicOff size={13} />
                            </button>
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-white/[0.06]">
                  <p className="text-xs text-white/30 text-center">Share meeting link for others to join</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                    className="w-full mt-2 py-2 rounded-lg text-xs font-500 text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    Copy Meeting Link
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className="h-16 sm:h-20 flex items-center justify-center gap-1.5 sm:gap-3 border-t border-white/[0.08] shrink-0 px-2 sm:px-6"
        style={{ background: "rgba(6,11,22,0.97)" }}
      >
        {/* Mic Toggle */}
        <button
          id="toggle-mic-btn"
          onClick={toggleMic}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all font-500 text-[10px] sm:text-[11px] shrink-0 min-w-[56px] sm:min-w-[68px]",
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/80 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Camera Toggle */}
        <button
          id="toggle-camera-btn"
          onClick={toggleCamera}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all font-500 text-[10px] sm:text-[11px] shrink-0 min-w-[56px] sm:min-w-[68px]",
            isCameraOff
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-white/[0.06] text-white/80 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          <span className="hidden sm:inline">{isCameraOff ? "Start Video" : "Stop Video"}</span>
        </button>

        {/* Screen Share */}
        <button
          id="toggle-screenshare-btn"
          onClick={toggleScreenShare}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all font-500 text-[10px] sm:text-[11px] shrink-0 min-w-[56px] sm:min-w-[68px]",
            isScreenSharing
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-white/[0.06] text-white/80 border border-white/[0.1] hover:bg-white/[0.10] hover:text-white"
          )}
        >
          {isScreenSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
          <span className="hidden sm:inline">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 sm:h-8 bg-white/[0.08] mx-0.5 sm:mx-1 shrink-0" />

        {/* Leave & End Meeting Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="leave-meeting-btn"
            onClick={handleLeave}
            className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-500 text-[10px] sm:text-[11px] transition-all border border-white/10 cursor-pointer"
            title="Leave this meeting (just for you)"
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {isOrganizer && (
            <button
              id="end-meeting-btn"
              onClick={handleEndMeeting}
              disabled={ending}
              className="flex flex-col items-center justify-center gap-1 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-600 text-[10px] sm:text-[11px] transition-all shadow-md shadow-red-500/30 disabled:opacity-60 cursor-pointer"
              title="End meeting totally for everyone (Host Only)"
            >
              <PhoneOff size={16} />
              <span className="hidden sm:inline">{ending ? "Ending..." : "End Meeting"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
