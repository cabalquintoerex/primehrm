import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  moduleForPath,
  modulesForUser,
  launcherModulesForUser,
  canAccessModule,
  accessOptionsFor,
  type ModuleDef,
  type ModuleKey,
} from '@/lib/modules';

/** The module the current URL belongs to, or null on public/applicant/launcher routes. */
export function useActiveModule(): ModuleDef | null {
  const { pathname } = useLocation();
  return moduleForPath(pathname);
}

/**
 * Modules licensed to the signed-in user's LGU. Undefined means unrestricted —
 * super admins have no LGU, and Phase E has not yet populated `enabledModules`.
 */
export function useEnabledModules(): ModuleKey[] | undefined {
  const { user } = useAuthStore();
  return user?.lgu?.enabledModules ?? undefined;
}

export function useModuleAccess() {
  const { user } = useAuthStore();
  const role = user?.role;
  const opts = user ? accessOptionsFor(user) : {};

  return {
    role,
    enabledModules: opts.enabledModules,
    moduleAccess: opts.moduleAccess,
    /** Every module the user may enter, including Administration. */
    modules: modulesForUser(role, opts),
    /** Business modules only — what the launcher renders as cards. */
    launcherModules: launcherModulesForUser(role, opts),
    canAccess: (key: ModuleKey) => canAccessModule(role, key, opts),
  };
}
