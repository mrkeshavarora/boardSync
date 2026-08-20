"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { User, Bell, Shield, Palette, Globe, Save, Eye, EyeOff, Users, Check, X as XIcon, Camera, Upload, Trash2, Key, Loader2, AlertCircle } from "lucide-react";
import { cn, capitalizeName } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import ApiKeySettings from "@/components/settings/ApiKeySettings";

type SettingsSection = "profile" | "connections" | "notifications" | "security" | "apikeys";

type ConnectionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Pending" | "Accepted" | "Rejected";
  direction: "incoming" | "outgoing";
  connectionId: string;
};

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "profile", label: "Profile", icon: User, desc: "Personal information & avatar" },
  { id: "connections", label: "Connections", icon: Users, desc: "Manage your network" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Email & in-app alerts" },
  { id: "security", label: "Security", icon: Shield, desc: "Password & 2FA" },
];

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200",
        enabled ? "bg-indigo-500" : "bg-white/[0.1]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function FormField({ label, id, children, hint }: { label: string; id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-500 text-white/80">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors";

export default function SettingsPanel({ user }: { user: { name?: string | null; email?: string | null; title?: string | null; department?: string | null; bio?: string | null; avatar?: string | null; role?: string | null } }) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const res = await fetch("/api/user/2fa/status");
      if (res.ok) {
        const data = await res.json();
        setTwoFactorEnabled(!!data.twoFactorEnabled);
      }
    } catch (e) {
      console.error("Failed to fetch 2FA status", e);
    }
  };

  const handleStartEnable2FA = async () => {
    setSendingOTP(true);
    setOtpError("");
    setOtpNotice("");
    try {
      const res = await fetch("/api/user/2fa/send-otp", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setOtpNotice(data.message || "Verification code sent to your email.");
        setShow2FAModal(true);
      } else {
        setOtpError(data.error || "Failed to send verification code.");
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length < 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setVerifyingOTP(true);
    setOtpError("");
    try {
      const res = await fetch("/api/user/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(true);
        setShow2FAModal(false);
        setOtpInput("");
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setOtpError(data.error || "Verification failed.");
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    setLoading2FA(true);
    try {
      const res = await fetch("/api/user/2fa/disable", { method: "POST" });
      if (res.ok) {
        setTwoFactorEnabled(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (e) {
      console.error("Disable 2FA error", e);
    } finally {
      setLoading2FA(false);
    }
  };

  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAdminUser) {
      items.push({ id: "apikeys", label: "API Keys", icon: Key, desc: "AI provider keys & models" });
    }
    return items;
  }, [isAdminUser]);

  useEffect(() => {
    const sec = searchParams?.get("section");
    if (sec && ["profile", "connections", "notifications", "security", "apikeys"].includes(sec)) {
      if (sec === "apikeys" && !isAdminUser) return;
      setSection(sec as SettingsSection);
    }
  }, [searchParams, isAdminUser]);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail] = useState(user?.email ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar ?? "");
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image size must be less than 2MB");
      return;
    }
    setAvatarError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const syncTheme = () => {
      const currentTheme = (document.documentElement.getAttribute("data-theme") || "dark") as "dark" | "light";
      setTheme(currentTheme);
    };
    syncTheme();
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  const handleThemeChange = (t: "dark" | "light") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    window.dispatchEvent(new Event("themechange"));
  };

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    emailMeetingReminders: true,
    emailRsvp: true,
    emailMinutes: false,
    emailActionItems: true,
    inAppAll: true,
  });

  // Appearance
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Connections
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true);
      const res = await fetch("/api/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (e) {
      console.error("Failed to fetch connections", e);
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    if (section === "connections") {
      fetchConnections();
    }
  }, [section]);

  const handleAcceptConnection = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        fetchConnections();
      }
    } catch (e) {
      console.error("Failed to accept connection", e);
    }
  };

  const incomingRequests = useMemo(() => connections.filter(c => c.status === "Pending" && c.direction === "incoming"), [connections]);
  const outgoingRequests = useMemo(() => connections.filter(c => c.status === "Pending" && c.direction === "outgoing"), [connections]);
  const acceptedConnections = useMemo(() => connections.filter(c => c.status === "Accepted"), [connections]);

  const handleSave = async () => {
    try {
      const { updateProfile } = await import("@/app/actions/settings");
      await updateProfile({
        name: profileName,
        title,
        department,
        bio,
        avatar: avatarUrl,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-700 text-white">Settings</h1>
          <p className="text-xs text-white/50 mt-0.5">Manage your account settings & preferences</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Save size={15} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-56 shrink-0 flex flex-col">
          <div className="p-1.5 rounded-2xl border border-white/[0.06] space-y-1 h-full flex flex-col" style={{ background: "var(--bg-card)" }}>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group",
                      isActive
                        ? "btn-gradient keep-white font-600 shadow-lg shadow-purple-500/25"
                        : "bg-transparent hover:bg-purple-500/10 dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <item.icon
                      size={16}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-white" : "text-[#64748b] dark:text-white/50 group-hover:text-purple-600 dark:group-hover:text-white"
                      )}
                    />
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-xs font-600 truncate transition-colors",
                          isActive ? "text-white" : "text-[#0f172a] dark:text-white group-hover:text-purple-700 dark:group-hover:text-white"
                        )}
                      >
                        {item.label}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] truncate transition-colors",
                          isActive ? "text-white/80" : "text-[#64748b] dark:text-white/50 group-hover:text-purple-600/80 dark:group-hover:text-white/70"
                        )}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 w-full p-4 sm:p-5 rounded-2xl border border-white/[0.06] space-y-4" style={{ background: "var(--bg-card)" }}>
          {/* Profile Section */}
          {section === "profile" && (
            <>
              <div>
                <h2 className="text-base font-600 text-white">Profile Information</h2>
                <p className="text-xs text-white/50 mt-0.5">Update your personal details</p>
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/gif, image/webp"
                className="hidden"
              />

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  onClick={handleAvatarClick}
                  className="relative w-14 h-14 rounded-xl overflow-hidden cursor-pointer group shrink-0 border border-white/20 shadow-md shadow-indigo-500/20"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={profileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-700">
                      {profileName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={16} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      className="px-3 py-1.5 rounded-lg text-xs font-600 text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
                    >
                      <Upload size={13} />
                      Change Avatar
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-500 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40">JPG, PNG or GIF. Max 2MB.</p>
                  {avatarError && <p className="text-[11px] text-red-400 font-500">{avatarError}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <FormField label="Full Name" id="fullName">
                  <input
                    id="fullName"
                    className={inputClass}
                    value={profileName}
                    onChange={(e) => setProfileName(capitalizeName(e.target.value))}
                    placeholder="Your full name"
                    autoCapitalize="words"
                  />
                </FormField>
                <FormField label="Email Address" id="email" hint="Contact admin to change your email">
                  <input id="email" className={cn(inputClass, "opacity-60 cursor-not-allowed")} value={profileEmail} readOnly />
                </FormField>
                <FormField label="Job Title" id="title">
                  <input id="title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your role" />
                </FormField>
                <FormField label="Organization" id="org">
                  <input id="org" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Your organization" />
                </FormField>
              </div>
              <FormField label="Bio" id="bio">
                <textarea id="bio" rows={2} className={cn(inputClass, "resize-none")} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself..." />
              </FormField>
            </>
          )}

          {/* Connections Section */}
          {section === "connections" && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-600 text-white">Connections</h2>
                <p className="text-sm text-white/50 mt-1">Manage your professional network</p>
              </div>

              {loadingConnections ? (
                <div className="text-center py-8 text-white/30 text-sm">Loading connections...</div>
              ) : (
                <div className="space-y-8">
                  {/* Incoming Requests */}
                  {incomingRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">Incoming Requests ({incomingRequests.length})</h3>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {incomingRequests.map(conn => (
                          <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div>
                              <div className="text-sm font-500 text-white">{conn.name}</div>
                              <div className="text-xs text-white/40">{conn.email} • {conn.role}</div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleAcceptConnection(conn.id)} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs font-500 transition-colors flex items-center gap-1.5 cursor-pointer">
                                <Check size={14} /> Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accepted Connections */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">My Connections ({acceptedConnections.length})</h3>
                    {acceptedConnections.length === 0 ? (
                      <div className="p-5 text-center border border-dashed border-white/[0.1] rounded-xl text-sm text-white/30">
                        You have no connections yet. Add them when creating a meeting!
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {acceptedConnections.map(conn => (
                          <div key={conn.connectionId} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white">
                              {conn.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-500 text-white">{conn.name}</div>
                              <div className="text-xs text-white/40 truncate">{conn.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outgoing Requests */}
                  {outgoingRequests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">Sent Requests ({outgoingRequests.length})</h3>
                      <div className="space-y-2 opacity-90 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {outgoingRequests.map(conn => (
                          <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="text-sm font-500 text-white">{conn.name}</div>
                            <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full text-white/50 font-500">Pending</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notifications Section */}
          {section === "notifications" && (
            <>
              <div>
                <h2 className="text-base font-600 text-white">Notification Preferences</h2>
                <p className="text-xs text-white/50 mt-0.5">Control how and when you receive notifications</p>
              </div>
              <div className="space-y-3.5">
                <div>
                  <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-600 mb-2">Email Notifications</h3>
                  <div className="space-y-1">
                    {[
                      { key: "emailMeetingReminders", label: "Meeting Reminders", desc: "Reminders 24h and 1h before meetings" },
                      { key: "emailRsvp", label: "RSVP Requests", desc: "When you are invited to a meeting" },
                      { key: "emailMinutes", label: "Approved Minutes", desc: "When meeting minutes are approved" },
                      { key: "emailActionItems", label: "Action Item Alerts", desc: "Overdue and newly assigned actions" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                        <div>
                          <div className="text-xs font-500 text-white">{label}</div>
                          <div className="text-[11px] text-white/40">{desc}</div>
                        </div>
                        <Toggle
                          enabled={notifPrefs[key as keyof typeof notifPrefs]}
                          onChange={(v) => setNotifPrefs((p) => ({ ...p, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-600 mb-2">In-App Notifications</h3>
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-xs font-500 text-white">All In-App Notifications</div>
                      <div className="text-[11px] text-white/40">Show notifications inside the app</div>
                    </div>
                    <Toggle
                      enabled={notifPrefs.inAppAll}
                      onChange={(v) => setNotifPrefs((p) => ({ ...p, inAppAll: v }))}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Security Section */}
          {section === "security" && (
            <>
              <div>
                <h2 className="text-lg font-600 text-white">Security Settings</h2>
                <p className="text-sm text-white/50 mt-1">Manage your password and account security</p>
              </div>
              <div className="space-y-4">
                <FormField label="Current Password" id="currentPw">
                  <div className="relative">
                    <input
                      id="currentPw"
                      type={showPassword ? "text" : "password"}
                      className={cn(inputClass, "pr-10")}
                      placeholder="••••••••"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>
                <FormField label="New Password" id="newPw" hint="Minimum 12 characters">
                  <input id="newPw" type="password" className={inputClass} placeholder="••••••••" />
                </FormField>
                <FormField label="Confirm New Password" id="confirmPw">
                  <input id="confirmPw" type="password" className={inputClass} placeholder="••••••••" />
                </FormField>
              </div>
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-600 text-white">Two-Factor Authentication</div>
                    <div className="text-xs text-white/40 mt-0.5">Receive a 6-digit security code on your email when signing in</div>
                  </div>
                  {twoFactorEnabled ? (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
                      <Check size={12} /> Enabled
                    </span>
                  ) : (
                    <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Not Enabled</span>
                  )}
                </div>

                {twoFactorEnabled ? (
                  <button
                    onClick={handleDisable2FA}
                    disabled={loading2FA}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-500 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-60"
                  >
                    {loading2FA ? "Disabling..." : "Disable 2FA"}
                  </button>
                ) : (
                  <button
                    onClick={handleStartEnable2FA}
                    disabled={sendingOTP}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-500 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    {sendingOTP ? (
                      <><Loader2 size={15} className="animate-spin" /> Sending Code...</>
                    ) : (
                      "Enable 2FA"
                    )}
                  </button>
                )}

                {/* 2FA Verification Form */}
                {show2FAModal && (
                  <div className="mt-4 p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-4 animate-fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-600 text-white flex items-center gap-2">
                          <Shield size={16} className="text-indigo-400" />
                          Verify Email to Enable 2FA
                        </h4>
                        <p className="text-xs text-white/60 mt-1">
                          We sent a 6-digit verification code to <strong>{user?.email}</strong>. Enter it below to finish enabling 2FA.
                        </p>
                      </div>
                      <button onClick={() => setShow2FAModal(false)} className="text-white/40 hover:text-white">
                        <XIcon size={16} />
                      </button>
                    </div>

                    {otpError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        {otpError}
                      </div>
                    )}

                    <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3">
                      <div>
                        <label className="text-xs font-500 text-white/70 block mb-1">6-Digit Verification Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full px-4 py-2.5 rounded-lg bg-black/40 border border-white/20 text-white text-center text-lg tracking-[0.5em] font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={verifyingOTP || otpInput.length < 6}
                          className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {verifyingOTP ? "Verifying..." : "Verify & Enable 2FA"}
                        </button>
                        <button
                          type="button"
                          onClick={handleStartEnable2FA}
                          disabled={sendingOTP}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Resend Code
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}



          {/* API Keys Section (Admin Only) */}
          {section === "apikeys" && isAdminUser && (
            <ApiKeySettings />
          )}

          {/* Save Button */}
          {section !== "connections" && section !== "apikeys" && (
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              {saved && <span className="text-sm text-emerald-400 font-500">✓ Changes saved</span>}
              <div className="ml-auto">
                <button
                  onClick={handleSave}
                  className="btn-gradient px-6 py-2.5 rounded-lg text-sm font-600 flex items-center gap-2"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
