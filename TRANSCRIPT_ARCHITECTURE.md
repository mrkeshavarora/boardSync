# Live Speech-To-Text Transcript & Camera Fix Architecture Backup

> **Purpose**: This document serves as the authoritative blueprint and code backup for the **Live Speech-to-Text Transcript System** and **Camera Blink Fixes** in BoardSync. If a future `git pull` or merge reverts these files, use this reference to restore the correct implementation.

---

## 1. Executive Summary of Critical Fixes

### A. Live Transcript Performance & Zero Latency
1. **Instant Word-by-Word Interim Streaming**:
   - *Issue*: `onresult` previously accumulated interim text starting only from `event.resultIndex`, skipping preceding active interim tokens and delaying transcript updates until sentence completion (`isFinal`).
   - *Fix*: `onresult` iterates all interim results from index `0` to `event.results.length - 1`, building the complete growing live phrase word-by-word in real time as each word is spoken.
2. **Gapless Continuous Recognition Restarts**:
   - *Issue*: `onend` had a 150ms timeout delay before calling `safeStart()`, causing small speech gaps between continuous speech cycles.
   - *Fix*: Reduced restart delay to 0ms (`safeStart()` called immediately), making speech recognition gapless.
3. **Clean Real-Time Live UI Rendering**:
   - *Issue*: `LiveTranscriptPanel` had `animate-pulse` opacity flickering and displayed "Translating...", making real-time word-by-word streaming look like buffering/lag.
   - *Fix*: Replaced "Translating..." with a glowing green "Live" indicator, removed container pulse flicker, and styled active speech in a crisp, highlighted text card (`bg-emerald-950/30 border border-emerald-500/20`).
4. **Single Stable `SpeechRecognition` Instance**:
   - *Issue*: `SpeechRecognition` was recreated on every `isMuted` or re-render, causing a 1–2 second re-initialization delay for every sentence.
   - *Fix*: The recognition instance is initialized **once** on mount (`[meetingId, session]`). A separate `useEffect([isMuted])` toggles `.stop()` / `.start()` on the existing instance without re-instantiating it.
5. **Stale Closure Elimination with `isMutedRef`**:
   - *Issue*: The `onend` callback was reading stale `isMuted` state, causing automatic restarts to silently fail after natural pauses in speech.
   - *Fix*: Introduced `isMutedRef` updated in a zero-dependency `useEffect`. `onend` checks `!isMutedRef.current` for gapless zero-delay restarts.
6. **Bypass Slow OpenAI Whisper Chunking**:
   - *Issue*: The secondary 5-second audio recorder was posting audio chunks to OpenAI Whisper every 6 seconds in parallel, adding 6–11 second delayed duplicate text over the live Web Speech API stream.
   - *Fix*: Added `if (SpeechRecognition) return;` at top of Whisper chunk recorder so it only runs as a fallback on unsupported browsers (e.g. Firefox).
7. **No Duplicate Socket Echoes**:
   - *Issue*: `server.js` used `io.to(meetingId)` which sent transcript socket events back to the speaker, causing double lines in the UI.
   - *Fix*: Updated `server.js` to use `socket.to(meetingId).emit(...)` (broadcasts to room excluding the sender).
8. **State-tracked Socket Prop**:
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
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
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
    if (speechRecRef.current) {
      try { speechRecRef.current.abort(); } catch {}
      speechRecRef.current = null;
    }
  };
}, [meetingId, session]);
```

---

### File 2: `components/meetings/LiveTranscriptPanel.tsx` (UI Panel)

```tsx
// Active partial rendering
{Object.entries(activePartials).map(([speakerId, partial]) => (
  <div key={speakerId} className="flex gap-3 group">
    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-sm shadow-emerald-500/20">
      <Mic size={14} className="animate-pulse" />
    </div>
    <div className="space-y-1 min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-700 text-emerald-400 truncate flex items-center gap-1.5">
          {partial.speakerName} {speakerId === currentUser.id ? "(You)" : ""}
        </span>
        <span className="text-[9px] text-emerald-400/80 shrink-0 font-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Live
        </span>
      </div>
      <p className="text-xs text-emerald-100/90 leading-relaxed font-500 break-words bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl">
        {partial.text}
      </p>
    </div>
  </div>
))}
```
