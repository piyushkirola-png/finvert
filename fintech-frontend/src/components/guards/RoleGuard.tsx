import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../../types/auth";

export default function RoleGuard({
  allow,
  children,
}: {
  allow: Role;
  children: ReactNode;
}) {
  const { role } = useAuth();
  if (role !== allow) return null;
  return <>{children}</>;
}
