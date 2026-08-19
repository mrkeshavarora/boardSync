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

export interface ActiveAiConfig extends ResolvedKey {
  provider: ApiProvider;
}

export async function getActiveAiConfig(): Promise<ActiveAiConfig> {
  try {
    await connectDB();
    // 1. Priority: Find any active key in the database (admin selected)
    const dbKey = await ApiKey.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    if (dbKey && dbKey.apiKey?.trim()) {
      return {
        provider: dbKey.provider,
        apiKey: dbKey.apiKey.trim(),
        model: dbKey.model?.trim() || undefined,
        baseUrl: dbKey.baseUrl?.trim() || (dbKey.provider === "grok" ? "https://api.groq.com/openai/v1" : undefined),
        source: "database",
        keyName: dbKey.keyName,
      };
    }
  } catch (error) {
    console.warn("[KeyService] Failed to query active AI key from database:", error);
  }

  // 2. Fallbacks to individual providers from env
  const openai = await getResolvedApiKey("openai");
  if (openai.apiKey) return { ...openai, provider: "openai", model: openai.model || "gpt-4o-mini" };

  const grok = await getResolvedApiKey("grok");
  if (grok.apiKey) return { ...grok, provider: "grok", model: grok.model || "llama-3.3-70b-versatile", baseUrl: grok.baseUrl || "https://api.groq.com/openai/v1" };

  const gemini = await getResolvedApiKey("gemini");
  if (gemini.apiKey) return { ...gemini, provider: "gemini", model: gemini.model || "gemini-1.5-flash" };

  const custom = await getResolvedApiKey("custom");
  if (custom.apiKey) return { ...custom, provider: "custom" };

  return {
    provider: "openai",
    apiKey: "",
    source: "none",
  };
}

