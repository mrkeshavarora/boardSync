"use client";

import AppShell from "@/components/layout/AppShell";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare, Phone, Video, Send, Mic, MicOff, VideoOff,
  Video as VideoIcon, X, Search, Loader2, UserCheck, Shield, PhoneOff,
  PhoneCall, Check, PhoneForwarded
} from "lucide-react";
import io from "socket.io-client";
import { cn, getInitials } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  status: string;
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "https://boardsync-signaling.onrender.com";

const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function ChatPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Call States
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false); // Waiting for answer
  const [callType, setCallType] = useState<"voice" | "video">("video");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<{
    fromUser: Contact;
    type: "voice" | "video";
    roomName: string;
  } | null>(null);

  const socketRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch accepted connections
  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/connections?status=Accepted");
        if (res.ok) {
          const data = await res.json();
          setContacts(data.connections || []);
        }
      } catch (e) {
        console.error("Failed to load contacts", e);
      } finally {
        setLoadingContacts(false);
      }
    }
    if (session?.user) {
      fetchContacts();
    }
  }, [session]);

  // Generate unique room name based on sorted User IDs
  const callRoomName = useMemo(() => {
    if (!session?.user?.id || !selectedContact) return "";
    const ids = [session.user.id, selectedContact.id].sort();
    return `chat-call-${ids[0]}-${ids[1]}`;
  }, [session, selectedContact]);

  // Poll conversation history & handle call signaling handshakes
  useEffect(() => {
    let interval: any;
    async function fetchMessages() {
      if (!selectedContact) return;
      try {
        const res = await fetch(`/api/chat/${selectedContact.id}`);
        if (!res.ok) return;
        const data = await res.json();
        const list: Message[] = data.messages || [];
        setMessages(list);

        // Check for incoming call invite
        const latestMsg = list[list.length - 1];
        if (latestMsg) {
          const isFromOther = latestMsg.senderId === selectedContact.id;
          const isRecent = new Date().getTime() - new Date(latestMsg.createdAt).getTime() < 15000; // within 15 seconds

          if (isFromOther && isRecent) {
            // Case 1: Incoming call invite
            if (latestMsg.message.startsWith("[CALL_INVITE]:") && !isInCall && !incomingCall) {
              const parts = latestMsg.message.split(":");
              const type = parts[1] as "voice" | "video";
              const roomName = parts[2];
              setIncomingCall({
                fromUser: selectedContact,
                type,
                roomName,
              });
            }

            // Case 2: Outgoing call declined by remote user
            if (latestMsg.message.startsWith("[CALL_DECLINED]:") && isInCall) {
              endCall();
              alert("Call was declined by " + selectedContact.name);
            }

            // Case 3: Ongoing call ended by remote user
            if (latestMsg.message.startsWith("[CALL_ENDED]:") && isInCall) {
              endCall();
            }
          }
        }
      } catch (e) {
        console.error("Failed to load messages", e);
      }
    }

    if (selectedContact) {
      setLoadingMessages(true);
      fetchMessages().then(() => setLoadingMessages(false));
      interval = setInterval(fetchMessages, 2000); // Short-poll every 2s
    } else {
      setMessages([]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedContact, isInCall, incomingCall]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Send Text Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !session?.user?.id) return;

    const text = newMessage;
    setNewMessage("");

    // Optimistic update
    const tempId = Math.random().toString();
    const tempMsg: Message = {
      _id: tempId,
      senderId: session.user.id,
      receiverId: selectedContact.id,
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          message: text,
        }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        alert("Message failed to send");
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  }

  // WebRTC Signal & Connection Methods
  async function startCall(type: "voice" | "video") {
    if (!selectedContact || !session?.user?.id) return;
    setCallType(type);
    setIsInCall(true);
    setIsCalling(true);
    setIsMuted(false);
    setIsCameraOff(type === "voice");

    try {
      // Send invitation message in DB
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          message: `[CALL_INVITE]:${type}:${callRoomName}`,
        }),
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      connectToSignalingRoom(callRoomName, stream);
    } catch (e) {
      console.error("Failed to start media streams", e);
      alert("Microphone or camera permission denied.");
      endCall();
    }
  }

  async function acceptCall() {
    if (!incomingCall || !session?.user?.id) return;
    const call = incomingCall;
    setIncomingCall(null);
    setCallType(call.type);
    setIsInCall(true);
    setIsCalling(false);
    setIsMuted(false);
    setIsCameraOff(call.type === "voice");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === "video",
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      connectToSignalingRoom(call.roomName, stream);
    } catch (e) {
      console.error("Failed to accept call", e);
      alert("Failed to access camera/microphone.");
      endCall();
    }
  }

  async function declineCall() {
    if (!incomingCall || !selectedContact) return;
    const call = incomingCall;
    setIncomingCall(null);

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedContact.id,
          message: `[CALL_DECLINED]:${call.roomName}`,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  function connectToSignalingRoom(room: string, stream: MediaStream) {
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    const pc = new RTCPeerConnection(pcConfig);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && selectedContact) {
        socket.emit("ice-candidate", {
          to: selectedContact.id,
          from: socket.id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsCalling(false); // Remote user has joined
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    socket.on("connect", () => {
      socket.emit("join-room", {
        meetingId: room,
        user: { name: session?.user?.name || "User", id: session?.user?.id }
      });
    });

    socket.on("current-participants", async ({ participants }: { participants: string[] }) => {
      if (participants.length > 0) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", {
          to: room,
          from: socket.id,
          description: pc.localDescription,
        });
      }
    });

    socket.on("offer", async ({ from, description }: any) => {
      await pc.setRemoteDescription(description);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", {
        to: from,
        from: socket.id,
        description: pc.localDescription,
      });
    });

    socket.on("answer", async ({ description }: any) => {
      await pc.setRemoteDescription(description);
    });

    socket.on("ice-candidate", async ({ candidate }: any) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("ICE error", e);
      }
    });

    socket.on("user-left", () => {
      endCall();
    });
  }

  async function endCall() {
    setIsInCall(false);
    setIsCalling(false);
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Send call end signal in DB
    if (selectedContact) {
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiverId: selectedContact.id,
            message: `[CALL_ENDED]:${callRoomName}`,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  function toggleMute() {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function toggleCamera() {
    if (localStream && callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }

  // Filter contacts by query
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  return (
    <AppShell title="Direct Messaging">
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: "var(--bg-card)" }}>
        
        {/* Left Panel: Contacts */}
        <aside className="w-80 border-r border-white/[0.06] flex flex-col shrink-0 bg-white/[0.01]">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search connected users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingContacts ? (
              <div className="flex items-center justify-center p-8 text-white/40 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading connected users...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center p-8 text-white/30 text-xs">
                No connections found.
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                    selectedContact?.id === contact.id
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                      : "border border-transparent hover:bg-white/[0.03] text-white/70 hover:text-white"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0 relative">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(contact.name)
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#1e293b]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-600 truncate">{contact.name}</p>
                    <p className="text-xs text-white/40 truncate uppercase">{contact.role.replace(/_/g, " ")}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Panel: Chat Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-black/[0.01]">
          {selectedContact ? (
            <>
              {/* Active Header */}
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0">
                    {selectedContact.avatar ? (
                      <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(selectedContact.name)
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-600 text-white leading-tight">{selectedContact.name}</h3>
                    <p className="text-[10px] text-emerald-400 font-500 mt-0.5">Online</p>
                  </div>
                </div>

                {/* Video/Voice calling buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startCall("voice")}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                    title="Voice Call"
                  >
                    <Phone size={15} />
                  </button>
                  <button
                    onClick={() => startCall("video")}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                    title="Video Call"
                  >
                    <Video size={15} />
                  </button>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center p-8 text-white/30 text-sm gap-2">
                    <Loader2 size={15} className="animate-spin" /> Loading chat history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/25 text-center">
                    <MessageSquare size={32} className="text-white/10 mb-2" />
                    <p className="text-sm">Say hello! No messages recorded yet.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === session?.user?.id;
                    
                    // Render system call logs
                    if (msg.message.startsWith("[CALL_INVITE]:")) {
                      const type = msg.message.split(":")[1];
                      return (
                        <div key={msg._id} className="flex justify-center my-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-500 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <PhoneCall size={12} />
                            {isSelf ? `You started a ${type} call` : `Incoming ${type} call`}
                          </span>
                        </div>
                      );
                    }
                    if (msg.message.startsWith("[CALL_DECLINED]:")) {
                      return (
                        <div key={msg._id} className="flex justify-center my-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-500 bg-red-500/10 text-red-400 border border-red-500/20">
                            <PhoneOff size={12} />
                            {isSelf ? "You declined the call" : "Call declined"}
                          </span>
                        </div>
                      );
                    }
                    if (msg.message.startsWith("[CALL_ENDED]:")) {
                      return (
                        <div key={msg._id} className="flex justify-center my-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-500 bg-white/[0.04] text-white/40 border border-white/[0.06]">
                            <PhoneOff size={12} />
                            Call Ended
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          "flex max-w-[70%] flex-col space-y-1.5",
                          isSelf ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                            isSelf
                              ? "bg-indigo-500 text-white rounded-br-none"
                              : "bg-white/[0.04] border border-white/[0.06] text-white/90 rounded-bl-none"
                          )}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[9px] text-white/35">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input panel */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/[0.06] flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="btn-gradient w-11 h-11 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/30">
              <MessageSquare size={48} className="text-white/10 mb-3" />
              <h4 className="text-base font-600 text-white/70">Start a Conversation</h4>
              <p className="text-sm max-w-sm mt-1">Select a connected board colleague from the left panel to begin instant text messaging or direct audio/video calling.</p>
            </div>
          )}
        </main>
      </div>

      {/* Direct Call Dialog Modal overlay */}
      {isInCall && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-white/[0.08] rounded-3xl w-full max-w-4xl h-[75vh] flex flex-col relative overflow-hidden shadow-2xl">
            {/* Call Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white">
                  {selectedContact?.avatar ? (
                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(selectedContact?.name || "U")
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-600 text-white">{selectedContact?.name}</h4>
                  <p className="text-[10px] text-white/40 uppercase capitalize">
                    {isCalling ? `Calling (${callType})...` : `${callType} Call`}
                  </p>
                </div>
              </div>
            </div>

            {/* Video Streams Container */}
            <div className="flex-1 bg-black/40 relative flex items-center justify-center">
              {isCalling ? (
                /* Ringing/Calling dialer screen */
                <div className="flex flex-col items-center justify-center text-center animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                    <PhoneForwarded size={36} className="animate-bounce" />
                  </div>
                  <h3 className="text-lg font-600 text-white">Calling {selectedContact?.name}...</h3>
                  <p className="text-sm text-white/40 mt-1">Waiting for reply...</p>
                </div>
              ) : callType === "video" ? (
                <>
                  {/* Remote Stream Video */}
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-white/40">
                      <Loader2 size={32} className="animate-spin text-indigo-400 mb-2" />
                      <p className="text-sm">Connecting peer streams...</p>
                    </div>
                  )}

                  {/* Local Stream Video Preview (PIP) */}
                  <div className="absolute bottom-4 right-4 w-40 h-28 rounded-xl border border-white/20 overflow-hidden bg-black/50 shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                </>
              ) : (
                /* Voice call layout */
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                    <Mic size={36} />
                  </div>
                  <h3 className="text-lg font-600 text-white">{selectedContact?.name}</h3>
                  <p className="text-sm text-white/40 mt-1 font-500 text-emerald-400">Connected</p>
                  
                  {/* Invisible streams to keep audio track working */}
                  <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                  <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                </div>
              )}
            </div>

            {/* Calling control bars */}
            <div className="p-6 border-t border-white/[0.06] bg-black/20 flex items-center justify-center gap-4 z-10">
              <button
                onClick={toggleMute}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border transition-all",
                  isMuted
                    ? "bg-red-500/20 border-red-500/30 text-red-400"
                    : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white"
                )}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {callType === "video" && (
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border transition-all",
                    isCameraOff
                      ? "bg-red-500/20 border-red-500/30 text-red-400"
                      : "bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white"
                  )}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  <VideoOff size={18} />
                </button>
              )}

              <button
                onClick={endCall}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ringing/Incoming Call Dialog Pop Up */}
      {incomingCall && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a]/95 border border-white/10 rounded-2xl p-5 w-80 shadow-2xl animate-fade-in backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 animate-bounce">
              <PhoneCall size={20} />
            </div>
            <div>
              <h4 className="text-sm font-600 text-white leading-tight">{incomingCall.fromUser.name}</h4>
              <p className="text-xs text-white/40 mt-1 capitalize">Incoming {incomingCall.type} Call...</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={declineCall}
              className="flex-1 py-2.5 rounded-lg text-xs font-600 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1"
            >
              <PhoneOff size={12} /> Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 py-2.5 rounded-lg text-xs font-600 text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1"
            >
              <Check size={14} /> Accept
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
