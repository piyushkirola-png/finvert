import type { Role } from "../types/auth";

export const ADMIN_ONLY_PREFIXES = [
  "/users",
  "/merchants",
  "/merchant-summary",
  "/merchant",
  "/gateways",
  "/gateway-pricing",
  "/gateway-merchant-mappings",
  "/gateway-stats",
  "/merchant-routing",
  "/risk-blocks",
  "/webhooks",
  "/tickets",
  "/faq",
  "/notifications",
];

export const USER_ONLY_PREFIXES = ["/documentation", "/update-password"];

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  const isAdminPath = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isUserPath = USER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (role === "ADMIN") return !isUserPath;
  if (role === "USER") return !isAdminPath;
  return false;
}

export function homeForRole(role: Role | null): string {
  return role ? "/dashboard" : "/login";
}
