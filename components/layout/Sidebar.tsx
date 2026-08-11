"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  X,
} from "lucide-react";

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

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (o: boolean) => void;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const visibleNavItems = navItems.filter((item) => {
    if (item.href === "/users") {
      return role === "admin" || role === "super_admin";
    }
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-white/[0.06]",
        // Desktop collapse width states
        collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
        // Mobile drawer transition states
        mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0",
        // Desktop width when drawer is inactive
        !mobileOpen && (collapsed ? "w-[72px]" : "w-[260px]")
      )}
      style={{ background: "var(--bg-sidebar)" }}
    >
      {/* Header section Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={() => setMobileOpen(false)}>
          {/* Logo when expanded */}
          <div className={cn("items-center gap-2", collapsed ? "lg:hidden flex" : "flex")}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-brand)" }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-700 text-white truncate leading-tight">BoardSync</span>
              <span className="text-[10px] text-white/30 truncate">Management Portal</span>
            </div>
          </div>

          {/* Logo when collapsed */}
          <div className={cn("w-8 h-8 rounded-lg items-center justify-center bg-indigo-600", collapsed ? "lg:flex hidden" : "hidden")}>
            <Shield className="w-4 h-4 text-white" />
          </div>
        </Link>

        {/* Desktop Collapse Arrow Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-md lg:flex hidden items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Mobile Close Button Drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="w-8 h-8 rounded-lg lg:hidden flex items-center justify-center text-white/50 hover:bg-white/[0.08] transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        <p className={cn("text-[10px] font-600 text-white/25 uppercase tracking-widest px-3 mb-3", collapsed ? "lg:hidden block" : "block")}>
          Main Menu
        </p>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-all duration-150 group relative",
                isActive
                  ? "text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                collapsed ? "lg:justify-center lg:px-2 px-3" : "justify-start px-3"
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
              <span className={cn("relative z-10", collapsed ? "lg:hidden block" : "block")}>
                {item.label}
              </span>
              {/* Notification badge */}
              {item.href === "/notifications" && (
                <span className={cn("ml-auto relative z-10 w-2 h-2 rounded-full bg-indigo-500", collapsed ? "lg:hidden block" : "block")} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings bottom navigation */}
      <div className="px-2 py-4 border-t border-white/[0.06] space-y-0.5">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 transition-all duration-150",
                isActive
                  ? "text-white bg-white/[0.06]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
                collapsed ? "lg:justify-center lg:px-2 px-3" : "justify-start px-3"
              )}
            >
              <item.icon size={18} />
              <span className={cn(collapsed ? "lg:hidden block" : "block")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
