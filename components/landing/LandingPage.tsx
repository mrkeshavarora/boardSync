"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Shield, Clock, Users, FileText, BarChart3,
  CheckCircle2, Zap, Globe, Lock, ChevronRight, Star, Menu, X, Calendar,
  Sun, Moon, Sparkles, CheckSquare, ShieldCheck, Search, Plus
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
  icon: Icon, title, desc, gradient, delay, isLight
}: {
  icon: React.ElementType; title: string; desc: string; gradient: string; delay: string; isLight: boolean;
}) {
  return (
    <div
      className="group glass glass-hover p-6 rounded-2xl transition-all duration-500"
      style={{ animationDelay: delay }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 ${gradient} shadow-lg shadow-indigo-500/20`}>
        <Icon size={22} className="text-white keep-white" />
      </div>
      <h3 className={`text-base font-700 mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-white/50"}`}>{desc}</p>
    </div>
  );
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
function Testimonial({ quote, name, role, avatar, isLight }: { quote: string; name: string; role: string; avatar: string; isLight: boolean }) {
  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
      </div>
      <p className={`text-sm leading-relaxed italic ${isLight ? "text-slate-700" : "text-white/70"}`}>"{quote}"</p>
      <div className={`flex items-center gap-3 pt-2 border-t ${isLight ? "border-slate-200" : "border-white/[0.06]"}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white keep-white text-sm font-700 shadow-md shadow-purple-500/20">
          {avatar}
        </div>
        <div>
          <div className={`text-sm font-600 ${isLight ? "text-slate-900" : "text-white"}`}>{name}</div>
          <div className={`text-xs ${isLight ? "text-slate-500" : "text-white/40"}`}>{role}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const currentTheme = (document.documentElement.getAttribute("data-theme") || localStorage.getItem("theme") || "dark") as "dark" | "light";
    setTheme(currentTheme);

    const handleThemeChange = () => {
      const updatedTheme = (document.documentElement.getAttribute("data-theme") || "dark") as "dark" | "light";
      setTheme(updatedTheme);
    };

    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    window.dispatchEvent(new Event("themechange"));
  };

  const isLight = theme === "light";

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
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--bg-primary)", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Ambient Background Orbs ───────────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        <div className={`absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full transition-opacity duration-300 ${isLight ? "opacity-30" : "opacity-25"}`}
          style={{ background: isLight ? "radial-gradient(circle, rgba(253,224,71,0.2) 0%, rgba(252,231,243,0.4) 40%, transparent 70%)" : "radial-gradient(circle, rgba(79,70,229,0.45) 0%, transparent 70%)", filter: "blur(70px)" }} />
        <div className={`absolute top-1/3 -right-40 w-[550px] h-[550px] rounded-full transition-opacity duration-300 ${isLight ? "opacity-25" : "opacity-20"}`}
          style={{ background: isLight ? "radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(192,132,252,0.3) 50%, transparent 70%)" : "radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)", filter: "blur(70px)" }} />
        <div className={`absolute bottom-0 left-1/3 w-[450px] h-[450px] rounded-full transition-opacity duration-300 ${isLight ? "opacity-20" : "opacity-12"}`}
          style={{ background: isLight ? "radial-gradient(circle, rgba(244,114,182,0.25) 0%, rgba(167,139,250,0.25) 50%, transparent 70%)" : "radial-gradient(circle, rgba(168,85,247,0.45) 0%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      {/* ── Floating Island Navbar ────────────────────────────────────────────── */}
      <nav className={`fixed top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-50 transition-all duration-300 rounded-2xl ${
        scrolled 
          ? (isLight 
              ? "bg-white/85 border border-slate-200/90 shadow-lg shadow-slate-200/50 backdrop-blur-xl" 
              : "bg-[#0d1527]/85 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl") 
          : (isLight 
              ? "bg-white/60 border border-slate-200/60 backdrop-blur-md" 
              : "bg-white/[0.03] border border-white/[0.08] backdrop-blur-md")
      }`}>
        <div className="px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105"
              style={{ background: "var(--gradient-brand)" }}>
              <span className="text-white keep-white font-800 text-sm">B</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-700 text-base tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>BoardSync</span>
              <span className="text-[9px] font-800 px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-500 border border-indigo-500/20">v2.4 AI</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-500/5 p-1 rounded-xl border border-white/5">
            {["Features", "How it Works", "Testimonials"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-all font-600 ${
                  isLight 
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}>
                {item}
              </a>
            ))}
          </div>

          {/* CTA & Theme Switcher */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isLight
                  ? "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                  : "bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:bg-white/15"
              }`}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link href="/login"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-600 transition-all ${
                isLight 
                  ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100" 
                  : "text-white/80 hover:text-white hover:bg-white/[0.08]"
              }`}>
              Sign In
            </Link>

            <Link href="/login"
              className="btn-gradient px-4 py-1.5 rounded-xl text-xs font-600 flex items-center gap-1.5 shadow-md shadow-indigo-500/25 group">
              <span>Get Started</span>
              <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isLight
                  ? "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900"
                  : "bg-white/[0.06] border border-white/10 text-white/70 hover:text-white"
              }`}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button className={`p-1.5 rounded-xl ${isLight ? "text-slate-700 hover:text-slate-900 bg-slate-100" : "text-white/70 hover:text-white bg-white/5"}`} onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className={`md:hidden border-t px-5 py-4 space-y-3 rounded-b-2xl ${
            isLight ? "border-slate-200 bg-white/95" : "border-white/10 bg-[#0d1527]/95"
          }`} style={{ backdropFilter: "blur(20px)" }}>
            {["Features", "How it Works", "Testimonials"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMobileOpen(false)}
                className={`block text-xs font-600 transition-colors py-2 px-1 ${
                  isLight ? "text-slate-700 hover:text-slate-900" : "text-white/80 hover:text-white"
                }`}>
                {item}
              </a>
            ))}
            <Link href="/login"
              className="block btn-gradient px-4 py-2.5 rounded-xl text-xs font-600 text-center shadow-md shadow-indigo-500/25">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto relative">

          {/* Floating Card Left (Upcoming Board Meeting) */}
          <div className={`hidden lg:flex absolute -left-6 top-10 z-20 p-3.5 rounded-2xl border shadow-xl animate-float-slow backdrop-blur-xl items-center gap-3 max-w-[240px] ${
            isLight ? "bg-white/90 border-slate-200 shadow-slate-200/60" : "bg-[#0d1527]/90 border-white/10 shadow-black/60"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-sm">
              <Calendar size={18} className="keep-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-700 uppercase tracking-wider text-emerald-500">Board Live</span>
              </div>
              <p className={`text-xs font-700 truncate ${isLight ? "text-slate-900" : "text-white"}`}>Strategy & Governance Meeting</p>
              <p className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>8 Directors Connected</p>
            </div>
          </div>

          {/* Floating Card Right (AI Minutes Ready) */}
          <div className={`hidden lg:flex absolute -right-6 top-24 z-20 p-3.5 rounded-2xl border shadow-xl animate-float-delayed backdrop-blur-xl items-center gap-3 max-w-[240px] ${
            isLight ? "bg-white/90 border-slate-200 shadow-slate-200/60" : "bg-[#0d1527]/90 border-white/10 shadow-black/60"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 text-white shadow-sm">
              <FileText size={18} className="keep-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Sparkles size={11} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-700 uppercase tracking-wider text-amber-500">AI Generated</span>
              </div>
              <p className={`text-xs font-700 truncate ${isLight ? "text-slate-900" : "text-white"}`}>Minutes & Resolutions</p>
              <p className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>Chair Approved • 3 Actions</p>
            </div>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            {/* Announcement Badge */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6 transition-all duration-300 hover:scale-105 cursor-pointer animate-hero-fade-up ${
              isLight 
                ? "border-indigo-200/80 bg-indigo-50/80 text-indigo-700 shadow-2xs backdrop-blur-sm" 
                : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
            }`}>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              <span className="text-xs font-600 tracking-wide">BoardSync 2.0 — Next-Gen AI Minutes & Governance</span>
              <ChevronRight size={13} className="text-indigo-500" />
            </div>

            {/* Soft, smaller, elegant Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-800 leading-[1.12] tracking-tight mb-5 animate-hero-fade-up" style={{ animationDelay: "100ms" }}>
              <span className={isLight ? "text-slate-800/90" : "text-white/95"}>The Boardroom,</span>
              <br />
              <span className="gradient-text-animated font-800">Reimagined.</span>
            </h1>

            {/* Soft Sub-headline */}
            <p className={`text-sm sm:text-base lg:text-lg max-w-xl mx-auto mb-8 leading-relaxed font-400 animate-hero-fade-up ${
              isLight ? "text-slate-500/90" : "text-white/60"
            }`} style={{ animationDelay: "200ms" }}>
              The complete platform for modern corporate governance. Schedule meetings, draft minutes with AI, vote on resolutions, and track action items — all in one secure space.
            </p>

            {/* Interactive Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-hero-fade-up" style={{ animationDelay: "300ms" }}>
              {[
                { icon: Shield, label: "Bank-Grade Encryption" },
                { icon: Sparkles, label: "AI Minutes Builder" },
                { icon: FileText, label: "1-Click Board Packs" },
                { icon: CheckCircle2, label: "Action Item Audit Trail" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-500 border transition-all duration-300 hover:scale-105 ${
                    isLight
                      ? "bg-white/80 border-slate-200/80 text-slate-600 shadow-2xs hover:border-indigo-300 hover:text-indigo-600"
                      : "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08]"
                  }`}
                >
                  <chip.icon size={13} className="text-indigo-500" />
                  {chip.label}
                </span>
              ))}
            </div>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-12 animate-hero-fade-up" style={{ animationDelay: "400ms" }}>
              <Link href="/login"
                className="btn-gradient px-7 py-3.5 rounded-2xl text-sm font-700 flex items-center gap-2 shadow-xl shadow-purple-500/25 hover:scale-105 transition-all duration-300 w-full sm:w-auto justify-center group">
                <span>Start Free Trial</span>
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              <Link href="/login"
                className={`group px-7 py-3.5 rounded-2xl text-sm font-600 border transition-all duration-300 hover:scale-105 w-full sm:w-auto justify-center flex items-center gap-2 ${
                  isLight 
                    ? "bg-white/90 border-slate-200/90 text-slate-700 hover:bg-white shadow-2xs hover:border-slate-300" 
                    : "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08]"
                }`}>
                <Lock size={15} className={isLight ? "text-slate-400 group-hover:text-slate-600" : "text-white/40 group-hover:text-white/70"} />
                <span>Sign In to Dashboard</span>
              </Link>
            </div>
          </div>

          {/* ── Dashboard Preview ────────────────────────────────────────────────── */}
          <div className="mt-16 max-w-6xl mx-auto relative">
            {/* Ambient Glow behind browser window */}
            <div className={`absolute inset-x-0 top-10 h-72 rounded-3xl transition-opacity duration-300 ${isLight ? "opacity-20" : "opacity-35"}`}
              style={{ background: "var(--gradient-brand)", filter: "blur(90px)" }} />
            
            {/* Browser Chrome Window Frame */}
            <div className={`relative rounded-2xl border overflow-hidden transition-all duration-300 shadow-2xl ${
              isLight 
                ? "border-slate-200/90 bg-slate-50 shadow-slate-300/70" 
                : "border-white/10 bg-[#0b1324] shadow-black/80"
            }`}>
              {/* Browser top bar */}
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isLight ? "bg-slate-100/90 border-slate-200" : "bg-white/[0.03] border-white/[0.06]"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/70" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 ml-4">
                    <span className={`text-[11px] font-600 ${isLight ? "text-slate-400" : "text-white/30"}`}>BoardSync Workspace</span>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-4 py-1 rounded-lg text-xs border ${
                  isLight 
                    ? "bg-white text-slate-600 border-slate-200 shadow-2xs" 
                    : "bg-white/[0.04] text-white/50 border-white/[0.08]"
                }`}>
                  <Lock size={11} className="text-emerald-500" />
                  <span>app.boardsync.io/dashboard</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`text-[11px] font-600 ${isLight ? "text-slate-600" : "text-white/60"}`}>Live Sync</span>
                </div>
              </div>

              {/* Mock Dashboard App Interface */}
              <div className="flex min-h-[460px] sm:min-h-[540px]">
                {/* App Sidebar */}
                <div className={`w-16 sm:w-56 border-r p-3 flex flex-col justify-between shrink-0 ${
                  isLight 
                    ? "bg-white border-slate-200" 
                    : "bg-[#080e1b] border-white/[0.06]"
                }`}>
                  <div className="space-y-4">
                    {/* Workspace Switcher */}
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/[0.06]"
                    }`}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 font-800 text-xs shadow-sm"
                        style={{ background: "var(--gradient-brand)" }}>
                        B
                      </div>
                      <div className="hidden sm:block min-w-0 flex-1 text-left">
                        <p className={`text-xs font-700 truncate ${isLight ? "text-slate-900" : "text-white"}`}>Acme Corp Board</p>
                        <p className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>Enterprise Tier</p>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-1">
                      {[
                        { icon: BarChart3, label: "Dashboard", active: true, count: null },
                        { icon: Calendar, label: "Meetings", active: false, count: "3" },
                        { icon: FileText, label: "Minutes & PDF", active: false, count: "2" },
                        { icon: CheckSquare, label: "Action Items", active: false, count: "5" },
                        { icon: ShieldCheck, label: "Compliance", active: false, count: null },
                      ].map((nav) => (
                        <div key={nav.label} className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-600 transition-all ${
                          nav.active
                            ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                            : (isLight 
                                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" 
                                : "text-white/50 hover:text-white hover:bg-white/[0.04]")
                        }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <nav.icon size={16} className={nav.active ? "text-indigo-500" : (isLight ? "text-slate-500" : "text-white/40")} />
                            <span className="hidden sm:inline truncate">{nav.label}</span>
                          </div>
                          {nav.count && (
                            <span className={`hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-700 rounded-full ${
                              nav.active
                                ? "bg-indigo-500 text-white"
                                : (isLight ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white/70")
                            }`}>
                              {nav.count}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User Card inside Sidebar Footer */}
                  <div className={`hidden sm:flex items-center gap-2.5 p-2 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/[0.06]"
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-700 shadow-sm shrink-0">
                      AC
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`text-xs font-700 truncate ${isLight ? "text-slate-900" : "text-white"}`}>Alexandra Chen</p>
                      <p className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-white/40"}`}>Board Chair</p>
                    </div>
                  </div>
                </div>

                {/* Main App Workspace */}
                <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-hidden text-left">
                  {/* App Top Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
                    <div>
                      <h2 className={`text-sm sm:text-base font-800 tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                        Board Management Overview
                      </h2>
                      <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/40"}`}>
                        Welcome back, Alexandra. Here is your board's active status.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`relative flex items-center hidden md:flex ${
                        isLight ? "bg-white border-slate-200" : "bg-white/[0.04] border-white/[0.08]"
                      } border rounded-lg px-2.5 py-1 text-xs`}>
                        <Search size={13} className={isLight ? "text-slate-400" : "text-white/30"} />
                        <input 
                          type="text" 
                          readOnly 
                          value="Search meetings..." 
                          className={`bg-transparent border-0 outline-none text-xs ml-1.5 w-32 ${isLight ? "text-slate-700" : "text-white/70"}`}
                        />
                      </div>

                      <button className="btn-gradient px-3 py-1.5 rounded-lg text-xs font-600 flex items-center gap-1.5 shadow-sm">
                        <Plus size={13} />
                        <span>New Meeting</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Realistic KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        title: "Next Meeting",
                        value: "Tomorrow 10 AM",
                        sub: "Annual Strategy Review",
                        badge: "8 Confirmed",
                        badgeColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
                        bg: isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]",
                      },
                      {
                        title: "Minutes Drafts",
                        value: "2 Pending",
                        sub: "AI Assisted • Audit Committee",
                        badge: "Chair Approval",
                        badgeColor: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20",
                        bg: isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]",
                      },
                      {
                        title: "Action Items",
                        value: "94.2% Complete",
                        sub: "16 of 17 tasks closed",
                        badge: "+12% MoM",
                        badgeColor: "bg-blue-500/15 text-blue-600 border-blue-500/20",
                        bg: isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]",
                      },
                      {
                        title: "Resolutions",
                        value: "5 Passed",
                        sub: "100% Quorum Recorded",
                        badge: "Verified",
                        badgeColor: "bg-purple-500/15 text-purple-600 border-purple-500/20",
                        bg: isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]",
                      },
                    ].map((kpi, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${kpi.bg}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[11px] font-600 ${isLight ? "text-slate-500" : "text-white/40"}`}>{kpi.title}</span>
                          <span className={`text-[9px] font-700 px-1.5 py-0.2 rounded-md border ${kpi.badgeColor}`}>{kpi.badge}</span>
                        </div>
                        <p className={`text-sm sm:text-base font-800 tracking-tight mb-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                          {kpi.value}
                        </p>
                        <p className={`text-[10px] truncate ${isLight ? "text-slate-500" : "text-white/50"}`}>{kpi.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* 2 Realistic Interactive Meeting Cards */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Card 1 */}
                    <div className={`p-3.5 rounded-xl border space-y-3 ${
                      isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 text-[10px] font-700 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            IN PROGRESS • LIVE
                          </span>
                          <h3 className={`text-xs sm:text-sm font-700 leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                            Board Strategy & Financial Review
                          </h3>
                        </div>
                        <span className={`text-[10px] font-600 ${isLight ? "text-slate-500" : "text-white/40"}`}>Today, 10:00 AM</span>
                      </div>

                      <p className={`text-[11px] leading-relaxed line-clamp-2 ${isLight ? "text-slate-600" : "text-white/50"}`}>
                        Agenda: 1. Financial Approval  2. ESG Compliance Audit  3. Executive Remuneration
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                        <div className="flex items-center gap-1">
                          {["AC", "JM", "SK", "RL"].map((av, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white text-[9px] font-700 text-white flex items-center justify-center -ml-1 first:ml-0 shadow-2xs">
                              {av}
                            </div>
                          ))}
                          <span className={`text-[10px] font-600 ml-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>+4 joined</span>
                        </div>
                        <span className="text-[10px] font-700 text-indigo-500 hover:underline cursor-pointer flex items-center gap-0.5">
                          Join Workspace <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className={`p-3.5 rounded-xl border space-y-3 ${
                      isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 border border-indigo-500/25 text-[10px] font-700 mb-1.5">
                            <Sparkles size={10} className="text-indigo-500" />
                            MINUTES READY FOR CHAIR
                          </span>
                          <h3 className={`text-xs sm:text-sm font-700 leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                            Audit & Compliance Committee Meeting
                          </h3>
                        </div>
                        <span className={`text-[10px] font-600 ${isLight ? "text-slate-500" : "text-white/40"}`}>Yesterday</span>
                      </div>

                      <p className={`text-[11px] leading-relaxed line-clamp-2 ${isLight ? "text-slate-600" : "text-white/50"}`}>
                        Summary: AI generated 6 key findings, 2 voting resolutions passed unanimously.
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                        <div className="flex items-center gap-1">
                          {["JM", "SK"].map((av, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 border border-white text-[9px] font-700 text-white flex items-center justify-center -ml-1 first:ml-0 shadow-2xs">
                              {av}
                            </div>
                          ))}
                          <span className={`text-[10px] font-600 ml-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>3 Members</span>
                        </div>
                        <span className="text-[10px] font-700 text-indigo-500 hover:underline cursor-pointer flex items-center gap-0.5">
                          Review Minutes <ChevronRight size={10} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Items List Table */}
                  <div className={`p-3.5 rounded-xl border ${
                    isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-white/[0.03] border-white/[0.08]"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-xs font-700 ${isLight ? "text-slate-900" : "text-white"}`}>
                        Active Board Action Items
                      </h4>
                      <span className={`text-[10px] font-600 ${isLight ? "text-slate-500" : "text-white/40"}`}>3 Open Tasks</span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { task: "Finalize Financial Audit Sign-off", owner: "James Miller (CFO)", due: "Tomorrow", status: "High Priority", statusClass: "bg-red-500/15 text-red-600 border-red-500/25" },
                        { task: "Revise Executive Governance & Remuneration Policy", owner: "Alexandra Chen", due: "Aug 28", status: "In Review", statusClass: "bg-amber-500/15 text-amber-600 border-amber-500/25" },
                        { task: "Submit ESG Compliance Regulatory Filing", owner: "Sarah Kim", due: "Sep 02", status: "Completed", statusClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25" },
                      ].map((row, i) => (
                        <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                          isLight ? "bg-slate-50 border border-slate-100" : "bg-white/[0.02] border border-white/[0.04]"
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckSquare size={13} className={i === 2 ? "text-emerald-500" : "text-indigo-500"} />
                            <span className={`font-600 truncate ${isLight ? "text-slate-800" : "text-white/90"}`}>{row.task}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className={`text-[10px] hidden sm:inline ${isLight ? "text-slate-500" : "text-white/40"}`}>{row.owner}</span>
                            <span className={`text-[9px] font-700 px-2 py-0.5 rounded-full border ${row.statusClass}`}>
                              {row.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Governance Pillars & Enterprise Standards Section ────────────────── */}
      <section className={`py-16 px-6 border-y transition-colors duration-300 ${
        isLight ? "bg-slate-100/70 border-slate-200" : "bg-[rgba(17,24,39,0.5)] border-white/[0.06]"
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`text-xs font-700 uppercase tracking-widest mb-2 ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              Enterprise Governance Standards
            </h2>
            <p className={`text-xl sm:text-2xl font-800 tracking-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              Everything modern boards need to stay compliant, aligned, and decisive.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Shield,
                title: "Bank-Grade Security",
                desc: "AES-256 encryption, granular RBAC, and SOC 2 compliance to protect confidential discussions.",
                badge: "SOC 2 & GDPR",
                gradient: "from-indigo-500/20 to-purple-500/10",
                iconColor: "text-indigo-400",
                lightBg: "bg-white border-indigo-100 shadow-xs",
              },
              {
                icon: FileText,
                title: "AI Minutes Generation",
                desc: "Transform meeting recordings and notes into structured, chair-approved draft minutes instantly.",
                badge: "AI Powered",
                gradient: "from-blue-500/20 to-cyan-500/10",
                iconColor: "text-blue-400",
                lightBg: "bg-white border-blue-100 shadow-xs",
              },
              {
                icon: CheckCircle2,
                title: "Zero-Drop Action Items",
                desc: "Assign tasks during meetings with automated reminders and real-time execution tracking.",
                badge: "100% Audit Ready",
                gradient: "from-emerald-500/20 to-teal-500/10",
                iconColor: "text-emerald-400",
                lightBg: "bg-white border-emerald-100 shadow-xs",
              },
              {
                icon: Clock,
                title: "1-Click Board Packs",
                desc: "Assemble, review, and distribute agendas, resolutions, and annexures in seconds.",
                badge: "Time Saver",
                gradient: "from-amber-500/20 to-orange-500/10",
                iconColor: "text-amber-400",
                lightBg: "bg-white border-amber-100 shadow-xs",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  isLight
                    ? `${item.lightBg} border-slate-200`
                    : `bg-gradient-to-br ${item.gradient} border-white/[0.08] hover:border-white/[0.15]`
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isLight ? "bg-slate-100 text-slate-800" : "bg-white/[0.06] text-white"
                  }`}>
                    <item.icon size={20} className={item.iconColor} />
                  </div>
                  <span className={`text-[10px] font-700 px-2.5 py-0.5 rounded-full border ${
                    isLight
                      ? "bg-slate-100 text-slate-700 border-slate-200"
                      : "bg-white/[0.06] text-white/70 border-white/[0.1]"
                  }`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className={`text-base font-700 mb-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
                  {item.title}
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-white/50"}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4 ${
              isLight ? "border-purple-200 bg-purple-50" : "border-purple-500/30 bg-purple-500/10"
            }`}>
              <Zap size={13} className={isLight ? "text-purple-600" : "text-purple-400"} />
              <span className={`text-xs font-600 ${isLight ? "text-purple-700" : "text-purple-300"}`}>Everything your board needs</span>
            </div>
            <h2 className={`text-3xl sm:text-4xl font-800 mb-4 ${isLight ? "text-slate-900" : "text-white"}`} style={{ letterSpacing: "-0.02em" }}>
              Built for modern governance
            </h2>
            <p className={`max-w-xl mx-auto text-base ${isLight ? "text-slate-600" : "text-white/50"}`}>
              From scheduling to sign-off, every step of your board process is covered in one elegant platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={`${i * 80}ms`} isLight={isLight} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section id="how-it-works" className={`py-24 px-6 ${
        isLight ? "bg-slate-100/50" : "bg-[rgba(17,24,39,0.4)]"
      }`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-800 mb-4 ${isLight ? "text-slate-900" : "text-white"}`} style={{ letterSpacing: "-0.02em" }}>
              From invite to archive in minutes
            </h2>
            <p className={`max-w-xl mx-auto text-base ${isLight ? "text-slate-600" : "text-white/50"}`}>A streamlined workflow that your entire board will love.</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute left-1/2 top-8 bottom-8 w-px -translate-x-1/2"
              style={{ 
                background: isLight 
                  ? "linear-gradient(to bottom, transparent, rgba(79,70,229,0.3), transparent)" 
                  : "linear-gradient(to bottom, transparent, rgba(79,70,229,0.4), transparent)" 
              }} />

            <div className="space-y-12">
              {[
                {
                  step: "01",
                  title: "Schedule & Invite",
                  desc: "Create a meeting with the step-by-step wizard. Set the agenda, invite participants, and attach board packs with automatic notifications.",
                  side: "left",
                  icon: Clock,
                  mockup: (
                    <div className={`p-4 rounded-2xl border shadow-md space-y-2.5 ${
                      isLight ? "bg-white border-slate-200/90 shadow-slate-200/40" : "bg-[#0d1527] border-white/10"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className={`text-xs font-700 ${isLight ? "text-slate-900" : "text-white"}`}>Strategy & Governance</span>
                        </div>
                        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 border border-indigo-500/20">
                          Tomorrow 10:00 AM
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/70"}`}>
                          ✓ Financial Audit
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/70"}`}>
                          ✓ Board Pack attached
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px]">
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>8 Directors Invited</span>
                        <span className="text-emerald-600 font-700">Invites Sent</span>
                      </div>
                    </div>
                  )
                },
                {
                  step: "02",
                  title: "Run the Meeting",
                  desc: "Work through the agenda live. Record attendance, capture decisions, record votes, and assign action items on the spot.",
                  side: "right",
                  icon: Users,
                  mockup: (
                    <div className={`p-4 rounded-2xl border shadow-md space-y-2.5 ${
                      isLight ? "bg-white border-slate-200/90 shadow-slate-200/40" : "bg-[#0d1527] border-white/10"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-800 text-emerald-600 tracking-wider uppercase">Live Meeting</span>
                        </div>
                        <span className={`text-[10px] font-600 ${isLight ? "text-slate-500" : "text-white/50"}`}>8 Directors Active</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200/60" : "bg-white/[0.03] border-white/[0.06]"}`}>
                        <div className="flex items-center justify-between text-[11px] font-700 mb-1">
                          <span className={isLight ? "text-slate-800" : "text-white"}>Resolution #3: Annual Budget Approval</span>
                          <span className="text-emerald-600 font-800">Passed 8-0</span>
                        </div>
                        <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-white/50"}`}>Quorum: 100% Verified · Action assigned to CFO</p>
                      </div>
                    </div>
                  )
                },
                {
                  step: "03",
                  title: "Draft & Approve Minutes",
                  desc: "The secretary drafts minutes in the rich editor or generates them with AI. Board members review and the chair approves in one click.",
                  side: "left",
                  icon: FileText,
                  mockup: (
                    <div className={`p-4 rounded-2xl border shadow-md space-y-2.5 ${
                      isLight ? "bg-white border-slate-200/90 shadow-slate-200/40" : "bg-[#0d1527] border-white/10"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-700 text-purple-600 flex items-center gap-1.5">
                          <Sparkles size={13} /> AI Minutes v2.4
                        </span>
                        <span className="text-[10px] font-700 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                          Chair Approved
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed line-clamp-2 ${isLight ? "text-slate-600" : "text-white/60"}`}>
                        "The Board unanimously approved the annual financial statement and resolved to file ESG compliance filings before Sep 02."
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[10px]">
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>Signed by Alexandra Chen</span>
                        <span className="text-indigo-600 font-700">Export PDF</span>
                      </div>
                    </div>
                  )
                },
                {
                  step: "04",
                  title: "Track & Report",
                  desc: "Monitor action items to completion and generate board-ready governance reports with attendance and resolution summaries.",
                  side: "right",
                  icon: BarChart3,
                  mockup: (
                    <div className={`p-4 rounded-2xl border shadow-md space-y-2.5 ${
                      isLight ? "bg-white border-slate-200/90 shadow-slate-200/40" : "bg-[#0d1527] border-white/10"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-700 ${isLight ? "text-slate-900" : "text-white"}`}>Action Item Execution</span>
                        <span className="text-[10px] font-800 text-blue-600">94.2% Done</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 w-[94%]" />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>16 of 17 Tasks Closed</span>
                        <span className="text-emerald-600 font-700">100% Audit Ready</span>
                      </div>
                    </div>
                  )
                },
              ].map(({ step, title, desc, side, icon: Icon, mockup }) => (
                <div key={step} className={`lg:grid lg:grid-cols-2 lg:gap-12 items-center ${side === "right" ? "lg:direction-rtl" : ""}`}>
                  <div className={side === "right" ? "lg:order-2" : ""}>
                    <div className="flex items-center gap-4 mb-3">
                      <span className={`text-5xl font-800 ${isLight ? "opacity-20 text-indigo-900" : "opacity-10 text-white"}`}>{step}</span>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/10 text-indigo-400"
                      }`}>
                        <Icon size={20} />
                      </div>
                    </div>
                    <h3 className={`text-xl font-700 mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>{title}</h3>
                    <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-white/50"}`}>{desc}</p>
                  </div>
                  <div className={`mt-6 lg:mt-0 ${side === "right" ? "lg:order-1" : ""}`}>
                    {mockup}
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
            <h2 className={`text-3xl sm:text-4xl font-800 mb-4 ${isLight ? "text-slate-900" : "text-white"}`} style={{ letterSpacing: "-0.02em" }}>
              Loved by boards everywhere
            </h2>
            <p className={`max-w-xl mx-auto ${isLight ? "text-slate-600" : "text-white/50"}`}>Join hundreds of organizations that trust BoardSync for their governance.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => <Testimonial key={t.name} {...t} isLight={isLight} />)}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className={`relative p-10 sm:p-16 rounded-3xl overflow-hidden shadow-2xl ${
            isLight 
              ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800 shadow-indigo-950/20 text-white" 
              : "bg-[rgba(17,24,39,0.9)] border border-indigo-500/25 text-white"
          }`}>
            {/* Orb inside CTA */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(79,70,229,0.2) 0%, transparent 70%)" }} />
            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 mx-auto shadow-lg"
                style={{ background: "var(--gradient-brand)" }}>
                <Shield size={24} className="text-white keep-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-800 text-white keep-white mb-4" style={{ letterSpacing: "-0.02em" }}>
                Ready to modernize your board?
              </h2>
              <p className="text-white/70 keep-white mb-8 text-base">
                Join forward-thinking organizations that run more effective, efficient board meetings with BoardSync.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login"
                  className="btn-gradient px-8 py-4 rounded-xl text-base font-700 flex items-center gap-2.5 shadow-2xl shadow-indigo-500/30 w-full sm:w-auto justify-center hover:scale-105 transition-all duration-300">
                  Get Started Free <ArrowRight size={18} />
                </Link>
              </div>
              <p className="text-xs text-white/40 keep-white mt-4">No credit card required · Free 30-day trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className={`border-t py-10 px-6 ${
        isLight ? "bg-white border-slate-200" : "bg-[rgba(8,13,26,0.8)] border-white/[0.06]"
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <span className="text-white keep-white font-800 text-xs">B</span>
            </div>
            <span className={`font-700 ${isLight ? "text-slate-900" : "text-white"}`}>BoardSync</span>
          </div>
          <p className={`text-xs ${isLight ? "text-slate-500" : "text-white/30"}`}>© {new Date().getFullYear()} BoardSync. All rights reserved.</p>
          <div className={`flex gap-6 text-xs ${isLight ? "text-slate-600" : "text-white/40"}`}>
            <a href="#" className={`transition-colors ${isLight ? "hover:text-slate-900" : "hover:text-white/70"}`}>Privacy</a>
            <a href="#" className={`transition-colors ${isLight ? "hover:text-slate-900" : "hover:text-white/70"}`}>Terms</a>
            <a href="#" className={`transition-colors ${isLight ? "hover:text-slate-900" : "hover:text-white/70"}`}>Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
