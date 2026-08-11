"use client";

import { useState, useEffect, useMemo } from "react";
import { User, Bell, Shield, Palette, Globe, Save, Eye, EyeOff, Users, Check, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsSection = "profile" | "connections" | "notifications" | "security" | "appearance";

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
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme & display preferences" },
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
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-500 text-white/80">{label}</label>
      {children}
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors";

export default function SettingsPanel({ user }: { user: { name?: string | null; email?: string | null; title?: string | null; department?: string | null; bio?: string | null } }) {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail] = useState(user?.email ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

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
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="lg:w-64 shrink-0">
          <div className="p-2 rounded-2xl border border-white/[0.06] space-y-1" style={{ background: "var(--bg-card)" }}>
            {NAV_ITEMS.map((item) => {
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  <item.icon size={18} className={isActive ? "text-indigo-400" : "text-white/30"} />
                  <div>
                    <div className="text-sm font-600">{item.label}</div>
                    <div className="text-xs opacity-60">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6 rounded-2xl border border-white/[0.06] space-y-6" style={{ background: "var(--bg-card)" }}>
          {/* Profile Section */}
          {section === "profile" && (
            <>
              <div>
                <h2 className="text-lg font-600 text-white">Profile Information</h2>
                <p className="text-sm text-white/50 mt-1">Update your personal details</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-700 shadow-lg shadow-indigo-500/20">
                  {profileName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <button className="px-3 py-2 rounded-lg text-sm font-500 text-white/80 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition-colors">
                    Change Avatar
                  </button>
                  <p className="text-xs text-white/30 mt-1.5">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="Full Name" id="fullName">
                  <input
                    id="fullName"
                    className={inputClass}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your full name"
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
                <textarea id="bio" rows={3} className={cn(inputClass, "resize-none")} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself..." />
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
                    <div className="space-y-4">
                      <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">Incoming Requests ({incomingRequests.length})</h3>
                      <div className="space-y-2">
                        {incomingRequests.map(conn => (
                          <div key={conn.connectionId} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div>
                              <div className="text-sm font-500 text-white">{conn.name}</div>
                              <div className="text-xs text-white/40">{conn.email} • {conn.role}</div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleAcceptConnection(conn.id)} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 text-xs font-500 transition-colors flex items-center gap-1.5">
                                <Check size={14} /> Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accepted Connections */}
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">My Connections ({acceptedConnections.length})</h3>
                    {acceptedConnections.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-white/[0.1] rounded-xl text-sm text-white/30">
                        You have no connections yet. Add them when creating a meeting!
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {acceptedConnections.map(conn => (
                          <div key={conn.connectionId} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-600 text-white">
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
                    <div className="space-y-4">
                      <h3 className="text-xs uppercase tracking-widest text-white/40 font-600">Sent Requests ({outgoingRequests.length})</h3>
                      <div className="space-y-2 opacity-70">
                        {outgoingRequests.map(conn => (
                          <div key={conn.connectionId} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="text-sm font-500 text-white">{conn.name}</div>
                            <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-white/50">Pending</span>
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
                <h2 className="text-lg font-600 text-white">Notification Preferences</h2>
                <p className="text-sm text-white/50 mt-1">Control how and when you receive notifications</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-white/30 font-600 mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    {[
                      { key: "emailMeetingReminders", label: "Meeting Reminders", desc: "Reminders 24h and 1h before meetings" },
                      { key: "emailRsvp", label: "RSVP Requests", desc: "When you are invited to a meeting" },
                      { key: "emailMinutes", label: "Approved Minutes", desc: "When meeting minutes are approved" },
                      { key: "emailActionItems", label: "Action Item Alerts", desc: "Overdue and newly assigned actions" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                        <div>
                          <div className="text-sm font-500 text-white">{label}</div>
                          <div className="text-xs text-white/40">{desc}</div>
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
                  <h3 className="text-xs uppercase tracking-widest text-white/30 font-600 mb-4">In-App Notifications</h3>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-500 text-white">All In-App Notifications</div>
                      <div className="text-xs text-white/40">Show notifications inside the app</div>
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
                    <div className="text-xs text-white/40 mt-0.5">Add an extra layer of security</div>
                  </div>
                  <span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Not Enabled</span>
                </div>
                <button className="mt-3 px-4 py-2 rounded-lg text-sm font-500 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                  Enable 2FA
                </button>
              </div>
            </>
          )}

          {/* Appearance Section */}
          {section === "appearance" && (
            <>
              <div>
                <h2 className="text-lg font-600 text-white">Appearance</h2>
                <p className="text-sm text-white/50 mt-1">Customize your interface preferences</p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-white/30 font-600 mb-4">Display Density</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(["comfortable", "compact"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          density === d
                            ? "border-indigo-500/50 bg-indigo-500/10"
                            : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className={cn("text-sm font-600 capitalize mb-1", density === d ? "text-indigo-400" : "text-white")}>{d}</div>
                        <div className="text-xs text-white/40">
                          {d === "comfortable" ? "More spacing, easier to read" : "Tighter layout, see more content"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-white/30 font-600 mb-4">Language & Region</h3>
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-white/40 shrink-0" />
                    <select className={cn(inputClass, "flex-1")}>
                      <option value="en">English (US)</option>
                      <option value="en-gb">English (UK)</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          {section !== "connections" && (
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
