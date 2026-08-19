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

export function normalizeBaseUrl(provider: ApiProvider, rawBaseUrl?: string): string | undefined {
  if (provider === "grok") {
    if (!rawBaseUrl || !rawBaseUrl.trim()) return "https://api.groq.com/openai/v1";
    const trimmed = rawBaseUrl.trim().replace(/\/+$/, "");
    if (trimmed.includes("api.groq.com")) {
      return "https://api.groq.com/openai/v1";
    }
    return trimmed;
  }
  if (provider === "openai") {
    if (!rawBaseUrl || !rawBaseUrl.trim() || rawBaseUrl.includes("api.openai.com")) return undefined;
    return rawBaseUrl.trim().replace(/\/+$/, "");
  }
  return rawBaseUrl?.trim() || undefined;
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
        baseUrl: normalizeBaseUrl(provider, dbKey.baseUrl),
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
      baseUrl: normalizeBaseUrl(provider, undefined),
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
      let provider = dbKey.provider;
      let model = dbKey.model?.trim() || "";
      const rawKey = dbKey.apiKey.trim();

      // Auto-detect provider to prevent routing Groq models to OpenAI
      if (rawKey.startsWith("gsk_") || model.startsWith("llama-") || model.startsWith("mixtral-") || model.startsWith("gemma")) {
        provider = "grok";
        if (!model) model = "llama-3.3-70b-versatile";
      } else if (rawKey.startsWith("AIzaSy") || model.startsWith("gemini-")) {
        provider = "gemini";
        if (!model) model = "gemini-1.5-flash";
      } else if (!model) {
        model = "gpt-4o-mini";
      }

      return {
        provider,
        apiKey: rawKey,
        model,
        baseUrl: normalizeBaseUrl(provider, dbKey.baseUrl),
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
  if (grok.apiKey) return { ...grok, provider: "grok", model: grok.model || "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" };

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

