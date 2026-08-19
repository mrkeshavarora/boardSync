import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ApiKey from "@/models/ApiKey";
import OpenAI from "openai";

function isAdminRole(role?: string) {
  return role === "admin" || role === "super_admin";
}

// POST /api/admin/api-keys/test — Test API key connection with provider
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    let { provider, apiKey, baseUrl, id } = body;

    // If ID provided, fetch stored key from DB if apiKey isn't raw
    if (id && (!apiKey || apiKey.includes("••••"))) {
      await connectDB();
      const storedKey = await ApiKey.findById(id);
      if (!storedKey) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }
      provider = storedKey.provider;
      apiKey = storedKey.apiKey;
      baseUrl = storedKey.baseUrl;
    }

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API Key are required for testing" }, { status: 400 });
    }

    const startTime = Date.now();

    if (provider === "openai") {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl || undefined,
        timeout: 8000,
      });
      await client.models.list();
    } else if (provider === "grok") {
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl || "https://api.groq.com/openai/v1",
        timeout: 8000,
      });
      await client.models.list();
    } else if (provider === "gemini") {
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API returned status ${res.status}`);
      }
    } else if (provider === "custom") {
      if (!baseUrl) {
        throw new Error("Base URL is required to test Custom provider");
      }
      const res = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status >= 500) {
        throw new Error(`Custom endpoint returned server error ${res.status}`);
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      latencyMs,
      message: `Connection successful! Response time: ${latencyMs}ms`,
    });
  } catch (error: any) {
    console.error("[API Key Test Connection Error]:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to establish connection with provider. Verify API key and network.",
    }, { status: 400 });
  }
}
