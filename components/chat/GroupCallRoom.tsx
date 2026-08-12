"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "https://boardsync-signaling.onrender.com";

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

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // peerId (socket id) → RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // peerId → pending ICE candidates (before remote description is set)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const roomName = `group-call-${groupId}`;

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

      // List of existing participants when we first join
      socket.on(
        "current-participants",
        async ({ participants: existingIds }: { participants: string[] }) => {
          for (const remoteId of existingIds) {
            setParticipants((prev) =>
              prev.some((p) => p.socketId === remoteId)
                ? prev
                : [...prev, { socketId: remoteId, name: remoteId, stream: null }]
            );
            const pc = createPc(remoteId, stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", {
              to: remoteId,
              from: socket.id,
              description: pc.localDescription,
            });
          }
        }
      );

      // A new participant sent us an offer
      socket.on("offer", async ({ from, description, user }: any) => {
        setParticipants((prev) =>
          prev.some((p) => p.socketId === from)
            ? prev
            : [...prev, { socketId: from, name: user?.name ?? from, stream: null }]
        );
        const pc = createPc(from, stream);
        await pc.setRemoteDescription(description);
        flushPending(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          to: from,
          from: socket.id,
          description: pc.localDescription,
        });
      });

      // Received an answer to our offer
      socket.on("answer", async ({ from, description }: any) => {
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
        const pc = pcsRef.current.get(socketId);
        if (pc) { pc.close(); pcsRef.current.delete(socketId); }
        setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      });
    }

    start();

    return () => {
      // Cleanup on unmount
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 flex items-center justify-between bg-black/70 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Users size={16} />
          </div>
          <div>
            <h4 className="text-sm font-600 text-white">{groupName}</h4>
            <p className="text-[10px] text-white/50 uppercase">
              {callType} Call · {allParticipants} participant{allParticipants !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {!connected && (
          <span className="text-xs text-amber-400 animate-pulse">Connecting…</span>
        )}
      </div>

      {/* Video grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div
          className={cn(
            "h-full grid gap-3",
            allParticipants === 1 && "grid-cols-1",
            allParticipants === 2 && "grid-cols-2",
            allParticipants <= 4 && allParticipants > 2 && "grid-cols-2",
            allParticipants > 4 && "grid-cols-3"
          )}
        >
          {/* Self tile */}
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08]">
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
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-700 text-white">
                      {getInitials(currentUser.name)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-2xl font-700 text-white">
                  {getInitials(currentUser.name)}
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
              <span className="text-xs font-600 text-white bg-black/60 px-2 py-0.5 rounded-full">
                You
              </span>
              {isMuted && (
                <span className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                  <MicOff size={10} className="text-white" />
                </span>
              )}
            </div>
          </div>

          {/* Remote participant tiles */}
          {participants.map((p) => (
            <RemoteTile key={p.socketId} participant={p} callType={callType} />
          ))}
        </div>
      </div>

      {/* Controls bar */}
      <div className="shrink-0 py-5 px-6 bg-black/70 backdrop-blur-md flex items-center justify-center gap-5 border-t border-white/[0.06]">
        <button
          onClick={toggleMute}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all",
            isMuted
              ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "bg-white/[0.08] border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.15]"
          )}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleCamera}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all",
              isCameraOff
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-white/[0.08] border-white/[0.12] text-white/80 hover:text-white hover:bg-white/[0.15]"
            )}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 transition-all"
          title="Leave Call"
        >
          <PhoneOff size={24} />
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
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08]">
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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/30 flex items-center justify-center text-2xl font-700 text-white animate-pulse">
            {getInitials(participant.name)}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-3">
        <span className="text-xs font-600 text-white bg-black/60 px-2 py-0.5 rounded-full">
          {participant.name}
        </span>
      </div>
    </div>
  );
}
