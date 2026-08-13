"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, LogOut } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4000";

const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface Participant {
  socketId: string;
  name: string;
  stream: MediaStream | null;
}

interface Props {
  groupId: string;
  groupName: string;
  callType: "voice" | "video";
  currentUser: { id: string; name: string };
  onEnd: () => void;
}

export default function GroupCallRoom({
  groupId,
  groupName,
  callType,
  currentUser,
  onEnd,
}: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === "voice");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const roomName = `group-call-${groupId}`;

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }

  // ── Create a peer connection for a given remote socket ──
  function createPc(remoteId: string, stream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection(pcConfig);

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: remoteId,
          from: socketRef.current.id,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const remoteStream = e.streams[0];
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === remoteId ? { ...p, stream: remoteStream } : p
        )
      );
    };

    pcsRef.current.set(remoteId, pc);
    return pc;
  }

  function flushPending(remoteId: string) {
    const pending = pendingCandidatesRef.current.get(remoteId) ?? [];
    const pc = pcsRef.current.get(remoteId);
    if (pc) {
      pending.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
    }
    pendingCandidatesRef.current.delete(remoteId);
  }

  useEffect(() => {
    let stream: MediaStream;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        alert("Camera/microphone access denied.");
        onEnd();
        return;
      }

      const socket = io(SIGNALING_URL);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-room", {
          meetingId: roomName,
          user: { name: currentUser.name, id: currentUser.id },
        });
      });

      // User joined notification
      socket.on("user-joined", ({ socketId, user }: any) => {
        const pName = user?.name || "A member";
        setParticipants((prev) => {
          if (prev.some((p) => p.socketId === socketId)) {
            return prev.map((p) => (p.socketId === socketId ? { ...p, name: pName } : p));
          }
          return [...prev, { socketId, name: pName, stream: null }];
        });
      });

      // List of existing participants when we first join
      socket.on(
        "current-participants",
        async ({ participants: existingList }: { participants: any[] }) => {
          for (const item of existingList) {
            const remoteId = typeof item === "string" ? item : item.socketId;
            const remoteName = typeof item === "string" ? "Board Member" : item.user?.name || "Board Member";
            setParticipants((prev) =>
              prev.some((p) => p.socketId === remoteId)
                ? prev
                : [...prev, { socketId: remoteId, name: remoteName, stream: null }]
            );
            const pc = createPc(remoteId, stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", {
              to: remoteId,
              from: socket.id,
              user: { name: currentUser.name, id: currentUser.id },
              description: pc.localDescription,
            });
          }
        }
      );

      // A new participant sent us an offer
      socket.on("offer", async ({ from, description, user }: any) => {
        const peerName = user?.name || "Board Member";
        setParticipants((prev) =>
          prev.some((p) => p.socketId === from)
            ? prev.map((p) => (p.socketId === from ? { ...p, name: peerName } : p))
            : [...prev, { socketId: from, name: peerName, stream: null }]
        );
        const pc = createPc(from, stream);
        await pc.setRemoteDescription(description);
        flushPending(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          to: from,
          from: socket.id,
          user: { name: currentUser.name, id: currentUser.id },
          description: pc.localDescription,
        });
      });

      // Received an answer to our offer
      socket.on("answer", async ({ from, description, user }: any) => {
        if (user?.name) {
          setParticipants((prev) =>
            prev.map((p) => (p.socketId === from ? { ...p, name: user.name } : p))
          );
        }
        const pc = pcsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(description);
          flushPending(from);
        }
      });

      // ICE candidate from a peer
      socket.on("ice-candidate", async ({ from, candidate }: any) => {
        const pc = pcsRef.current.get(from);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(candidate).catch(() => {});
        } else {
          const pending = pendingCandidatesRef.current.get(from) ?? [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(from, pending);
        }
      });

      // A participant left
      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        setParticipants((prev) => {
          const leavingPeer = prev.find((p) => p.socketId === socketId);
          if (leavingPeer) {
            triggerToast(`${leavingPeer.name} left the video call`);
          }
          return prev.filter((p) => p.socketId !== socketId);
        });
        const pc = pcsRef.current.get(socketId);
        if (pc) {
          pc.close();
          pcsRef.current.delete(socketId);
        }
      });
    }

    start();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind local stream to video element when it mounts
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  function toggleMute() {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }

  function toggleCamera() {
    if (callType !== "video") return;
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((c) => !c);
  }

  const allParticipants = participants.length + 1; // +1 for self

  return (
    <div className="fixed inset-0 bg-[#070a12] z-50 flex flex-col overflow-hidden">
      {/* Participant left floating notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[99] animate-fade-in">
          <div className="bg-red-500/20 border border-red-500/40 backdrop-blur-md text-red-200 px-4 py-2 rounded-full text-xs font-600 shadow-2xl flex items-center gap-2">
            <LogOut size={14} className="text-red-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between bg-black/70 backdrop-blur-md border-b border-white/[0.06] z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-600 text-white truncate">{groupName}</h4>
            <p className="text-[10px] text-white/50 uppercase">
              {callType} Call · {allParticipants} participant{allParticipants !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!connected && (
          <span className="text-xs text-amber-400 animate-pulse font-500">Connecting…</span>
        )}
      </div>

      {/* Responsive Video Grid Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <div
          className={cn(
            "w-full mx-auto grid gap-4 sm:gap-6 items-center justify-center transition-all duration-300",
            allParticipants === 1 && "grid-cols-1 max-w-3xl",
            allParticipants === 2 && "grid-cols-1 sm:grid-cols-2 max-w-5xl",
            allParticipants === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl",
            allParticipants === 4 && "grid-cols-2 max-w-5xl",
            allParticipants > 4 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-7xl"
          )}
        >
          {/* Self video tile */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.1] shadow-2xl aspect-video w-full group">
            {callType === "video" ? (
              <>
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStream) el.srcObject = localStream;
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isCameraOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-xl font-700 text-white mb-2">
                      {getInitials(currentUser.name)}
                    </div>
                    <span className="text-xs text-white/40 font-500">Camera Paused</span>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-2xl font-700 text-white mb-2">
                  {getInitials(currentUser.name)}
                </div>
                <span className="text-xs text-white/50 font-500">Voice Connected</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="text-xs font-600 text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                You ({currentUser.name})
              </span>
              {isMuted && (
                <span className="w-6 h-6 rounded-lg bg-red-500/80 backdrop-blur-sm flex items-center justify-center">
                  <MicOff size={12} className="text-white" />
                </span>
              )}
            </div>
          </div>

          {/* Remote participant video tiles */}
          {participants.map((p) => (
            <RemoteTile key={p.socketId} participant={p} callType={callType} />
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 py-4 sm:py-5 px-4 sm:px-6 bg-black/80 backdrop-blur-md flex items-center justify-center gap-4 sm:gap-5 border-t border-white/[0.06] z-20">
        <button
          onClick={toggleMute}
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
            isMuted
              ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "bg-white/[0.08] border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.15]"
          )}
          title={isMuted ? "Unmute Mic" : "Mute Mic"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleCamera}
            className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
              isCameraOff
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-white/[0.08] border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.15]"
            )}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 transition-all shrink-0"
          title="Leave Video Call"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}

// ── Remote participant video tile ──
function RemoteTile({
  participant,
  callType,
}: {
  participant: Participant;
  callType: "voice" | "video";
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/[0.1] shadow-2xl aspect-video w-full group">
      {callType === "video" && participant.stream ? (
        <video
          ref={(el) => {
            videoRef.current = el;
            if (el && participant.stream) el.srcObject = participant.stream;
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-xl sm:text-2xl font-700 text-white mb-2 animate-pulse">
            {getInitials(participant.name)}
          </div>
          <span className="text-xs text-white/40 font-500">
            {callType === "video" ? "Connecting Video..." : "Voice Audio"}
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="text-xs font-600 text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {participant.name}
        </span>
      </div>
    </div>
  );
}
