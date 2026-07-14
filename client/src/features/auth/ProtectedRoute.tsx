import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { canAccessModule, homeFor, accessOptionsFor, type ModuleKey } from '@/lib/modules';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  /** Route belongs to this module; entry also requires role + LGU licensing. */
  module?: ModuleKey;
}

export function ProtectedRoute({ children, allowedRoles, module }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const home = homeFor(user);

  if (module && !canAccessModule(user.role, module, accessOptionsFor(user))) {
    return <Navigate to={home} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
