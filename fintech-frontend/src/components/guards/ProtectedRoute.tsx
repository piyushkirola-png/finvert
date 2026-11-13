import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../../lib/rolePermissions";
import type { Role } from "../../types/auth";

export default function ProtectedRoute({ allow }: { allow?: Role }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allow && role !== allow) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!canAccess(role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
