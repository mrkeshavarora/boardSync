import AppShell from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { User as UserIcon, Mail, Phone, Briefcase, Building, Shield, Clock, Calendar, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "User Profile | BoardSync" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  await connectDB();
  const dbUser = await User.findOne({ email: session.user.email }).lean();

  if (!dbUser) redirect("/login");

  const roleLabel = (dbUser.role ?? "user").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const statusColor = dbUser.status === "active" ? "bg-emerald-500" : dbUser.status === "pending" ? "bg-amber-500" : "bg-red-500";

  return (
    <AppShell title="Profile">
      <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
        {/* Header Card */}
        <div className="p-8 rounded-3xl border border-white/[0.06] flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden" style={{ background: "var(--bg-card)" }}>
          {/* Decorative background blur */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center text-4xl font-700 text-white shadow-2xl" style={{ background: "var(--gradient-brand)" }}>
              {dbUser.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dbUser.avatar} alt={dbUser.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                getInitials(dbUser.name)
              )}
            </div>
            <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-[#0a0f1e] ${statusColor}`} title={`Status: ${dbUser.status}`} />
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl font-700 text-white mb-2">{dbUser.name}</h1>
            <p className="text-white/60 text-lg mb-4">{dbUser.title || "Board Member"} • {dbUser.department || "BoardSync Corp"}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-600 flex items-center gap-1.5">
                <ShieldCheck size={16} />
                {roleLabel}
              </span>
              <a href={`mailto:${dbUser.email}`} className="px-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white transition-all text-sm font-500 flex items-center gap-2">
                <Mail size={16} />
                Email
              </a>
              <a href="/settings" className="px-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:text-white transition-all text-sm font-500 flex items-center gap-2">
                Edit Profile
              </a>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="p-6 rounded-3xl border border-white/[0.06] space-y-6" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-lg font-600 text-white flex items-center gap-2">
              <UserIcon size={18} className="text-indigo-400" />
              Contact Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Email Address</p>
                  <p className="text-sm text-white font-500">{dbUser.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Phone Number</p>
                  <p className="text-sm text-white font-500">{dbUser.phone || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Briefcase size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Job Title</p>
                  <p className="text-sm text-white font-500">{dbUser.title || "Not provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Building size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Organization</p>
                  <p className="text-sm text-white font-500">{dbUser.department || "Not provided"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="p-6 rounded-3xl border border-white/[0.06] space-y-6" style={{ background: "var(--bg-card)" }}>
            <h2 className="text-lg font-600 text-white flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" />
              Account Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Role & Permissions</p>
                  <p className="text-sm text-white font-500">{roleLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Member Since</p>
                  <p className="text-sm text-white font-500">
                    {dbUser.createdAt ? new Date(dbUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-500 uppercase tracking-wider mb-0.5">Last Login</p>
                  <p className="text-sm text-white font-500">
                    {dbUser.lastLogin ? new Date(dbUser.lastLogin).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
