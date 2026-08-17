# Live Speech-To-Text Transcript & Camera Fix Architecture Backup

> **Purpose**: This document serves as the authoritative blueprint and code backup for the **Live Speech-to-Text Transcript System** and **Camera Blink Fixes** in BoardSync. If a future `git pull` or merge reverts these files, use this reference to restore the correct implementation.

---

## 1. Executive Summary of Critical Fixes

### A. Live Transcript Performance & Zero Latency
1. **Single Stable `SpeechRecognition` Instance**:
   - *Issue*: `SpeechRecognition` was recreated on every `isMuted` or re-render, causing a 1–2 second re-initialization delay for every sentence.
   - *Fix*: The recognition instance is initialized **once** on mount (`[meetingId, session]`). A separate `useEffect([isMuted])` toggles `.stop()` / `.start()` on the existing instance without re-instantiating it.
2. **Stale Closure Elimination with `isMutedRef`**:
   - *Issue*: The `onend` callback was reading stale `isMuted` state, causing automatic restarts to silently fail after natural pauses in speech.
   - *Fix*: Introduced `isMutedRef` updated in a zero-dependency `useEffect`. `onend` checks `!isMutedRef.current` for gapless zero-delay restarts.
3. **Bypass Slow OpenAI Whisper Chunking**:
   - *Issue*: The secondary 5-second audio recorder was posting audio chunks to OpenAI Whisper every 6 seconds in parallel, adding 6–11 second delayed duplicate text over the live Web Speech API stream.
   - *Fix*: Added `if (SpeechRecognition) return;` at top of Whisper chunk recorder so it only runs as a fallback on unsupported browsers (e.g. Firefox).
4. **Immediate Interim Word-by-Word Streaming**:
   - *Issue*: Transcripts only updated after complete sentences.
   - *Fix*: `event.resultIndex` iterates interim results and immediately dispatches `local-transcript` window event locally + emits `transcript:partial` to WebRTC peers via Socket.IO.
5. **No Duplicate Socket Echoes**:
   - *Issue*: `server.js` used `io.to(meetingId)` which sent transcript socket events back to the speaker, causing double lines in the UI.
   - *Fix*: Updated `server.js` to use `socket.to(meetingId).emit(...)` (broadcasts to room excluding the sender).
6. **State-tracked Socket Prop**:
   - *Issue*: `LiveTranscriptPanel` was passed `socketRef.current` (which is `null` at initial mount), causing socket listener registration to fail.
   - *Fix*: Introduced `socketInstance` React state in `room/page.tsx` so `LiveTranscriptPanel` re-renders and attaches socket listeners when the connection opens.

---

### B. Camera Blinking Fix
1. **Avoid DOM `display: none` Stream Detachment**:
   - *Issue*: Toggling camera set `className="hidden"` on `<video>`, causing the browser engine to detach `srcObject` media stream, producing a visible flash/blink when turned back on.
   - *Fix*: Used `style={{ visibility: isCameraOff ? "hidden" : "visible" }}` on the `<video>` element, preserving the `srcObject` media binding.
2. **Remove `cameraStreamRef.current` from `useEffect` Dependencies**:
   - *Issue*: Mutable ref in dependency array triggered endless re-render loops of the Web Audio API speaking analyzer.
   - *Fix*: Created a `cameraStreamReady` state boolean that triggers the analyzer setup once when media is ready.

---

## 2. Complete File Implementations

### File 1: `app/meetings/[id]/room/page.tsx` (STT & WebRTC Core)

```tsx
// --- STT Section in room/page.tsx ---

const chunkIntervalRef = useRef<any>(null);
const activeRecordersRef = useRef<MediaRecorder[]>([]);
const speechRecRef = useRef<any>(null);
const isMutedRef = useRef(isMuted); // always-current ref to avoid stale closures in onend

// Keep isMutedRef in sync without recreating the recognition instance
useEffect(() => {
  isMutedRef.current = isMuted;
}, [isMuted]);

// 1. Web Speech API — initialised ONCE per meeting session
useEffect(() => {
  if (!session?.user) return;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("STT: Web Speech API is not supported in this browser.");
    setSttStatusText("Speech API Not Supported (Use Chrome/Edge)");
    setSttStatusColor("text-amber-400");
    return;
  }

  // Abort any previous instance
  if (speechRecRef.current) {
    try { speechRecRef.current.abort(); } catch {}
    speechRecRef.current = null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1; // no need for multiple alternatives — reduces overhead

  recognition.onstart = () => {
    setIsSttListening(true);
    setSttStatusText("Live transcription");
    setSttStatusColor("text-emerald-400");
  };

  recognition.onresult = (event: any) => {
    let finalTranscript = "";
    let interimTranscript = "";

    // Only iterate new results since last event (event.resultIndex)
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
      // Show instantly in local panel
      window.dispatchEvent(new CustomEvent("local-transcript", { detail: partialData }));
      // Broadcast to other participants
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
      }).catch(() => {});
    }
  };

  recognition.onerror = (err: any) => {
    if (err.error === "no-speech" || err.error === "aborted") return;
    console.warn("Web Speech recognition error:", err.error);
    setSttStatusText(`Speech: ${err.error}`);
  };

  recognition.onend = () => {
    setIsSttListening(false);
    // Immediately restart if not muted — zero delay keeps transcription gapless
    if (!isMutedRef.current && speechRecRef.current) {
      try { speechRecRef.current.start(); } catch {}
    }
  };

  speechRecRef.current = recognition;

  if (!isMutedRef.current) {
    try { recognition.start(); } catch {}
  }

  return () => {
    if (speechRecRef.current) {
      try { speechRecRef.current.abort(); } catch {}
      speechRecRef.current = null;
    }
  };
}, [meetingId, session]);

// 2. Handle mute/unmute by starting/stopping existing instance
useEffect(() => {
  if (!speechRecRef.current) return;
  if (isMuted) {
    try { speechRecRef.current.stop(); } catch {}
    setIsSttListening(false);
    setSttStatusText("Muted");
    setSttStatusColor("text-red-400");
  } else {
    try { speechRecRef.current.start(); } catch {}
  }
}, [isMuted]);

// 3. Whisper chunk recorder — FALLBACK ONLY for non-WebSpeech browsers
useEffect(() => {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (SpeechRecognition) return; // Skip Whisper when native Web Speech is present
  if (!session?.user || isMuted) return;

  // ... (Whisper fallback code) ...
}, [isMuted, meetingId, session]);
```

---

### File 2: `components/meetings/LiveTranscriptPanel.tsx` (UI Panel)

```tsx
useEffect(() => {
  const handlePartial = (data: TranscriptItem) => {
    if (data.meetingId !== meetingId) return;
    setActivePartials((prev) => ({
      ...prev,
      [data.speakerId]: {
        text: data.text,
        timestamp: data.timestamp,
        speakerName: data.speakerName,
      },
    }));
  };

  const handleFinal = (data: TranscriptItem) => {
    if (data.meetingId !== meetingId) return;
    setActivePartials((prev) => {
      const copy = { ...prev };
      delete copy[data.speakerId];
      return copy;
    });
    setFinalTranscripts((prev) => [...prev, data]);
  };

  const handleLocal = (e: any) => {
    const data = e.detail;
    if (!data) return;
    if (data.isFinal) handleFinal(data);
    else handlePartial(data);
  };

  window.addEventListener("local-transcript", handleLocal);

  if (socket) {
    socket.on("transcript:partial", handlePartial);
    socket.on("transcript:final", handleFinal);
  }

  return () => {
    window.removeEventListener("local-transcript", handleLocal);
    if (socket) {
      socket.off("transcript:partial", handlePartial);
      socket.off("transcript:final", handleFinal);
    }
  };
}, [socket, meetingId]);
```

---

### File 3: `server.js` (Socket.IO Server Broadcast)

```javascript
socket.on('transcript:partial', (data) => {
  // Broadcast to everyone ELSE in the room — sender renders via local-transcript
  socket.to(data.meetingId).emit('transcript:partial', data);
});

socket.on('transcript:final', (data) => {
  // Broadcast to everyone ELSE in the room — sender renders via local-transcript
  socket.to(data.meetingId).emit('transcript:final', data);
});
```

---

## 4. How to Restore After a Git Pull

If a future `git pull` reverts these files:
1. Verify `app/meetings/[id]/room/page.tsx` contains `isMutedRef` and single-instance `SpeechRecognition`.
2. Check `components/meetings/LiveTranscriptPanel.tsx` is passed `socketInstance` (not `socketRef.current`).
3. Check `server.js` uses `socket.to(data.meetingId).emit(...)` instead of `io.to()`.
