import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ApiKey from "@/models/ApiKey";
import { maskApiKey } from "@/lib/ai/keyService";

function isAdminRole(role?: string) {
  return role === "admin" || role === "super_admin";
}

// GET /api/admin/api-keys — List all API keys (masked)
export async function GET() {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectDB();
    const keys = await ApiKey.find().sort({ updatedAt: -1 }).lean();

    const maskedKeys = keys.map((k: any) => ({
      _id: k._id.toString(),
      provider: k.provider,
      keyName: k.keyName,
      maskedKey: maskApiKey(k.apiKey),
      hasKey: Boolean(k.apiKey),
      model: k.model || "",
      baseUrl: k.baseUrl || "",
      isActive: k.isActive ?? true,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error("[API Keys GET Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch API keys" }, { status: 500 });
  }
}

// POST /api/admin/api-keys — Add a new API key
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { provider, keyName, apiKey, model, baseUrl, isActive } = body;

    if (!provider || !["openai", "grok", "gemini", "custom"].includes(provider)) {
      return NextResponse.json({ error: "Valid provider is required (openai, grok, gemini, custom)" }, { status: 400 });
    }
    if (!keyName || !keyName.trim()) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    await connectDB();

    // If making this key active, we can optionally deactivate existing ones for the same provider
    if (isActive !== false) {
      await ApiKey.updateMany({ provider }, { isActive: false });
    }

    const newKey = await ApiKey.create({
      provider,
      keyName: keyName.trim(),
      apiKey: apiKey.trim(),
      model: model?.trim() || "",
      baseUrl: baseUrl?.trim() || "",
      isActive: isActive !== false,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      message: "API key added successfully",
      key: {
        _id: newKey._id.toString(),
        provider: newKey.provider,
        keyName: newKey.keyName,
        maskedKey: maskApiKey(newKey.apiKey),
        model: newKey.model,
        baseUrl: newKey.baseUrl,
        isActive: newKey.isActive,
        createdAt: newKey.createdAt,
        updatedAt: newKey.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[API Keys POST Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to create API key" }, { status: 500 });
  }
}
