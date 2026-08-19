"use client";

import { useState, useEffect } from "react";
import {
  Key, Plus, Check, Trash2, Edit2, Zap, RefreshCw, AlertCircle, CheckCircle2, Loader2, X, Eye, EyeOff, ExternalLink, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ApiProvider = "openai" | "grok" | "gemini" | "custom";

interface ApiKeyItem {
  _id: string;
  provider: ApiProvider;
  keyName: string;
  maskedKey: string;
  model?: string;
  baseUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROVIDERS: { id: ApiProvider; name: string; icon: string; defaultModel: string; placeholder: string; docUrl: string }[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "⚡",
    defaultModel: "gpt-4o-mini",
    placeholder: "sk-proj-...",
    docUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "grok",
    name: "Grok / Groq",
    icon: "🚀",
    defaultModel: "llama-3.3-70b-versatile",
    placeholder: "gsk_...",
    docUrl: "https://console.groq.com/keys",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "✨",
    defaultModel: "gemini-1.5-pro",
    placeholder: "AIzaSy...",
    docUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "custom",
    name: "Custom OpenAI-compatible",
    icon: "🔧",
    defaultModel: "custom-model",
    placeholder: "sk-custom-...",
    docUrl: "",
  },
];

export default function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKeyItem | null>(null);

  // Form State
  const [formProvider, setFormProvider] = useState<ApiProvider>("openai");
  const [formName, setFormName] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Testing Connection State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [id: string]: { success: boolean; message: string } }>({});

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load API keys");
      setKeys(data.keys || []);
    } catch (err: any) {
      setError(err.message || "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAdd() {
    setEditingKey(null);
    setFormProvider("openai");
    setFormName("Primary OpenAI Key");
    setFormKey("");
    setFormModel("gpt-4o-mini");
    setFormBaseUrl("");
    setFormActive(true);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: ApiKeyItem) {
    setEditingKey(item);
    setFormProvider(item.provider);
    setFormName(item.keyName);
    setFormKey(""); // Leave empty unless changing
    setFormModel(item.model || "");
    setFormBaseUrl(item.baseUrl || "");
    setFormActive(item.isActive);
    setIsModalOpen(true);
  }

  function handleProviderChange(prov: ApiProvider) {
    setFormProvider(prov);
    const pInfo = PROVIDERS.find((p) => p.id === prov);
    if (!editingKey) {
      setFormName(`Primary ${pInfo?.name} Key`);
      setFormModel(pInfo?.defaultModel || "");
    }
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingKey) {
        // PUT update
        const res = await fetch(`/api/admin/api-keys/${editingKey._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyName: formName,
            apiKey: formKey || undefined,
            model: formModel,
            baseUrl: formBaseUrl,
            isActive: formActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update key");

        setSuccess("API key updated successfully!");
      } else {
        // POST create
        if (!formKey.trim()) {
          throw new Error("API key is required");
        }
        const res = await fetch("/api/admin/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: formProvider,
            keyName: formName,
            apiKey: formKey,
            model: formModel,
            baseUrl: formBaseUrl,
            isActive: formActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add API key");

        setSuccess("API key added successfully!");
      }

      setIsModalOpen(false);
      fetchKeys();
    } catch (err: any) {
      setError(err.message || "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item: ApiKeyItem) {
    try {
      const res = await fetch(`/api/admin/api-keys/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle status");
      
      setKeys((prev) =>
        prev.map((k) =>
          k._id === item._id
            ? { ...k, isActive: !item.isActive }
            : !item.isActive && k.provider === item.provider
            ? { ...k, isActive: false }
            : k
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to update API key status.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this API key? AI operations depending on this key will fall back to environment variables.")) return;
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete key");
      setKeys((prev) => prev.filter((k) => k._id !== id));
      setSuccess("API Key deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete API key.");
    }
  }

  async function handleTestConnection(item: ApiKeyItem) {
    setTestingId(item._id);
    setTestResult((prev) => ({ ...prev, [item._id]: { success: false, message: "Testing..." } }));

    try {
      const res = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item._id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Connection test failed");
      }
      setTestResult((prev) => ({
        ...prev,
        [item._id]: { success: true, message: data.message },
      }));
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [item._id]: { success: false, message: err.message || "Connection failed" },
      }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Key size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-700 text-white">AI Provider API Keys</h3>
              <span className="text-[10px] font-700 uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin Control
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-xl">
              Configure production API keys for OpenAI, Grok, Gemini, or custom endpoints. Keys in database take top priority, falling back to <code>.env</code> variables if absent.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-600 flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all shrink-0"
        >
          <Plus size={15} /> Add API Key
        </button>
      </div>

      {/* Global Toast Messages */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-white/40 hover:text-white"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <CheckCircle2 size={15} className="shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess("")} className="text-white/40 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* Keys List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Loader2 size={24} className="text-indigo-400 animate-spin mb-3" />
          <p className="text-xs text-white/40">Loading API Key configurations...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl border text-center flex flex-col items-center justify-center"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30 mb-3">
            <Key size={22} />
          </div>
          <h4 className="text-sm font-600 text-white mb-1">No Database API Keys Configured</h4>
          <p className="text-xs text-white/40 max-w-md mb-4 leading-relaxed">
            The application is currently relying on environment variables (<code>.env</code>) for OpenAI and Grok. Click below to manage keys dynamically from the admin panel.
          </p>
          <button onClick={handleOpenAdd} className="btn-gradient px-4 py-2 rounded-xl text-xs font-600 flex items-center gap-2">
            <Plus size={14} /> Add First API Key
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {keys.map((k) => {
            const pInfo = PROVIDERS.find((p) => p.id === k.provider);
            const test = testResult[k._id];
            return (
              <div
                key={k._id}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4",
                  k.isActive ? "border-indigo-500/30 bg-white/[0.02]" : "border-white/10 opacity-70 bg-white/[0.01]"
                )}
                style={{ background: "var(--bg-card)" }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {pInfo?.icon || "🔑"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-700 text-white truncate">{k.keyName}</h4>
                        <span className={cn(
                          "text-[10px] font-700 px-2 py-0.5 rounded-full border uppercase tracking-wider",
                          k.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {k.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 mt-0.5 capitalize">{pInfo?.name || k.provider}</p>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggleActive(k)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
                      k.isActive ? "bg-indigo-500" : "bg-white/10"
                    )}
                    title={k.isActive ? "Disable Key" : "Enable Key"}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                      k.isActive ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-2 py-2 border-y border-white/[0.06] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 font-500">Masked Key:</span>
                    <span className="font-mono text-white/90 bg-white/[0.05] px-2 py-0.5 rounded border border-white/10">
                      {k.maskedKey}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 font-500">Model:</span>
                    <span className="text-white/80 font-mono">{k.model || pInfo?.defaultModel || "Default"}</span>
                  </div>
                  {k.baseUrl && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 font-500">Base URL:</span>
                      <span className="text-indigo-300 truncate max-w-[200px]" title={k.baseUrl}>{k.baseUrl}</span>
                    </div>
                  )}
                </div>

                {/* Test Feedback Badge */}
                {test && (
                  <div className={cn(
                    "p-2.5 rounded-lg text-xs flex items-center gap-2",
                    test.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}>
                    {test.success ? <Zap size={14} /> : <AlertCircle size={14} />}
                    <span className="truncate">{test.message}</span>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleTestConnection(k)}
                    disabled={testingId === k._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-600 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    {testingId === k._id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                    Test Connection
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(k)}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title="Edit Key"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(k._id)}
                      className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl border space-y-5 shadow-2xl animate-scale-up"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Key size={16} />
                </div>
                <h3 className="text-sm font-700 text-white">
                  {editingKey ? "Edit API Key Configuration" : "Add New API Key"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-600 text-white/70">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={Boolean(editingKey)}
                      onClick={() => handleProviderChange(p.id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-xs font-600 transition-all text-left",
                        formProvider === p.id
                          ? "border-indigo-500 bg-indigo-500/10 text-white shadow-xs"
                          : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.05]"
                      )}
                    >
                      <span>{p.icon}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-600 text-white/70">Key Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Production OpenAI Key"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* Secret API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-600 text-white/70">
                    API Secret Key {editingKey && <span className="text-[10px] text-white/40">(Leave blank to keep unchanged)</span>}
                  </label>
                  {PROVIDERS.find((p) => p.id === formProvider)?.docUrl && (
                    <a
                      href={PROVIDERS.find((p) => p.id === formProvider)?.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Get Key <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  required={!editingKey}
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder={
                    editingKey
                      ? "•••••••• (Unchanged)"
                      : PROVIDERS.find((p) => p.id === formProvider)?.placeholder || "Enter secret key..."
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60 font-mono"
                />
              </div>

              {/* Model & Base URL Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-600 text-white/70">Model (Optional)</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder={PROVIDERS.find((p) => p.id === formProvider)?.defaultModel || "e.g. gpt-4o-mini"}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-600 text-white/70">Base URL (Optional)</label>
                  <input
                    type="text"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-600 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient px-5 py-2 rounded-xl text-xs font-600 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editingKey ? "Save Changes" : "Save API Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
