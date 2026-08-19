import { UserRole } from "@/models/User";

export const PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  board_member: [
    "meetings:create", "meetings:read", "meetings:update", "meetings:delete",
    "meetings:read:invited",
    "users:read",
    "documents:create", "documents:read", "documents:update", "documents:delete",
    "minutes:create", "minutes:read", "minutes:update", "minutes:approve", "minutes:publish", "minutes:generate",
    "resolutions:create", "resolutions:read", "resolutions:update", "resolutions:delete",
    "actions:create", "actions:read", "actions:read:all", "actions:update", "actions:update:all", "actions:update:own", "actions:delete",
    "rsvp:update",
    "reports:read",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = PERMISSIONS[role] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Admin",
    board_member: "Board Member",
  };
  return labels[role] ?? role;
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: "bg-red-500/20 text-red-400 border-red-500/30",
    board_member: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return colors[role] ?? "bg-gray-500/20 text-gray-400";
}
