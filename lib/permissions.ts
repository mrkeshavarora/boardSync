import { UserRole } from "@/models/User";

export const PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  admin: [
    "meetings:create", "meetings:read", "meetings:update", "meetings:delete",
    "meetings:read:invited",
    "users:create", "users:read", "users:update", "users:delete",
    "documents:create", "documents:read", "documents:update", "documents:delete",
    "minutes:create", "minutes:read", "minutes:update", "minutes:approve",
    "resolutions:create", "resolutions:read", "resolutions:update", "resolutions:delete",
    "actions:create", "actions:read", "actions:read:all", "actions:update", "actions:update:all", "actions:delete",
    "reports:read", "audit:read",
  ],
  board_secretary: [
    "meetings:create", "meetings:read", "meetings:update", "meetings:read:invited",
    "users:read",
    "documents:create", "documents:read", "documents:update",
    "minutes:create", "minutes:read", "minutes:update",
    "resolutions:create", "resolutions:read", "resolutions:update",
    "actions:create", "actions:read", "actions:read:all", "actions:update", "actions:update:all",
    "reports:read",
  ],
  board_member: [
    "meetings:create", "meetings:update", "meetings:read", "meetings:read:invited",
    "documents:read",
    "minutes:read",
    "resolutions:read",
    "actions:read", "actions:update:own",
    "rsvp:update",
  ],
  guest: [
    "meetings:read:invited",
    "documents:read:public",
    "rsvp:update",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    board_secretary: "Board Secretary",
    board_member: "Board Member",
    guest: "Guest",
  };
  return labels[role] ?? role;
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: "bg-red-500/20 text-red-400 border-red-500/30",
    admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    board_secretary: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    board_member: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    guest: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[role] ?? "bg-gray-500/20 text-gray-400";
}
