import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
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
  const documents = await MeetingDocument.find({ meetingId: (await params).id })
    .populate("uploadedBy", "name email");
    
  return NextResponse.json({ documents });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await connectDB();
  
  // Note: Actual S3/R2 upload logic will be handled via pre-signed URLs or 
  // server actions. This endpoint saves the metadata after upload.
  const document = await MeetingDocument.create({
    ...body,
    meetingId: (await params).id,
    uploadedBy: session.user.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
