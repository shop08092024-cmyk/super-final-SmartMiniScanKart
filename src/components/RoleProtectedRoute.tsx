import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, UserRole } from "@/context/AuthContext";

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
}

const RoleProtectedRoute = ({ allowedRoles }: RoleProtectedRouteProps) => {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    const fallbackRoute =
      role === "employee"
        ? "/employee/dashboard"
        : role === "onboarding"
        ? "/onboarding"
        : "/dashboard";
    return <Navigate to={fallbackRoute} replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute;
