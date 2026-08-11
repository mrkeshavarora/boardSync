"use client";

import { Bell, Search, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    image?: string | null;
  };
  title?: string;
}

export default function Header({ user, title = "Dashboard" }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json.unreadCount ?? 0);
        }
      } catch {}
    };
    fetchUnread();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const roleLabel = (user.role ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <header
      className="h-16 fixed top-0 right-0 left-[260px] z-30 flex items-center justify-between px-6 border-b border-white/[0.06] transition-all duration-300"
      style={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Title */}
      <h1 className="text-lg font-600 text-white">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all w-56"
          />
        </div>

        {/* Notifications */}
        <Link href="/notifications" className="relative w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-indigo-500 rounded-full ring-2 ring-[#0a0f1e] flex items-center justify-center text-[10px] font-700 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-700 text-white flex-shrink-0"
              style={{ background: "var(--gradient-brand)" }}
            >
              {user.name ? getInitials(user.name) : "?"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-600 text-white leading-tight">{user.name ?? "User"}</p>
              <p className="text-[10px] text-white/40 leading-tight">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className={`text-white/40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/[0.1] py-1.5 shadow-2xl animate-fade-in"
              style={{ background: "#111827" }}
            >
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-xs font-600 text-white">{user.name}</p>
                <p className="text-[10px] text-white/40 truncate">{user.email}</p>
              </div>
              <a href="/profile" className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-all">
                <User size={14} />
                Profile
              </a>
              <a href="/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-all">
                <Settings size={14} />
                Settings
              </a>
              <hr className="border-white/[0.06] my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] transition-all"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
