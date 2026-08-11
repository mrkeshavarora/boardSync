"use client";

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Mic, MicOff, Video, VideoOff, Share2 } from "lucide-react";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4000";

const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoMeeting({ meetingId, onClose }: { meetingId: string; onClose?: () => void }) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteContainerRef = useRef<HTMLDivElement | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});
  // separate refs for camera (user media) and screen (display) streams
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const s = io(SIGNALING_URL);
    setSocket(s);

    async function start() {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        s.on("connect", () => console.log("connected to signalling", s.id));

        s.on("current-participants", ({ participants }: { participants: string[] }) => {
          participants.forEach((otherId) => createOfferFor(otherId));
        });

        s.on("user-joined", ({ socketId }) => {
          // optional: could create offer here
          console.log("user-joined", socketId);
        });

        s.on("offer", async ({ from, description }: any) => {
          const pc = createPeerConnection(from);
          await pc.setRemoteDescription(description);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          s.emit("answer", { to: from, from: s.id, description: pc.localDescription });
        });

        s.on("answer", async ({ from, description }: any) => {
          const pc = pcs.current[from];
          if (!pc) return console.warn("No pc for", from);
          await pc.setRemoteDescription(description);
        });

        s.on("ice-candidate", ({ from, candidate }: any) => {
          const pc = pcs.current[from];
          if (!pc) return;
          pc.addIceCandidate(candidate).catch((e) => console.warn("ICE add failed", e));
        });

        s.on("user-left", ({ socketId }: any) => {
          if (pcs.current[socketId]) {
            pcs.current[socketId].close();
            delete pcs.current[socketId];
            const el = document.getElementById("remote-" + socketId);
            if (el) el.remove();
          }
        });

        s.emit("join-room", { meetingId, user: { name: "Guest" } });

        // initialize mute/camera state based on camera stream
        if (cameraStreamRef.current) {
          const audioEnabled = cameraStreamRef.current.getAudioTracks().some((t) => t.enabled);
          const videoEnabled = cameraStreamRef.current.getVideoTracks().some((t) => t.enabled);
          setIsMuted(!audioEnabled);
          setIsCameraOff(!videoEnabled);
        }
      } catch (err) {
        console.error("getUserMedia error", err);
      }
    }

    start();

    function createPeerConnection(peerId: string) {
      const pc = new RTCPeerConnection(pcConfig);
      pcs.current[peerId] = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          s.emit("ice-candidate", { to: peerId, from: s.id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        let remoteEl = document.getElementById("remote-" + peerId) as HTMLVideoElement | null;
        if (!remoteEl && remoteContainerRef.current) {
          remoteEl = document.createElement("video");
          remoteEl.id = "remote-" + peerId;
          remoteEl.autoplay = true;
          remoteEl.playsInline = true;
          remoteContainerRef.current.appendChild(remoteEl);
        }
        if (remoteEl) remoteEl.srcObject = event.streams[0];
      };

      // add local audio tracks from camera stream
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getAudioTracks().forEach((track) => pc.addTrack(track, cameraStreamRef.current!));
      }

      // add video track: prefer screen when sharing, otherwise camera
      const activeVideoTrack = screenStreamRef.current?.getVideoTracks()[0] || cameraStreamRef.current?.getVideoTracks()[0];
      if (activeVideoTrack) {
        // create a MediaStream with the single active video track to attach as the track's stream owner
        const tmp = new MediaStream([activeVideoTrack]);
        pc.addTrack(activeVideoTrack, tmp);
      }

      return pc;
    }

    async function createOfferFor(peerId: string) {
      const pc = createPeerConnection(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit("offer", { to: peerId, from: s.id, description: pc.localDescription });
    }

    return () => {
      mounted = false;
      if (s && s.connected) {
        s.emit("leave-room", { meetingId });
        s.disconnect();
      }
      // stop camera tracks
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      // stop screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(pcs.current).forEach((pc) => pc.close());
    };
  }, [meetingId, onClose]);

  return (
    <div className="flex gap-4 flex-col">
      <div className="flex gap-4">
        <div className="w-1/2">
          <p className="text-sm text-white/60">You</p>
          <div className="relative w-full rounded-md overflow-hidden bg-black">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-auto rounded-md bg-black" />

            {/* Overlay for camera off or screen sharing */}
            {(isCameraOff || isSharing) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4">
                {isSharing ? (
                  <div className="flex items-center gap-2">
                    <Share2 size={20} />
                    <span className="text-lg font-semibold">You are sharing</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <VideoOff size={20} />
                    <span className="text-lg font-semibold">Camera Off</span>
                  </div>
                )}
                <p className="text-sm text-white/80 mt-2">
                  {isSharing ? 'Your screen is being shown to participants' : 'Turn camera on to show video'}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="w-1/2">
          <p className="text-sm text-white/60">Remote</p>
          <div ref={remoteContainerRef} className="grid grid-cols-1 gap-2" />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={() => {
            // toggle mute
            const stream = cameraStreamRef.current;
            if (!stream) return;
            const audioTracks = stream.getAudioTracks();
            const newMuted = !isMuted;
            audioTracks.forEach((t) => (t.enabled = !newMuted));
            setIsMuted(newMuted);
          }}
          className={`px-3 py-2 rounded ${isMuted ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-white/90'} flex items-center gap-2`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          <span className="text-sm">{isMuted ? 'Muted' : 'Mic'}</span>
        </button>

        <button
          onClick={() => {
            // toggle camera
            const stream = cameraStreamRef.current;
            if (!stream) return;
            const videoTracks = stream.getVideoTracks();
            const newCameraOff = !isCameraOff;
            videoTracks.forEach((t) => (t.enabled = !newCameraOff));
            setIsCameraOff(newCameraOff);

            // if camera is turned off while screen sharing is active, keep sharing; if turned on, nothing else to do
          }}
          className={`px-3 py-2 rounded ${isCameraOff ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-white/90'} flex items-center gap-2`}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
          <span className="text-sm">{isCameraOff ? 'Camera Off' : 'Camera'}</span>
        </button>

        <button
          onClick={async () => {
            // toggle screen share
            try {
              if (!isSharing) {
                // start sharing
                const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
                screenStreamRef.current = displayStream;
                setIsSharing(true);

                // show local preview of screen
                if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;

                // replace video track on all peer connections
                const displayTrack = displayStream.getVideoTracks()[0];
                Object.values(pcs.current).forEach((pc) => {
                  const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
                  if (sender) sender.replaceTrack(displayTrack).catch((e) => console.warn('replaceTrack failed', e));
                });

                // stop sharing when the user stops (browser UI)
                displayTrack.onended = () => {
                  // restore camera
                  if (cameraStreamRef.current) {
                    const cameraTrack = cameraStreamRef.current.getVideoTracks()[0];
                    Object.values(pcs.current).forEach((pc) => {
                      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
                      if (sender) sender.replaceTrack(cameraTrack).catch((e) => console.warn('replaceTrack failed', e));
                    });
                    if (localVideoRef.current) localVideoRef.current.srcObject = cameraStreamRef.current;
                  }
                  // cleanup screen stream
                  if (screenStreamRef.current) {
                    screenStreamRef.current.getTracks().forEach((t) => t.stop());
                    screenStreamRef.current = null;
                  }
                  setIsSharing(false);
                };
              } else {
                // stop sharing explicitly
                if (screenStreamRef.current) {
                  const displayTrack = screenStreamRef.current.getVideoTracks()[0];
                  displayTrack.stop();
                  // onended handler will run and restore
                }
              }
            } catch (err) {
              console.error('getDisplayMedia failed', err);
              alert('Screen share failed or was cancelled');
            }
          }}
          className={`px-3 py-2 rounded ${isSharing ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-white/90'} flex items-center gap-2`}
          title={isSharing ? 'Stop sharing' : 'Share screen'}
        >
          <Share2 size={16} />
          <span className="text-sm">{isSharing ? 'Sharing' : 'Share'}</span>
        </button>

        <button
          onClick={() => {
            // leave
            if (socket) {
              socket.emit('leave-room', { meetingId });
              socket.disconnect();
            }
            if (onClose) onClose();
          }}
          className="px-4 py-2 rounded bg-red-600 text-white ml-4"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
