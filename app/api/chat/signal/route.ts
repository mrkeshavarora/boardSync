import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// In-memory signaling store for WebRTC when socket server is unreachable
interface SignalMessage {
  id: string;
  room: string;
  to: string;
  from: string;
  type: "offer" | "answer" | "candidate" | "join" | "leave" | "host-control";
  data: any;
  createdAt: number;
}

const signals: SignalMessage[] = [];

// Cleanup signals older than 2 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  while (signals.length > 0 && signals[0].createdAt < cutoff) {
    signals.shift();
  }
}, 30_000);

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { action, room, to, data } = body;
    const fromId = session.user.id;

    if (action === "poll") {
      // Return and clear signals destined for this user in this room
      const pending = signals.filter((s) => s.room === room && (s.to === fromId || s.to === "*"));
      
      // Remove fetched signals from queue
      for (const p of pending) {
        const idx = signals.indexOf(p);
        if (idx !== -1 && p.to !== "*") {
          signals.splice(idx, 1);
        }
      }

      return NextResponse.json({ signals: pending });
    }

    if (action === "send") {
      const msg: SignalMessage = {
        id: Math.random().toString(),
        room,
        to: to || "*",
        from: fromId,
        type: data.type,
        data: data.payload,
        createdAt: Date.now(),
      };
      signals.push(msg);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
