import connectDB from "@/lib/mongodb";
import ApiKey, { ApiProvider } from "@/models/ApiKey";

export interface ResolvedKey {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  source: "database" | "env" | "none";
  keyName?: string;
}

export function maskApiKey(key: string): string {
  if (!key) return "••••••••";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export async function getResolvedApiKey(provider: ApiProvider): Promise<ResolvedKey> {
  try {
    await connectDB();
    
    // 1. Priority: Query active key from database
    const dbKey = await ApiKey.findOne({ provider, isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    if (dbKey && dbKey.apiKey?.trim()) {
      return {
        apiKey: dbKey.apiKey.trim(),
        model: dbKey.model?.trim() || undefined,
        baseUrl: dbKey.baseUrl?.trim() || undefined,
        source: "database",
        keyName: dbKey.keyName,
      };
    }
  } catch (error) {
    console.warn(`[KeyService] Failed to query database for provider "${provider}":`, error);
  }

  // 2. Fallback: Environment Variables
  let envKey = "";
  if (provider === "openai") {
    envKey = process.env.OPENAI_API_KEY || "";
  } else if (provider === "grok") {
    envKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "";
  } else if (provider === "gemini") {
    envKey = process.env.GEMINI_API_KEY || "";
  } else if (provider === "custom") {
    envKey = process.env.CUSTOM_AI_API_KEY || "";
  }

  if (envKey.trim()) {
    return {
      apiKey: envKey.trim(),
      source: "env",
      keyName: "Environment Variable (.env)",
    };
  }

  return {
    apiKey: "",
    source: "none",
  };
}
