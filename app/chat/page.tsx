"use client";

import AppShell from "@/components/layout/AppShell";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare, Phone, Video, Send, Mic, MicOff, VideoOff,
  Video as VideoIcon, X, Search, Loader2, UserCheck, Shield, PhoneOff,
  PhoneCall, Check, PhoneForwarded, ArrowLeft, Trash2, AlertTriangle,
  UserPlus, UserX, Users, Clock, Edit2, Smile
} from "lucide-react";
import io from "socket.io-client";
import { cn, getInitials } from "@/lib/utils";
import GroupCallRoom from "@/components/chat/GroupCallRoom";
import EmojiPicker from "@/components/chat/EmojiPicker";
import { Plus } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  status: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

interface UserResult {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface ConnectionStatus {
  status: "Pending" | "Accepted";
  direction: "outgoing" | "incoming";
}

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isEdited?: boolean;
  createdAt: string;
}

interface GroupMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  members: GroupMember[];
  createdBy: GroupMember;
}

interface GroupMessage {
  _id: string;
  groupId: string;
  senderId: GroupMember;
  message: string;
  isEdited?: boolean;
  createdAt: string;
}

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:4000";

const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function ChatPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMessages, setDeletingMessages] = useState(false);

  // Edit message & Emoji states
  const [editingMessage, setEditingMessage] = useState<{ id: string; type: "direct" | "group"; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupEmojiPicker, setShowGroupEmojiPicker] = useState(false);

  // People Search / Connection Request
  const [activeTab, setActiveTab] = useState<"chats" | "people" | "groups">("chats");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleResults, setPeopleResults] = useState<UserResult[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [allConnections, setAllConnections] = useState<Record<string, ConnectionStatus>>({});
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

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

  // ── Group State ──
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [newGroupMessage, setNewGroupMessage] = useState("");
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupCall, setGroupCall] = useState<{ type: "voice" | "video" } | null>(null);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupMembers, setEditGroupMembers] = useState<string[]>([]);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const socketRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const signalPollRef = useRef<any>(null);
  const handledCallRoomRef = useRef<string | null>(null);

  // Call duration counter
  useEffect(() => {
    let t: any;
    if (isInCall && !isCalling) {
      t = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [isInCall, isCalling]);

  // Robust stream attachment to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isInCall]);

  const formatCallDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Fetch accepted connections periodically so contact list order stays updated in real-time
  useEffect(() => {
    let interval: any;
    async function fetchContacts() {
      try {
        const res = await fetch("/api/connections?status=Accepted");
        if (res.ok) {
          const data = await res.json();
          const loaded: Contact[] = data.connections || [];
          setContacts(loaded);
        }
      } catch (e) {
        console.error("Failed to load contacts", e);
      } finally {
        setLoadingContacts(false);
      }
    }

    if (session?.user) {
      fetchContacts();
      interval = setInterval(fetchContacts, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session]);

  // Handle auto-accepting 1-on-1 or group call when redirected with URL query params
  useEffect(() => {
    if (!session?.user) return;
    const acceptId = searchParams?.get("accept");
    const acceptGroupId = searchParams?.get("acceptGroup");
    const callTypeParam = searchParams?.get("type") as "voice" | "video" | null;
    const roomParam = searchParams?.get("room");
    const callerNameParam = searchParams?.get("callerName");

    if (acceptId && callTypeParam && roomParam) {
      if (handledCallRoomRef.current === roomParam) return;
      handledCallRoomRef.current = roomParam;

      const existingCaller = contacts.find((c) => c.id === acceptId);
      const caller: Contact = existingCaller || {
        id: acceptId,
        name: callerNameParam ? decodeURIComponent(callerNameParam) : "User",
        email: "",
        role: "board_member",
        avatar: null,
        status: "active",
      };

      setSelectedContact(caller);
      window.history.replaceState({}, "", "/chat");
      setTimeout(() => {
        autoAcceptCall(caller, callTypeParam, roomParam);
      }, 100);
    } else if (acceptGroupId && callTypeParam) {
      if (handledCallRoomRef.current === acceptGroupId) return;
      handledCallRoomRef.current = acceptGroupId;

      setActiveTab("groups");
      window.history.replaceState({}, "", "/chat");
      fetch("/api/groups")
        .then((r) => r.json())
        .then((data) => {
          const groupList = data.groups || [];
          const g = groupList.find((item: any) => item._id === acceptGroupId);
          if (g) {
            setSelectedGroup(g);
            setGroupCall({ type: callTypeParam });
          }
        })
        .catch((err) => console.error("Failed to load group for call:", err));
    }
  }, [searchParams, session, contacts]);

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
            // Case 1: Incoming call invite (Handled by GlobalCallToast globally)
            // We ignore it here so it doesn't trigger the old bottom popup.

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

  // Sync remote stream to video element after React renders the <video> tag
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Sync local stream to local video preview after React renders the <video> tag
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isInCall]);

  // Handle Send Text Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !session?.user?.id) return;

    const text = newMessage;
    setNewMessage("");

    // Optimistic update
    const nowIso = new Date().toISOString();
    const tempId = Math.random().toString();
    const tempMsg: Message = {
      _id: tempId,
      senderId: session.user.id,
      receiverId: selectedContact.id,
      message: text,
      createdAt: nowIso,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id
          ? { ...c, lastMessage: text, lastMessageAt: nowIso }
          : c
      )
    );

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

  // Handle Save Edited Message (1-on-1 or Group)
  async function handleSaveEdit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!editingMessage || !editingMessage.text.trim() || savingEdit) return;

    const { id, type, text } = editingMessage;
    const updatedText = text.trim();
    setSavingEdit(true);

    try {
      if (type === "direct") {
        const res = await fetch("/api/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: id,
            message: updatedText,
          }),
        });

        if (res.ok) {
          setMessages((prev) =>
            prev.map((m) => (m._id === id ? { ...m, message: updatedText, isEdited: true } : m))
          );
          setEditingMessage(null);
        } else {
          const err = await res.json();
          alert(err.error || "Failed to update message");
        }
      } else if (type === "group" && selectedGroup) {
        const res = await fetch(`/api/groups/${selectedGroup._id}/messages`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: id,
            message: updatedText,
          }),
        });

        if (res.ok) {
          setGroupMessages((prev) =>
            prev.map((m) => (m._id === id ? { ...m, message: updatedText, isEdited: true } : m))
          );
          setEditingMessage(null);
        } else {
          const err = await res.json();
          alert(err.error || "Failed to update group message");
        }
      }
    } catch (err) {
      console.error("Failed to edit message:", err);
      alert("Something went wrong updating the message.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete all messages with selected contact
  async function handleDeleteAllMessages() {
    if (!selectedContact) return;
    setDeletingMessages(true);
    try {
      const res = await fetch(`/api/chat/${selectedContact.id}`, { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        setShowDeleteConfirm(false);
      }
    } catch (e) {
      console.error("Failed to delete messages", e);
    } finally {
      setDeletingMessages(false);
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
      setLocalStream(stream); // useEffect will bind srcObject after render

      connectToSignalingRoom(callRoomName, stream);
    } catch (e) {
      console.error("Failed to start media streams", e);
      alert("Microphone or camera permission denied.");
      endCall();
    }
  }

  async function autoAcceptCall(caller: Contact, type: "voice" | "video", roomName: string) {
    if (!session?.user?.id) return;
    setCallType(type);
    setIsInCall(true);
    setIsCalling(false);
    setIsMuted(false);
    setIsCameraOff(type === "voice");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true,
      });
      setLocalStream(stream);

      connectToSignalingRoom(roomName, stream);
    } catch (e) {
      console.error("Failed to accept call", e);
      alert("Failed to access camera/microphone.");
      endCall();
    }
  }

  function connectToSignalingRoom(room: string, stream: MediaStream) {
    const socket = io(SIGNALING_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
    });
    socketRef.current = socket;

    const pc = new RTCPeerConnection(pcConfig);
    pcRef.current = pc;

    let peerSocketId: string | null = null;
    const pendingCandidates: RTCIceCandidate[] = [];
    const pendingRemoteCandidates: RTCIceCandidateInit[] = [];
    let disconnectTimer: any = null;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    async function sendHttpSignal(type: string, payload: any, toUser?: string) {
      try {
        await fetch("/api/chat/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send",
            room,
            to: toUser,
            data: { type, payload },
          }),
        });
      } catch {}
    }

    function flushPendingRemoteCandidates() {
      if (pc.remoteDescription && pendingRemoteCandidates.length > 0) {
        while (pendingRemoteCandidates.length > 0) {
          const cand = pendingRemoteCandidates.shift();
          if (cand) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
              console.warn("Error adding queued remote ICE candidate:", err);
            });
          }
        }
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (peerSocketId) {
          socket.emit("ice-candidate", {
            to: peerSocketId,
            from: socket.id,
            candidate: event.candidate,
          });
        } else {
          pendingCandidates.push(event.candidate);
        }
        sendHttpSignal("candidate", event.candidate, selectedContact?.id);
      }
    };

    function flushPendingCandidates(targetId: string) {
      while (pendingCandidates.length > 0) {
        const cand = pendingCandidates.shift();
        if (cand) {
          socket.emit("ice-candidate", {
            to: targetId,
            from: socket.id,
            candidate: cand,
          });
        }
      }
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteMediaStream = event.streams[0];
        setRemoteStream(remoteMediaStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteMediaStream;
        }
        setIsCalling(false);
      }
    };

    socket.on("connect", () => {
      console.log("Chat WebRTC connected to signaling:", socket.id);
      socket.emit("join-room", {
        meetingId: room,
        user: { name: session?.user?.name || "User", id: session?.user?.id }
      });
    });

    socket.on("current-participants", async ({ participants }: { participants: any[] }) => {
      if (participants && participants.length > 0) {
        const item = participants[0];
        const targetId = typeof item === "string" ? item : item.socketId;
        if (!targetId) return;
        peerSocketId = targetId;
        flushPendingCandidates(targetId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", {
            to: targetId,
            from: socket.id,
            description: pc.localDescription,
            userName: session?.user?.name || "User",
            userId: session?.user?.id,
          });
          sendHttpSignal("offer", pc.localDescription, selectedContact?.id);
        } catch (e) {
          console.error("Error creating WebRTC offer:", e);
        }
      }
    });

    socket.on("offer", async ({ from, description }: any) => {
      peerSocketId = from;
      flushPendingCandidates(from);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        flushPendingRemoteCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", {
          to: from,
          from: socket.id,
          description: pc.localDescription,
          userName: session?.user?.name || "User",
          userId: session?.user?.id,
        });
        sendHttpSignal("answer", pc.localDescription, selectedContact?.id);
      } catch (e) {
        console.error("Error answering offer:", e);
      }
    });

    socket.on("answer", async ({ from, description }: any) => {
      if (from) {
        peerSocketId = from;
        flushPendingCandidates(from);
      }
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(description));
          flushPendingRemoteCandidates();
        }
      } catch (e) {
        console.error("Error setting remote answer:", e);
      }
    });

    socket.on("ice-candidate", async ({ candidate }: any) => {
      try {
        if (candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingRemoteCandidates.push(candidate);
          }
        }
      } catch (e) {
        console.warn("ICE candidate add failed, queued:", e);
        if (candidate) pendingRemoteCandidates.push(candidate);
      }
    });

    pc.onconnectionstatechange = () => {
      console.log("Chat call: pc connectionState changed to:", pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("Chat call: pc iceConnectionState changed to:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        endCall();
      } else if (pc.iceConnectionState === "disconnected") {
        // Grace period before ending on transient network blip
        if (!disconnectTimer) {
          disconnectTimer = setTimeout(() => {
            if (
              pc.iceConnectionState === "disconnected" ||
              pc.iceConnectionState === "failed" ||
              pc.iceConnectionState === "closed"
            ) {
              endCall();
            }
          }, 6000);
        }
      } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        if (disconnectTimer) {
          clearTimeout(disconnectTimer);
          disconnectTimer = null;
        }
      }
    };

    socket.on("user-left", () => {
      console.log("Remote peer left room, ending call");
      endCall();
    });

    socket.on("call-ended", () => {
      console.log("Remote peer ended call");
      endCall();
    });

    // HTTP Signaling fallback loop for environments where Socket.IO server is unreachable
    signalPollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", room }),
        });
        if (!res.ok) return;
        const data = await res.json();
        for (const sig of data.signals || []) {
          if (sig.from === session?.user?.id) continue;
          if (sig.type === "call-ended" || sig.type === "end-call") {
            endCall();
            return;
          } else if (sig.type === "offer" && pc.signalingState === "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            flushPendingRemoteCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendHttpSignal("answer", pc.localDescription, selectedContact?.id);
          } else if (sig.type === "answer" && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
            flushPendingRemoteCandidates();
          } else if (sig.type === "candidate") {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.data));
              } else {
                pendingRemoteCandidates.push(sig.data);
              }
            } catch {
              pendingRemoteCandidates.push(sig.data);
            }
          }
        }
      } catch {}
    }, 1000);
  }

  async function endCall() {
    setIsInCall(false);
    setIsCalling(false);
    setCallDuration(0);
    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
      signalPollRef.current = null;
    }
    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setRemoteStream(null);

    // Notify remote peer via socket before tearing down
    if (socketRef.current) {
      try {
        socketRef.current.emit("call-ended", { meetingId: callRoomName });
        socketRef.current.emit("leave-room", { meetingId: callRoomName });
      } catch {}
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }, 100);
    }

    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }

    // Send HTTP signal fallback
    try {
      fetch("/api/chat/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          room: callRoomName,
          to: selectedContact?.id,
          data: { type: "call-ended", payload: {} },
        }),
      }).catch(() => {});
    } catch {}

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

  // Filter contacts by query and sort by most recent message timestamp
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...contacts]
      .filter((c) =>
        !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [contacts, searchQuery]);

  // Fetch ALL connection statuses (for People tab badge)
  async function fetchAllConnections() {
    try {
      const res = await fetch("/api/connections");
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, ConnectionStatus> = {};
      for (const conn of data.connections ?? []) {
        map[conn.id] = { status: conn.status, direction: conn.direction };
      }
      setAllConnections(map);
    } catch {}
  }

  // Search people via /api/users?search=...
  async function searchPeople(query: string) {
    if (!query.trim()) { setPeopleResults([]); return; }
    setSearchingPeople(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      // Exclude self
      const filtered = (data.users ?? []).filter((u: UserResult) => u._id !== session?.user?.id);
      setPeopleResults(filtered);
    } catch {}
    finally { setSearchingPeople(false); }
  }

  // Debounce people search
  useEffect(() => {
    const t = setTimeout(() => searchPeople(peopleSearch), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleSearch]);

  // Load all connections when tab switches to people
  useEffect(() => {
    if (activeTab === "people") fetchAllConnections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Send / accept connection request
  async function sendConnectionRequest(userId: string) {
    setSendingRequestTo(userId);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (res.ok) {
        const data = await res.json();
        const conn = data.connection;
        setAllConnections((prev) => ({
          ...prev,
          [userId]: { status: conn.status, direction: conn.direction },
        }));
        // If newly accepted (they had sent to us and we just accepted), refresh contacts
        if (conn.status === "Accepted") {
          const contactRes = await fetch("/api/connections?status=Accepted");
          if (contactRes.ok) {
            const contactData = await contactRes.json();
            setContacts(contactData.connections ?? []);
          }
        }
      }
    } catch {} finally { setSendingRequestTo(null); }
  }

  // ── Group Functions ──

  async function fetchGroups() {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) { 
        const d = await res.json(); 
        const loadedGroups = d.groups ?? [];
        setGroups(loadedGroups); 
        
        // Auto-accept group call from global toast
        const acceptGroupId = searchParams?.get("acceptGroup");
        const callTypeParam = searchParams?.get("type") as "voice" | "video" | null;
        if (acceptGroupId && callTypeParam) {
          const g = loadedGroups.find((x: any) => x._id === acceptGroupId);
          if (g) {
            setActiveTab("groups");
            setSelectedContact(null);
            setSelectedGroup(g);
            window.history.replaceState({}, "", "/chat");
            setTimeout(() => {
              setGroupCall({ type: callTypeParam });
            }, 100);
          }
        }
      }
    } catch {}
  }

  // Fetch groups when Groups tab is active OR if we have an acceptGroup param on load
  useEffect(() => {
    if (activeTab === "groups" || searchParams?.has("acceptGroup")) fetchGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Poll group messages when a group is selected
  useEffect(() => {
    if (!selectedGroup) { setGroupMessages([]); return; }
    let interval: any;
    async function fetchGMsgs() {
      try {
        const res = await fetch(`/api/groups/${selectedGroup!._id}/messages`);
        if (res.ok) { const d = await res.json(); setGroupMessages(d.messages ?? []); }
      } catch {}
    }
    setLoadingGroupMessages(true);
    fetchGMsgs().then(() => setLoadingGroupMessages(false));
    interval = setInterval(fetchGMsgs, 2500);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  async function handleSendGroupMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupMessage.trim() || !selectedGroup || !session?.user?.id) return;
    const text = newGroupMessage;
    setNewGroupMessage("");
    // Optimistic
    const tempMsg: GroupMessage = {
      _id: Math.random().toString(),
      groupId: selectedGroup._id,
      senderId: {
        _id: session.user.id,
        name: session.user.name ?? "You",
        email: session.user.email ?? "",
        role: "",
        avatar: session.user.image ?? null,
      },
      message: text,
      createdAt: new Date().toISOString(),
    };
    setGroupMessages((prev) => [...prev, tempMsg]);
    try {
      await fetch(`/api/groups/${selectedGroup._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
    } catch {}
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || selectedGroupMembers.length < 1) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          memberIds: selectedGroupMembers,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setGroups((prev) => [d.group, ...prev]);
        setShowCreateGroup(false);
        setNewGroupName("");
        setNewGroupDesc("");
        setSelectedGroupMembers([]);
        setSelectedGroup(d.group);
        setActiveTab("groups");
      }
    } catch {}
    finally { setCreatingGroup(false); }
  }

  function toggleGroupMember(id: string) {
    setSelectedGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function toggleEditGroupMember(id: string) {
    setEditGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function openEditGroupModal() {
    if (!selectedGroup) return;
    setEditGroupName(selectedGroup.name);
    setEditGroupDesc(selectedGroup.description || "");
    setEditGroupMembers(selectedGroup.members.map((m) => m._id));
    setShowEditGroup(true);
  }

  async function handleUpdateGroup() {
    if (!selectedGroup || !editGroupName.trim()) return;
    setUpdatingGroup(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDesc.trim() || "",
          memberIds: editGroupMembers,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const updated = d.group;
        setSelectedGroup(updated);
        setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
        setShowEditGroup(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingGroup(false);
    }
  }

  async function startGroupCall(type: "voice" | "video") {
    if (!selectedGroup) return;
    // Notify others
    fetch(`/api/groups/${selectedGroup._id}/call-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }).catch(() => {});
    setGroupCall({ type });
  }

  const latestCallMsg = [...groupMessages]
    .reverse()
    .find((m) => m.message.startsWith("[GROUP_CALL_INVITE]:") || m.message.startsWith("[GROUP_CALL_ENDED]:"));
  const hasActiveCall = 
    latestCallMsg && 
    latestCallMsg.message.startsWith("[GROUP_CALL_INVITE]:") && 
    Date.now() - new Date(latestCallMsg.createdAt).getTime() < 60 * 60 * 1000;

  return (
    <AppShell title="Direct Messaging">
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex rounded-2xl border border-white/[0.06] overflow-hidden relative" style={{ background: "var(--bg-card)" }}>
        
        {/* Left Panel: Contacts */}
        <aside className={cn(
          "w-full md:w-80 border-r border-white/[0.06] flex flex-col shrink-0 bg-white/[0.01]",
          selectedContact ? "hidden md:flex" : "flex"
        )}>
          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setActiveTab("chats")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-600 transition-all border-b-2",
                activeTab === "chats" ? "text-indigo-400 border-indigo-500" : "text-white/40 border-transparent hover:text-white/60"
              )}
            >
              <MessageSquare size={12} /> Chats
            </button>
            <button
              onClick={() => { setActiveTab("groups"); setSelectedContact(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-600 transition-all border-b-2",
                activeTab === "groups" ? "text-indigo-400 border-indigo-500" : "text-white/40 border-transparent hover:text-white/60"
              )}
            >
              <Users size={12} /> Groups
            </button>
            <button
              onClick={() => setActiveTab("people")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-600 transition-all border-b-2",
                activeTab === "people" ? "text-indigo-400 border-indigo-500" : "text-white/40 border-transparent hover:text-white/60"
              )}
            >
              <UserPlus size={12} /> People
            </button>
          </div>

          {activeTab === "chats" ? (
            <>
              <div className="p-3 border-b border-white/[0.06]">
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
                  <div className="flex flex-col items-center justify-center p-8 text-white/25 text-center gap-2">
                    <Users size={28} className="text-white/10" />
                    <p className="text-xs">No connections yet.</p>
                    <button
                      onClick={() => setActiveTab("people")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-all mt-1 flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Find people to connect
                    </button>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id;
                    const formatTime = (iso?: string | null) => {
                      if (!iso) return "";
                      const date = new Date(iso);
                      if (isNaN(date.getTime())) return "";
                      const now = new Date();
                      const isToday = date.toDateString() === now.toDateString();
                      if (isToday) {
                        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      }
                      return date.toLocaleDateString([], { month: "short", day: "numeric" });
                    };

                    const timeStr = formatTime(contact.lastMessageAt);
                    const isCallInvite = contact.lastMessage?.startsWith("[CALL_");
                    const previewText = isCallInvite
                      ? "📞 Call"
                      : contact.lastMessage || contact.role.replace(/_/g, " ");

                    return (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                          isSelected
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
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className="text-sm font-600 truncate text-white">{contact.name}</p>
                            {timeStr && (
                              <span className="text-[10px] font-500 text-white/40 shrink-0">{timeStr}</span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 truncate">
                            {previewText}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* ── Find People Tab ── */
            <>
              <div className="p-3 border-b border-white/[0.06]">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  {searchingPeople && (
                    <Loader2 size={14} className="absolute right-3 text-white/30 animate-spin" />
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {!peopleSearch.trim() ? (
                  <div className="flex flex-col items-center justify-center p-8 text-white/25 text-center gap-2">
                    <Search size={28} className="text-white/10" />
                    <p className="text-xs">Type a name or email to discover board members.</p>
                  </div>
                ) : searchingPeople && peopleResults.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-white/30 text-xs gap-2">
                    <Loader2 size={14} className="animate-spin" /> Searching...
                  </div>
                ) : !searchingPeople && peopleResults.length === 0 ? (
                  <div className="text-center p-8 text-white/30 text-xs">No users found.</div>
                ) : (
                  peopleResults.map((user) => {
                    const connStatus = allConnections[user._id];
                    const isAccepted = connStatus?.status === "Accepted";
                    const isPendingOut = connStatus?.status === "Pending" && connStatus.direction === "outgoing";
                    const isPendingIn = connStatus?.status === "Pending" && connStatus.direction === "incoming";
                    const isSending = sendingRequestTo === user._id;

                    return (
                      <div
                        key={user._id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:bg-white/[0.03] transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(user.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-600 text-white/80 truncate">{user.name}</p>
                          <p className="text-[10px] text-white/35 truncate uppercase">{user.role.replace(/_/g, " ")}</p>
                        </div>
                        <div className="shrink-0">
                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-600 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <UserCheck size={10} /> Connected
                            </span>
                          ) : isPendingOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-600 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock size={10} /> Pending
                            </span>
                          ) : isPendingIn ? (
                            <button
                              onClick={() => sendConnectionRequest(user._id)}
                              disabled={isSending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-600 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 transition-all disabled:opacity-60"
                            >
                              {isSending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                              Accept
                            </button>
                          ) : (
                            <button
                              onClick={() => sendConnectionRequest(user._id)}
                              disabled={isSending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-600 bg-white/[0.05] text-white/50 border border-white/[0.08] hover:bg-indigo-500/15 hover:text-indigo-400 hover:border-indigo-500/25 transition-all disabled:opacity-60"
                            >
                              {isSending ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ── Groups Tab ── */}
          {activeTab === "groups" && (
            <>
              <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
                <p className="flex-1 text-xs font-600 text-white/50 uppercase tracking-wider">My Groups</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-600 bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 transition-all"
                >
                  <Plus size={11} /> New Group
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-white/25 text-center gap-2">
                    <Users size={28} className="text-white/10" />
                    <p className="text-xs">No groups yet.</p>
                    <button onClick={() => setShowCreateGroup(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-1">
                      <Plus size={12} /> Create a group
                    </button>
                  </div>
                ) : (
                  groups.map((g) => (
                    <button
                      key={g._id}
                      onClick={() => { setSelectedGroup(g); setSelectedContact(null); }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                        selectedGroup?._id === g._id
                          ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                          : "border border-transparent hover:bg-white/[0.03] text-white/70 hover:text-white"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-sm font-700 text-white shrink-0">
                        {g.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-600 truncate">{g.name}</p>
                        <p className="text-xs text-white/35 truncate">{g.members.length} members</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </aside>

        {/* Right Panel: Chat or Group Chat */}
        <main className={cn(
          "flex-1 flex flex-col min-w-0 bg-black/[0.01]",
          (selectedContact || selectedGroup) ? "flex" : "hidden md:flex"
        )}>
          {selectedContact ? (
            <>
              {/* Active Header */}
              <div className="px-4 md:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="p-2 rounded-lg md:hidden hover:bg-white/[0.08] text-white/60 hover:text-white transition-all shrink-0"
                    title="Back to contacts"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-xs md:text-sm font-600 text-white shrink-0">
                    {selectedContact.avatar ? (
                      <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(selectedContact.name)
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-600 text-white leading-tight">{selectedContact.name}</h3>
                    <p className="text-[9px] md:text-[10px] text-emerald-400 font-500 mt-0.5">Online</p>
                  </div>
                </div>

                {/* Video/Voice calling buttons + Delete */}
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
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.08] hover:border-red-500/20 transition-all"
                    title="Delete All Messages"
                  >
                    <Trash2 size={15} />
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
                          "flex max-w-[70%] flex-col space-y-1 group relative",
                          isSelf ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessage({ id: msg._id, type: "direct", text: msg.message });
                                setShowEmojiPicker(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/40 hover:text-indigo-300 hover:bg-white/[0.08] transition-all shrink-0"
                              title="Edit message"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
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
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-white/35 px-1">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.isEdited && <span className="italic text-white/40">(edited)</span>}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input panel */}
              <div className="relative border-t border-white/[0.06]">
                {/* Editing Message Banner */}
                {editingMessage && editingMessage.type === "direct" && (
                  <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
                    <div className="flex items-center gap-2 truncate">
                      <Edit2 size={13} className="shrink-0 text-indigo-400" />
                      <span className="font-600">Editing Message:</span>
                      <span className="text-white/60 truncate italic max-w-md">{editingMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMessage(null)}
                      className="text-white/40 hover:text-white p-1 rounded-md"
                      title="Cancel edit (Esc)"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-4 mb-2 z-50">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        if (editingMessage && editingMessage.type === "direct") {
                          setEditingMessage({ ...editingMessage, text: editingMessage.text + emoji });
                        } else {
                          setNewMessage((prev) => prev + emoji);
                        }
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}

                <form
                  onSubmit={editingMessage && editingMessage.type === "direct" ? handleSaveEdit : handleSendMessage}
                  className="p-4 flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0",
                      showEmojiPicker
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08]"
                    )}
                    title="Add Emoji"
                  >
                    <Smile size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={editingMessage && editingMessage.type === "direct" ? "Edit message..." : "Type a message..."}
                    value={editingMessage && editingMessage.type === "direct" ? editingMessage.text : newMessage}
                    onChange={(e) => {
                      if (editingMessage && editingMessage.type === "direct") {
                        setEditingMessage({ ...editingMessage, text: e.target.value });
                      } else {
                        setNewMessage(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && editingMessage) setEditingMessage(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />

                  {editingMessage && editingMessage.type === "direct" ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMessage(null)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white"
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                      <button
                        type="submit"
                        disabled={!editingMessage.text.trim() || savingEdit}
                        className="btn-gradient w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-50"
                        title="Save changes"
                      >
                        {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="btn-gradient w-11 h-11 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </form>
              </div>
            </>
          ) : selectedGroup ? (
            <>
              {/* Group Active Header */}
              <div className="px-4 md:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-sm font-700 text-white shrink-0">
                    {selectedGroup.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm md:text-base font-600 text-white tracking-tight">{selectedGroup.name}</h3>
                      <button
                        onClick={openEditGroupModal}
                        className="text-white/40 hover:text-indigo-400 p-1 rounded-md transition-colors"
                        title="Edit Group Name"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-white/40">{selectedGroup.members.length} members {selectedGroup.description ? `· ${selectedGroup.description}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasActiveCall ? (
                    <button
                      onClick={() => setGroupCall({ type: "video" })}
                      className="px-3 py-1.5 rounded-lg text-xs font-700 text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg flex items-center gap-1.5 transition-all"
                    >
                      <Video size={14} /> Rejoin Call
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => startGroupCall("voice")}
                        className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                        title="Voice Call"
                      >
                        <Phone size={15} />
                      </button>
                      <button
                        onClick={() => startGroupCall("video")}
                        className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                        title="Video Call"
                      >
                        <Video size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Active Call Banner Removed */}

              {/* Group Chat Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingGroupMessages ? (
                  <div className="flex items-center justify-center p-8 text-white/30 text-sm gap-2">
                    <Loader2 size={15} className="animate-spin" /> Loading chat history...
                  </div>
                ) : groupMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/25 text-center">
                    <Users size={32} className="text-white/10 mb-2" />
                    <p className="text-sm">Say hello to the group! No messages yet.</p>
                  </div>
                ) : (
                  groupMessages
                    .filter(msg => !msg.message.startsWith("[GROUP_CALL_INVITE]:") && !msg.message.startsWith("[GROUP_CALL_ENDED]:"))
                    .map((msg) => {
                      const isSelf = msg.senderId._id === session?.user?.id;
                    
                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          "flex max-w-[70%] flex-col space-y-1 group relative",
                          isSelf ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {!isSelf && (
                          <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[10px] font-600 text-indigo-300/70">{msg.senderId.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {isSelf && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessage({ id: msg._id, type: "group", text: msg.message });
                                setShowGroupEmojiPicker(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/40 hover:text-indigo-300 hover:bg-white/[0.08] transition-all shrink-0"
                              title="Edit group message"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
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
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-white/35 px-1">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.isEdited && <span className="italic text-white/40">(edited)</span>}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Group Input panel */}
              <div className="relative border-t border-white/[0.06]">
                {/* Editing Message Banner */}
                {editingMessage && editingMessage.type === "group" && (
                  <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
                    <div className="flex items-center gap-2 truncate">
                      <Edit2 size={13} className="shrink-0 text-indigo-400" />
                      <span className="font-600">Editing Message:</span>
                      <span className="text-white/60 truncate italic max-w-md">{editingMessage.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMessage(null)}
                      className="text-white/40 hover:text-white p-1 rounded-md"
                      title="Cancel edit (Esc)"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Group Emoji Picker Popover */}
                {showGroupEmojiPicker && (
                  <div className="absolute bottom-full left-4 mb-2 z-50">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        if (editingMessage && editingMessage.type === "group") {
                          setEditingMessage({ ...editingMessage, text: editingMessage.text + emoji });
                        } else {
                          setNewGroupMessage((prev) => prev + emoji);
                        }
                      }}
                      onClose={() => setShowGroupEmojiPicker(false)}
                    />
                  </div>
                )}

                <form
                  onSubmit={editingMessage && editingMessage.type === "group" ? handleSaveEdit : handleSendGroupMessage}
                  className="p-4 flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setShowGroupEmojiPicker((prev) => !prev)}
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0",
                      showGroupEmojiPicker
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08]"
                    )}
                    title="Add Emoji"
                  >
                    <Smile size={18} />
                  </button>

                  <input
                    type="text"
                    placeholder={editingMessage && editingMessage.type === "group" ? "Edit message..." : "Type a message to the group..."}
                    value={editingMessage && editingMessage.type === "group" ? editingMessage.text : newGroupMessage}
                    onChange={(e) => {
                      if (editingMessage && editingMessage.type === "group") {
                        setEditingMessage({ ...editingMessage, text: e.target.value });
                      } else {
                        setNewGroupMessage(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && editingMessage) setEditingMessage(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/80 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
                  />

                  {editingMessage && editingMessage.type === "group" ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingMessage(null)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white"
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                      <button
                        type="submit"
                        disabled={!editingMessage.text.trim() || savingEdit}
                        className="btn-gradient w-10 h-10 rounded-lg flex items-center justify-center disabled:opacity-50"
                        title="Save changes"
                      >
                        {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!newGroupMessage.trim()}
                      className="btn-gradient w-11 h-11 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-50"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/30">
              <MessageSquare size={48} className="text-white/10 mb-3" />
              <h4 className="text-base font-600 text-white/70">Start a Conversation</h4>
              <p className="text-sm max-w-sm mt-1">Select a connected board colleague or group from the left panel to begin instant text messaging or direct audio/video calling.</p>
            </div>
          )}
        </main>
      </div>

      {/* Direct Call Dialog Modal overlay */}
      {isInCall && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Call Header - fixed at top */}
          <div className="shrink-0 px-6 py-3 flex items-center justify-between bg-black/80 backdrop-blur-md z-20 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white overflow-hidden">
                {selectedContact?.avatar ? (
                  <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(selectedContact?.name || "U")
                )}
              </div>
              <div>
                <h4 className="text-sm font-600 text-white">{selectedContact?.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", isCalling ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse")} />
                  <p className="text-[11px] text-white/60 font-500">
                    {isCalling ? `Calling (${callType})...` : `${callType === "video" ? "Video" : "Voice"} Call • ${formatCallDuration(callDuration)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Video area — fills remaining space */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {isCalling ? (
              /* Ringing/Calling screen */
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
                  <PhoneForwarded size={36} className="animate-bounce" />
                </div>
                <h3 className="text-lg font-600 text-white">Calling {selectedContact?.name}...</h3>
                <p className="text-sm text-white/40 mt-1">Waiting for reply...</p>
              </div>
            ) : callType === "video" ? (
              <>
                {/* Remote video — full background */}
                {remoteStream ? (
                  <video
                    ref={(el) => {
                      remoteVideoRef.current = el;
                      if (el && remoteStream) {
                        el.srcObject = remoteStream;
                      }
                    }}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain mx-auto bg-black"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white/40">
                    <Loader2 size={32} className="animate-spin text-indigo-400 mb-2" />
                    <p className="text-sm">Connecting video streams...</p>
                  </div>
                )}

                {/* Local PIP — floating corner overlay */}
                <div className="absolute bottom-4 right-4 w-28 h-20 sm:w-36 sm:h-24 md:w-48 md:h-32 rounded-2xl border-2 border-white/30 overflow-hidden bg-black shadow-2xl z-10 flex items-center justify-center">
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && localStream) el.srcObject = localStream;
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black scale-x-[-1]"
                  />
                  <div className="absolute bottom-1 left-2 text-[9px] text-white/60 font-500">You</div>
                </div>
              </>
            ) : (
              /* Voice call layout */
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 animate-pulse">
                  <Mic size={36} />
                </div>
                <h3 className="text-lg sm:text-xl font-600 text-white">{selectedContact?.name}</h3>
                <p className="text-xs sm:text-sm text-emerald-400 mt-2 font-500">● Connected</p>
                {/* Hidden streams to keep audio working */}
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              </div>
            )}
          </div>

          {/* Controls bar — shrink-0 so it's ALWAYS visible at bottom */}
          <div className="shrink-0 py-4 sm:py-5 px-4 sm:px-6 bg-black/80 backdrop-blur-md flex items-center justify-center gap-4 sm:gap-5 z-20 border-t border-white/[0.06]">
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
                {isCameraOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
              </button>
            )}

            <button
              onClick={endCall}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/40 transition-all shrink-0"
              title="End Call"
            >
              <PhoneOff size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Old Ringing/Incoming Call Dialog Pop Up removed to use GlobalCallToast */}

      {/* Delete All Messages Confirmation Modal */}
      {showDeleteConfirm && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div
            className="w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 shadow-2xl"
            style={{ background: "var(--bg-card)" }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-600 text-white mb-1">Delete All Messages?</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  This will permanently delete your entire conversation with <span className="text-white/80 font-500">{selectedContact.name}</span>. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingMessages}
                  className="flex-1 py-2.5 rounded-lg text-sm font-500 text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllMessages}
                  disabled={deletingMessages}
                  className="flex-1 py-2.5 rounded-lg text-sm font-600 text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {deletingMessages ? (
                    <><Loader2 size={14} className="animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 size={14} /> Delete All</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Call Room Overlay ── */}
      {groupCall && selectedGroup && session?.user && (
        <GroupCallRoom
          groupId={selectedGroup._id}
          groupName={selectedGroup.name}
          callType={groupCall.type}
          currentUser={{ id: session.user.id, name: session.user.name || "User" }}
          onEnd={(isLast) => {
            setGroupCall(null);
            if (isLast) {
              fetch(`/api/groups/${selectedGroup._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: `[GROUP_CALL_ENDED]:${groupCall.type}` }),
              }).catch(() => {});
            }
          }}
        />
      )}

      {/* ── Create Group Modal ── */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-slide-in">
            <h3 className="text-lg font-600 text-white mb-4">Create New Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Finance Committee"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="What is this group for?"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Add Members</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border border-white/[0.06] rounded-xl p-2 bg-white/[0.01]">
                  {contacts.length === 0 ? (
                    <p className="text-xs text-white/30 text-center py-4">No connected contacts to add.</p>
                  ) : (
                    contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleGroupMember(c.id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white">
                            {getInitials(c.name)}
                          </div>
                          <span className="text-sm text-white/80">{c.name}</span>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center border transition-all",
                          selectedGroupMembers.includes(c.id)
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-transparent border-white/[0.1] text-transparent"
                        )}>
                          <Check size={12} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateGroup(false); setNewGroupName(""); setSelectedGroupMembers([]); }}
                className="px-4 py-2 rounded-lg text-sm font-500 text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                disabled={creatingGroup}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim() || selectedGroupMembers.length < 1}
                className="btn-gradient px-4 py-2 rounded-lg text-sm font-500 flex items-center gap-2 disabled:opacity-50"
              >
                {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : null}
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Group Modal ── */}
      {showEditGroup && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-slide-in flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-600 text-white mb-4">
              {selectedGroup.createdBy?._id === session?.user?.id ? "Edit Group Details" : "Group Details"}
            </h3>
            
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="e.g. Executive Board"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                  autoFocus
                  disabled={selectedGroup.createdBy?._id !== session?.user?.id}
                />
              </div>
              
              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  value={editGroupDesc}
                  onChange={(e) => setEditGroupDesc(e.target.value)}
                  placeholder="What is this group for?"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50"
                  disabled={selectedGroup.createdBy?._id !== session?.user?.id}
                />
              </div>

              <div>
                <label className="block text-xs font-500 text-white/50 mb-1.5 uppercase tracking-wider">Members</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border border-white/[0.06] rounded-xl p-2 bg-white/[0.01]">
                  {selectedGroup.createdBy?._id === session?.user?.id && contacts.length === 0 && selectedGroup.members.length === 1 ? (
                    <p className="text-xs text-white/30 text-center py-4">No connected contacts to add.</p>
                  ) : (
                    (selectedGroup.createdBy?._id === session?.user?.id ? [...contacts, ...selectedGroup.members.filter(m => !contacts.some(c => c.id === m._id) && m._id !== session?.user?.id)] : selectedGroup.members).map((c: any) => {
                      const cid = c.id || c._id;
                      const isMember = editGroupMembers.includes(cid);
                      const isAdmin = selectedGroup.createdBy?._id === cid;
                      if (selectedGroup.createdBy?._id !== session?.user?.id && !isMember) return null;

                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => selectedGroup.createdBy?._id === session?.user?.id && toggleEditGroupMember(cid)}
                          disabled={selectedGroup.createdBy?._id !== session?.user?.id || isAdmin}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors disabled:hover:bg-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-600 text-white">
                              {getInitials(c.name)}
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="text-sm text-white/80">{c.name} {cid === session?.user?.id ? "(You)" : ""}</span>
                              {isAdmin && <span className="text-[9px] font-700 text-indigo-400 uppercase tracking-wider">Admin</span>}
                            </div>
                          </div>
                          {selectedGroup.createdBy?._id === session?.user?.id && (
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center border transition-all",
                              isMember
                                ? isAdmin ? "bg-white/10 border-white/10 text-white/50" : "bg-indigo-500 border-indigo-500 text-white"
                                : "bg-transparent border-white/[0.1] text-transparent"
                            )}>
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowEditGroup(false)}
                className="px-4 py-2 rounded-lg text-sm font-500 text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                disabled={updatingGroup}
              >
                Cancel
              </button>
              {selectedGroup.createdBy?._id === session?.user?.id && (
                <button
                  onClick={handleUpdateGroup}
                  disabled={updatingGroup || !editGroupName.trim() || editGroupMembers.length < 1}
                  className="btn-gradient px-4 py-2 rounded-lg text-sm font-500 flex items-center gap-2 disabled:opacity-50"
                >
                  {updatingGroup ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
