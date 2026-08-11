"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  FileText,
  BookOpen,
  Users,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meetings", href: "/meetings", icon: CalendarDays },
  { label: "My Actions", href: "/actions", icon: CheckSquare },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Minutes", href: "/minutes", icon: BookOpen },
  { label: "Users", href: "/users", icon: Users },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const bottomItems = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out",
        "border-r border-white/[0.06]",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{ background: "var(--bg-sidebar)" }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-white/[0.06]",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/" className="flex items-center flex-1 min-w-0" aria-label="Go to landing page">
          {!collapsed && (
            <div className="flex items-center gap-2.5 animate-fade-in min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-700 text-white leading-tight">BoardSync</p>
                <p className="text-[10px] text-white/40 leading-tight">Management Portal</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all",
            collapsed && "absolute -right-3 top-6 bg-[#0d1526] border border-white/10 rounded-full w-6 h-6"
          )}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-600 text-white/25 uppercase tracking-widest px-3 mb-3">
            Main
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-all duration-150 group relative",
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                collapsed && "justify-center px-2"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(124,58,237,0.1) 100%)",
                    border: "1px solid rgba(79,70,229,0.25)",
                  }}
                />
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-500" />
              )}
              <item.icon
                className={cn(
                  "relative z-10 flex-shrink-0 transition-colors",
                  isActive ? "text-indigo-400 w-4.5 h-4.5" : "w-4.5 h-4.5"
                )}
                size={18}
              />
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
              {/* Notification dot for Bell */}
              {item.href === "/notifications" && !collapsed && (
                <span className="ml-auto relative z-10 w-2 h-2 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-2 py-4 border-t border-white/[0.06] space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-all duration-150",
                isActive
                  ? "text-white bg-white/[0.06]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
