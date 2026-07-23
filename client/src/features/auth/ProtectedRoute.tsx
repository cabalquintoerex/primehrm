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
  const { isAuthenticated, user, lastLguSlug } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // This redirect also fires on sign-out (logout() flips isAuthenticated and this re-renders
    // before any navigate() lands), so it — not the caller — decides where a signed-out LGU user
    // ends up. `lastLguSlug` survives logout precisely so that lands on their branded login.
    const loginPath = lastLguSlug ? `/${lastLguSlug}/login` : '/';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
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
