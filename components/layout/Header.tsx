import { Bell, Search, ChevronDown, LogOut, User, Settings, Menu, Sun, Moon } from "lucide-react";
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
  setMobileOpen: (o: boolean) => void;
  collapsed: boolean;
}

export default function Header({ 
  user, 
  title = "Dashboard", 
  setMobileOpen,
  collapsed
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Read theme from html attributes on mount
    const currentTheme = (document.documentElement.getAttribute("data-theme") || "dark") as "dark" | "light";
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    // Emit global event for components to react to theme change
    window.dispatchEvent(new Event("themechange"));
  };

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
      className={`h-16 fixed top-0 right-0 ${
        collapsed ? "lg:left-[72px]" : "lg:left-[260px]"
      } left-0 z-30 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.06] transition-all duration-300`}
      style={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Title & Mobile Toggle Icon */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-lg lg:hidden flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white"
          title="Open Menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base sm:text-lg font-600 text-white truncate">{title}</h1>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications Icon Badge */}
        <Link href="/notifications" className="relative w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all">
          <Bell size={16} />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full ring-2 ring-white dark:ring-[#0a0f1e] flex items-center justify-center text-[10px] font-700 text-white keep-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)", color: "#ffffff" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown Profile Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-1.5 pr-2 sm:pr-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            {user.image || (user as any).avatar ? (
              <img
                src={user.image || (user as any).avatar}
                alt={user.name ?? "User"}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-indigo-500/30 shadow-sm shadow-indigo-500/20"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 text-white flex-shrink-0 shadow-sm shadow-indigo-500/20"
                style={{ background: "var(--gradient-brand)" }}
              >
                {user.name ? getInitials(user.name) : "?"}
              </div>
            )}
            <div className="hidden sm:block text-left max-w-[100px] md:max-w-none">
              <p className="text-xs font-700 header-user-name leading-tight truncate">{user.name ?? "User"}</p>
              <p className="text-[10px] font-500 header-user-role leading-tight truncate">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className={`header-chevron transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-white/[0.12] p-2 shadow-2xl animate-fade-in z-50 overflow-hidden header-dropdown-panel"
              style={{ background: "#0d1527" }}
            >
              {/* Profile Card inside dropdown */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-2 header-dropdown-usercard">
                {user.image || (user as any).avatar ? (
                  <img
                    src={user.image || (user as any).avatar}
                    alt={user.name ?? "User"}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-indigo-500/30 shadow-md shadow-indigo-500/20"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-700 text-white shrink-0 shadow-md shadow-indigo-500/20"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    {user.name ? getInitials(user.name) : "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-700 header-dropdown-name truncate leading-tight">{user.name ?? "User"}</p>
                  <p className="text-[10px] header-dropdown-email truncate mt-0.5">{user.email ?? ""}</p>
                  <span className="inline-block px-2 py-0.5 mt-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-[9px] font-600">
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-500 text-white/70 hover:text-white hover:bg-white/[0.06] transition-all header-dropdown-item"
                >
                  <User size={15} className="text-indigo-400" />
                  <span>My Profile</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-500 text-white/70 hover:text-white hover:bg-white/[0.06] transition-all header-dropdown-item"
                >
                  <Settings size={15} className="text-indigo-400" />
                  <span>Account Settings</span>
                </Link>
              </div>

              <div className="my-1.5 border-t border-white/[0.08] header-dropdown-divider" />

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-500 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
