import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  // Fetch all documents if no meetingId is specified, or handle query params if needed
  const documents = await MeetingDocument.find({})
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });
    
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await connectDB();
  
  const document = await MeetingDocument.create({
    ...body,
    uploadedBy: session.user.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
