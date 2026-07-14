import { Briefcase, GraduationCap, Settings } from 'lucide-react';
import type { User, UserRole, ModuleKey } from '@/types';

export type { ModuleKey };

/**
 * The launcher's "remember and skip next time" preference. Scoped to a user id so a
 * different user signing in on the same browser still sees the launcher.
 */
export interface ModuleMemory {
  userId: number;
  module: ModuleKey;
}

export interface ModuleDef {
  key: ModuleKey;
  /** Short label for the sidebar switcher, e.g. "RSP" */
  label: string;
  /** Full name for the launcher card */
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Entering a module always targets its basePath; an index route picks the landing page. */
  basePath: string;
  roles: UserRole[];
  /** ADMIN is reached via the header gear, not a launcher card. */
  showOnLauncher: boolean;
  /** ADMIN is always available; business modules can be disabled per LGU. */
  licensable: boolean;
}

export const MODULES: Record<ModuleKey, ModuleDef> = {
  RSP: {
    key: 'RSP',
    label: 'RSP',
    name: 'Recruitment, Selection & Placement',
    description:
      'Publish vacancies, receive applications, screen and interview applicants, then appoint and onboard.',
    icon: Briefcase,
    basePath: '/rsp',
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'],
    showOnLauncher: true,
    licensable: true,
  },
  LND: {
    key: 'LND',
    label: 'L&D',
    name: 'Learning & Development',
    description:
      'Plan and schedule trainings, manage participants and attendance, and issue completion certificates.',
    icon: GraduationCap,
    basePath: '/lnd',
    // Office admins are excluded until department-level training assignment ships;
    // every page in this module is HR-only, so they would only bounce back out.
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    showOnLauncher: true,
    licensable: true,
  },
  ADMIN: {
    key: 'ADMIN',
    label: 'Administration',
    name: 'Administration',
    description: 'Manage LGUs, departments, user accounts, and review audit logs.',
    icon: Settings,
    basePath: '/admin',
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    showOnLauncher: false,
    licensable: false,
  },
};

export const MODULE_LIST: ModuleDef[] = [MODULES.RSP, MODULES.LND, MODULES.ADMIN];

/** Path prefixes that belong to no module (applicant portal, public pages, launcher). */
const UNSCOPED_PREFIXES = ['/applicant', '/apply', '/modules', '/register'];

export function isModuleKey(value: unknown): value is ModuleKey {
  return value === 'RSP' || value === 'LND' || value === 'ADMIN';
}

/**
 * Which module a pathname belongs to, or null for public/applicant/launcher routes.
 * Longest basePath wins so a future `/admin-x` cannot shadow `/admin`.
 */
export function moduleForPath(pathname: string): ModuleDef | null {
  if (UNSCOPED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }
  return (
    [...MODULE_LIST]
      .sort((a, b) => b.basePath.length - a.basePath.length)
      .find((m) => pathname === m.basePath || pathname.startsWith(m.basePath + '/')) ?? null
  );
}

interface AccessOptions {
  /** Modules the user's LGU has licensed. Undefined/null means "no restriction" (all licensed). */
  enabledModules?: ModuleKey[] | null;
  /** Per-user grant. Null/undefined = no modules (deny-by-default). Ignored for SUPER_ADMIN. */
  moduleAccess?: ModuleKey[] | null;
}

export function canAccessModule(
  role: UserRole | undefined,
  key: ModuleKey,
  { enabledModules, moduleAccess }: AccessOptions = {}
): boolean {
  if (!role) return false;
  const mod = MODULES[key];
  if (!mod.roles.includes(role)) return false;
  // LGU licensing ceiling (only licensable modules; Administration is always available).
  if (mod.licensable && enabledModules && !enabledModules.includes(key)) return false;
  // Per-user grant. Super admins are unrestricted; everyone else is deny-by-default.
  if (role !== 'SUPER_ADMIN') {
    if (!moduleAccess) return false;
    if (!moduleAccess.includes(key)) return false;
  }
  return true;
}

/** Build access options from a user record. */
export function accessOptionsFor(
  user: Pick<User, 'moduleAccess' | 'lgu'>
): AccessOptions {
  return {
    enabledModules: user.lgu?.enabledModules ?? undefined,
    moduleAccess: user.moduleAccess ?? null,
  };
}

/** Every module this user may enter, in display order. */
export function modulesForUser(role: UserRole | undefined, opts: AccessOptions = {}): ModuleDef[] {
  return MODULE_LIST.filter((m) => canAccessModule(role, m.key, opts));
}

/** Only the business modules shown as cards on the launcher. */
export function launcherModulesForUser(role: UserRole | undefined, opts: AccessOptions = {}): ModuleDef[] {
  return modulesForUser(role, opts).filter((m) => m.showOnLauncher);
}

/**
 * Where to send a user who has not picked a module.
 * SUPER_ADMIN goes to Administration — that is their whole job.
 * Everyone else sees the launcher unless exactly one module is available.
 */
export function defaultDestination(role: UserRole | undefined, opts: AccessOptions = {}): string {
  if (role === 'APPLICANT') return '/applicant/dashboard';
  if (role === 'SUPER_ADMIN') return MODULES.ADMIN.basePath;

  const cards = launcherModulesForUser(role, opts);
  if (cards.length === 1) return cards[0].basePath;
  return '/modules';
}

/** The signed-in user's home destination, respecting role, LGU licensing, and per-user grant. */
export function homeFor(user: Pick<User, 'role' | 'lgu' | 'moduleAccess'>): string {
  return defaultDestination(user.role, accessOptionsFor(user));
}

/**
 * Where to land immediately after sign-in. Honours the launcher's "remember my choice"
 * preference, but only when it belongs to this user and the module is still reachable —
 * otherwise a revoked role, an unlicensed module, or a removed grant would bounce them
 * straight back out.
 */
export function postLoginDestination(user: User, memory: ModuleMemory | null): string {
  const opts = accessOptionsFor(user);

  if (
    memory &&
    memory.userId === user.id &&
    canAccessModule(user.role, memory.module, opts)
  ) {
    return MODULES[memory.module].basePath;
  }

  return defaultDestination(user.role, opts);
}
