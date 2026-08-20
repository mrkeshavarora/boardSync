import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
import { auth } from "@/lib/auth";
import { canAccessMeeting } from "@/lib/meetingAccess";
import { UserRole } from "@/models/User";
import { isAllowedDocument } from "@/lib/documentValidation";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetingId = (await params).id;
  const role = session.user.role as UserRole;
  await connectDB();

  const hasAccess = await canAccessMeeting(session.user.id, role, meetingId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Forbidden — You do not have access to this meeting." },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!isAllowedDocument(file.name, file.type)) {
      return NextResponse.json(
        { error: "Forbidden — Only document files (PDF, Word, Excel, PowerPoint, Text, Markdown) are allowed. Images and videos are blocked." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let storageUrl = "";
    let storageKey = "";

    const isCloudinaryConfigured = Boolean(
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (isCloudinaryConfigured) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `meetings/${meetingId}`,
            resource_type: "auto",
            public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(buffer);
      });

      storageUrl = uploadResult.secure_url;
      storageKey = uploadResult.public_id;
    } else {
      // Fallback: Base64 Data URI if Cloudinary is not configured
      const base64 = buffer.toString("base64");
      const mime = file.type || "application/octet-stream";
      storageUrl = `data:${mime};base64,${base64}`;
      storageKey = `local-${Date.now()}-${file.name}`;
    }

    const document = await MeetingDocument.create({
      meetingId,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      storageKey,
      storageUrl,
      uploadedBy: session.user.id,
    });

    const populated = await MeetingDocument.findById(document._id).populate(
      "uploadedBy",
      "name email avatar"
    );

    return NextResponse.json({ document: populated || document }, { status: 201 });
  } catch (err: any) {
    console.error("Error uploading document to meeting:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
