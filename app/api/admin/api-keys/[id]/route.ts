import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ApiKey from "@/models/ApiKey";
import { maskApiKey } from "@/lib/ai/keyService";

function isAdminRole(role?: string) {
  return role === "admin" || role === "super_admin";
}

// PUT /api/admin/api-keys/[id] — Update an API key or toggle active state
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { keyName, apiKey, model, baseUrl, isActive } = body;

    await connectDB();
    const existingKey = await ApiKey.findById(id);

    if (!existingKey) {
      return NextResponse.json({ error: "API key configuration not found" }, { status: 404 });
    }

    if (keyName !== undefined) existingKey.keyName = keyName.trim();
    if (apiKey && apiKey.trim() && !apiKey.includes("••••")) {
      existingKey.apiKey = apiKey.trim();
    }
    if (model !== undefined) existingKey.model = model.trim();
    if (baseUrl !== undefined) existingKey.baseUrl = baseUrl.trim();

    if (isActive !== undefined) {
      if (isActive && !existingKey.isActive) {
        // Deactivate other keys for same provider if activating this one
        await ApiKey.updateMany({ provider: existingKey.provider, _id: { $ne: id } }, { isActive: false });
      }
      existingKey.isActive = Boolean(isActive);
    }

    await existingKey.save();

    return NextResponse.json({
      message: "API key updated successfully",
      key: {
        _id: existingKey._id.toString(),
        provider: existingKey.provider,
        keyName: existingKey.keyName,
        maskedKey: maskApiKey(existingKey.apiKey),
        model: existingKey.model,
        baseUrl: existingKey.baseUrl,
        isActive: existingKey.isActive,
        createdAt: existingKey.createdAt,
        updatedAt: existingKey.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[API Key PUT Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to update API key" }, { status: 500 });
  }
}

// DELETE /api/admin/api-keys/[id] — Delete an API key
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    const deletedKey = await ApiKey.findByIdAndDelete(id);

    if (!deletedKey) {
      return NextResponse.json({ error: "API key configuration not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error: any) {
    console.error("[API Key DELETE Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to delete API key" }, { status: 500 });
  }
}
