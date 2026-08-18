"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Shield, Clock, Users, FileText, BarChart3,
  CheckCircle2, Zap, Globe, Lock, ChevronRight, Star, Menu, X, Calendar
} from "lucide-react";

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setCount(target); clearInterval(timer); }
        else setCount(Math.floor(start));
      }, 16);
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon, title, desc, gradient, delay
}: {
  icon: React.ElementType; title: string; desc: string; gradient: string; delay: string;
}) {
  return (
    <div
      className="group glass glass-hover p-6 rounded-2xl transition-all duration-500"
      style={{ animationDelay: delay }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${gradient} shadow-lg shadow-indigo-500/20`}>
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="text-base font-700 text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function Testimonial({ quote, name, role, avatar }: { quote: string; name: string; role: string; avatar: string }) {
  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
      </div>
      <p className="text-sm text-white/70 leading-relaxed italic">"{quote}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-700 shadow-md shadow-purple-500/20">
          {avatar}
        </div>
        <div>
          <div className="text-sm font-600 text-white">{name}</div>
          <div className="text-xs text-white/40">{role}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const FEATURES = [
    {
      icon: Calendar, title: "Smart Meeting Management",
      desc: "Schedule, organize and run board meetings with multi-step wizards, agenda builder, and participant management.",
      gradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
    },
    {
      icon: FileText, title: "Digital Minutes & Resolutions",
      desc: "Draft, review, and approve meeting minutes with a rich editor. Track resolutions and voting outcomes in real-time.",
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    },
    {
      icon: CheckCircle2, title: "Action Item Tracking",
      desc: "Assign, monitor and report on follow-up tasks. Never let a board decision fall through the cracks again.",
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    },
    {
      icon: BarChart3, title: "Analytics & Reporting",
      desc: "Powerful dashboards with attendance rates, completion metrics, and executive-ready PDF reports.",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
    {
      icon: Shield, title: "Enterprise Security & RBAC",
      desc: "Role-based access control with granular permissions. Every action is audit-logged for compliance.",
      gradient: "bg-gradient-to-br from-red-500 to-rose-600",
    },
    {
      icon: Globe, title: "Document Management",
      desc: "Secure cloud storage for board packs, minutes, and resolutions with versioning and controlled access.",
      gradient: "bg-gradient-to-br from-purple-500 to-pink-600",
    },
  ];

  const STATS = [
    { value: 500, suffix: "+", label: "Boards Worldwide" },
    { value: 98, suffix: "%", label: "Uptime SLA" },
    { value: 12000, suffix: "+", label: "Meetings Managed" },
    { value: 40, suffix: "%", label: "Time Saved" },
  ];

  const TESTIMONIALS = [
    {
      quote: "BoardSync transformed how we run our board meetings. The minutes editor alone saves our secretary 3 hours per meeting.",
      name: "Alexandra Chen", role: "Chairperson, TechVentures", avatar: "A",
    },
    {
      quote: "The action item tracking has dramatically improved our follow-through rate. We went from 60% to 94% completion.",
      name: "James Miller", role: "CFO, Global Capital", avatar: "J",
    },
    {
      quote: "Finally a board management tool that feels modern. The interface is beautiful and everything is where you'd expect it.",
      name: "Sarah Kim", role: "Board Secretary, Innovate Corp", avatar: "S",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Ambient Background Orbs ───────────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(79,70,229,0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* ── Navbar ────────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/[0.06]" : ""}`}
        style={{ background: scrolled ? "rgba(10,15,30,0.9)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{ background: "var(--gradient-brand)" }}>
              <span className="text-white font-800 text-sm">B</span>
            </div>
            <span className="text-white font-700 text-lg tracking-tight">BoardSync</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it Works", "Testimonials"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-white/60 hover:text-white transition-colors font-500">
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"
              className="px-4 py-2 rounded-lg text-sm font-500 text-white/70 hover:text-white hover:bg-white/[0.06] transition-all">
              Sign In
            </Link>
            <Link href="/login"
              className="btn-gradient px-5 py-2 rounded-lg text-sm font-600 flex items-center gap-2 shadow-lg shadow-indigo-500/25">
              Get Started <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.06] px-6 py-4 space-y-4"
            style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(20px)" }}>
            {["Features", "How it Works", "Testimonials"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-white/60 hover:text-white transition-colors font-500 py-2">
                {item}
              </a>
            ))}
            <Link href="/login"
              className="block btn-gradient px-5 py-3 rounded-lg text-sm font-600 text-center shadow-lg shadow-indigo-500/25">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-600 text-indigo-300">Now with AI-assisted minutes generation</span>
            <ChevronRight size={13} className="text-indigo-400" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-800 leading-[1.1] tracking-tight mb-6"
            style={{ letterSpacing: "-0.02em" }}>
            <span className="text-white">The Boardroom,</span>
            <br />
            <span className="gradient-text">Reimagined.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            BoardSync is the all-in-one platform for modern governance. Manage meetings, minutes,
            resolutions, and action items — securely, efficiently, beautifully.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/login"
              className="btn-gradient px-8 py-4 rounded-xl text-base font-700 flex items-center gap-2.5 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105">
              Start Free Trial <ArrowRight size={18} />
            </Link>
            <Link href="/login"
              className="group px-8 py-4 rounded-xl text-base font-600 text-white/70 hover:text-white border border-white/[0.1] hover:border-white/[0.2] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex items-center gap-2">
              <Lock size={16} className="text-white/40 group-hover:text-white/70 transition-colors" />
              Sign In to Dashboard
            </Link>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/30 font-500">
            {["No credit card required", "SOC 2 Compliant", "GDPR Ready", "99.8% Uptime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Dashboard Preview ────────────────────────────────────────────────── */}
        <div className="mt-20 max-w-6xl mx-auto relative">
          {/* Glow behind card */}
          <div className="absolute inset-x-0 top-10 h-64 rounded-3xl opacity-30"
            style={{ background: "var(--gradient-brand)", filter: "blur(80px)" }} />
          
          {/* Browser chrome */}
          <div className="relative rounded-2xl border border-white/[0.12] overflow-hidden shadow-2xl shadow-black/60"
            style={{ background: "#0d1526" }}>
            {/* Browser top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="mx-auto px-4 py-1 rounded-lg text-xs text-white/30 border border-white/[0.06]"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                app.boardsync.io/dashboard
              </div>
            </div>

            {/* Mock dashboard UI */}
            <div className="flex h-[380px] sm:h-[480px]">
              {/* Sidebar */}
              <div className="w-14 sm:w-52 border-r border-white/[0.06] p-3 flex flex-col gap-2 shrink-0"
                style={{ background: "rgba(8,13,26,0.9)" }}>
                <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
                  <div className="w-6 h-6 rounded-md shrink-0" style={{ background: "var(--gradient-brand)" }} />
                  <span className="text-xs font-700 text-white hidden sm:block">BoardSync</span>
                </div>
                {[
                  { color: "bg-indigo-500", w: "w-3/4", active: true },
                  { color: "bg-white/10", w: "w-2/3", active: false },
                  { color: "bg-white/10", w: "w-4/5", active: false },
                  { color: "bg-white/10", w: "w-3/5", active: false },
                  { color: "bg-white/10", w: "w-2/3", active: false },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${item.active ? "bg-indigo-500/10" : ""}`}>
                    <div className={`w-4 h-4 rounded shrink-0 ${item.active ? item.color : "bg-white/10"}`} />
                    <div className={`h-2 rounded ${item.w} hidden sm:block ${item.active ? "bg-indigo-400/60" : "bg-white/10"}`} />
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-hidden">
                {/* KPI Row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { grad: "from-indigo-500/20 to-purple-500/10", border: "border-indigo-500/20" },
                    { grad: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/20" },
                    { grad: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/20" },
                    { grad: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/20" },
                  ].map((c, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${c.border} bg-gradient-to-br ${c.grad}`}>
                      <div className="h-2 w-3/4 rounded bg-white/10 mb-2" />
                      <div className="h-4 w-1/2 rounded bg-white/20" />
                    </div>
                  ))}
                </div>

                {/* Meeting cards */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-white/[0.06] space-y-3" style={{ background: "rgba(17,24,39,0.8)" }}>
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-2/3 rounded bg-white/20" />
                        <div className="h-4 w-14 rounded-full bg-indigo-500/20 border border-indigo-500/20" />
                      </div>
                      <div className="h-2 w-full rounded bg-white/10" />
                      <div className="h-2 w-4/5 rounded bg-white/10" />
                      <div className="flex gap-2 pt-1">
                        {[0, 1, 2].map((j) => (
                          <div key={j} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/10 -ml-1 first:ml-0" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agenda list mockup */}
                <div className="p-4 rounded-xl border border-white/[0.06]" style={{ background: "rgba(17,24,39,0.8)" }}>
                  {[{ w: "w-5/6" }, { w: "w-3/4" }, { w: "w-4/5" }].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <div className="w-4 h-4 rounded border border-indigo-500/40 shrink-0" />
                      <div className={`h-2 ${r.w} rounded bg-white/10`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/[0.06]"
        style={{ background: "rgba(17,24,39,0.5)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-800 gradient-text">
                <AnimCounter target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm text-white/40 mt-1 font-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 mb-4">
              <Zap size={13} className="text-purple-400" />
              <span className="text-xs font-600 text-purple-300">Everything your board needs</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-800 text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Built for modern governance
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base">
              From scheduling to sign-off, every step of your board process is covered in one elegant platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={`${i * 80}ms`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6"
        style={{ background: "rgba(17,24,39,0.4)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-800 text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              From invite to archive in minutes
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base">A streamlined workflow that your entire board will love.</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(79,70,229,0.4), transparent)" }} />

            <div className="space-y-12">
              {[
                {
                  step: "01", title: "Schedule & Invite",
                  desc: "Create a meeting with the step-by-step wizard. Set the agenda, invite participants, and attach board packs.",
                  side: "left", icon: Clock,
                },
                {
                  step: "02", title: "Run the Meeting",
                  desc: "Work through the agenda live. Record attendance, capture decisions, and assign action items on the spot.",
                  side: "right", icon: Users,
                },
                {
                  step: "03", title: "Draft & Approve Minutes",
                  desc: "The secretary drafts minutes in the rich editor. Board members review and the chair approves in one click.",
                  side: "left", icon: FileText,
                },
                {
                  step: "04", title: "Track & Report",
                  desc: "Monitor action items to completion and generate board-ready reports with attendance and resolution summaries.",
                  side: "right", icon: BarChart3,
                },
              ].map(({ step, title, desc, side, icon: Icon }) => (
                <div key={step} className={`lg:grid lg:grid-cols-2 lg:gap-16 items-center ${side === "right" ? "lg:direction-rtl" : ""}`}>
                  <div className={side === "right" ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-5xl font-800 opacity-10 text-white">{step}</span>
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <Icon size={20} className="text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-700 text-white mb-2">{title}</h3>
                    <p className="text-white/50 leading-relaxed">{desc}</p>
                  </div>
                  <div className={`hidden lg:block ${side === "right" ? "lg:order-1" : ""}`}>
                    <div className="h-32 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.02] to-transparent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-800 text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
              Loved by boards everywhere
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">Join hundreds of organizations that trust BoardSync for their governance.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => <Testimonial key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative p-10 sm:p-16 rounded-3xl overflow-hidden"
            style={{ background: "rgba(17,24,39,0.9)", border: "1px solid rgba(79,70,229,0.25)" }}>
            {/* Orb inside CTA */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(79,70,229,0.15) 0%, transparent 70%)" }} />
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 mx-auto shadow-lg"
                style={{ background: "var(--gradient-brand)" }}>
                <Shield size={24} className="text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-800 text-white mb-4" style={{ letterSpacing: "-0.02em" }}>
                Ready to modernize your board?
              </h2>
              <p className="text-white/50 mb-8 text-base">
                Join forward-thinking organizations that run more effective, efficient board meetings with BoardSync.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login"
                  className="btn-gradient px-8 py-4 rounded-xl text-base font-700 flex items-center gap-2.5 shadow-2xl shadow-indigo-500/30 w-full sm:w-auto justify-center hover:scale-105 transition-all duration-300">
                  Get Started Free <ArrowRight size={18} />
                </Link>
              </div>
              <p className="text-xs text-white/30 mt-4">No credit card required · Free 30-day trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-10 px-6"
        style={{ background: "rgba(8,13,26,0.8)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <span className="text-white font-800 text-xs">B</span>
            </div>
            <span className="text-white font-700">BoardSync</span>
          </div>
          <p className="text-xs text-white/30">© {new Date().getFullYear()} BoardSync. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-white/40">
            <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/70 transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

