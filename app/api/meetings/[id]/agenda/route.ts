import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AgendaItem from "@/models/AgendaItem";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const agendaItems = await AgendaItem.find({ meetingId: (await params).id })
    .sort({ order: 1 })
    .populate("presenterId", "name email");
    
  return NextResponse.json({ agendaItems });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "meetings:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  await connectDB();
  const agendaItem = await AgendaItem.create({
    ...body,
    meetingId: (await params).id,
  });

  return NextResponse.json({ agendaItem }, { status: 201 });
}
