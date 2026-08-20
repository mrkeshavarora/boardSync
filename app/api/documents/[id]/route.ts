import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
import { auth } from "@/lib/auth";
import { UserRole } from "@/models/User";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docId = (await params).id;
  await connectDB();

  try {
    const doc = await MeetingDocument.findById(docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Authorization check: Only user who uploaded, or admin/super_admin/secretary can delete
    const isUploader = doc.uploadedBy.toString() === session.user.id;
    const role = session.user.role as UserRole;
    const isAuthorized = isUploader || ["super_admin", "admin", "secretary"].includes(role);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden — You are not authorized to delete this document." },
        { status: 403 }
      );
    }

    // Delete from Cloudinary if configured and not local fallback
    if (doc.storageKey && !doc.storageKey.startsWith("local-")) {
      try {
        await cloudinary.uploader.destroy(doc.storageKey);
      } catch (err) {
        console.warn("[Cloudinary Delete Warning]:", err);
      }
    }

    await MeetingDocument.findByIdAndDelete(docId);

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting document:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
