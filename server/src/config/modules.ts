/** Every module a user can be granted. Administration is not licensable but IS grantable. */
export const ALL_MODULES = ['RSP', 'LND', 'ADMIN'] as const;
export type ModuleKey = (typeof ALL_MODULES)[number];

/** Business modules that a SUPER_ADMIN can license per LGU. Administration is always available. */
export const LICENSABLE_MODULES = ['RSP', 'LND'] as const;
export type LicensableModule = (typeof LICENSABLE_MODULES)[number];

/** Which modules each role is ever allowed to enter. Mirrors the client registry. */
export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  SUPER_ADMIN: ['RSP', 'LND', 'ADMIN'],
  LGU_HR_ADMIN: ['RSP', 'LND', 'ADMIN'],
  LGU_OFFICE_ADMIN: ['RSP'],
  APPLICANT: [],
};

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && (ALL_MODULES as readonly string[]).includes(value);
}

export function isLicensableModule(value: unknown): value is LicensableModule {
  return typeof value === 'string' && (LICENSABLE_MODULES as readonly string[]).includes(value);
}

/**
 * Normalize an incoming `enabledModules` value (LGU licensing) from a request body.
 * Returns a de-duplicated array of valid licensable keys, or null (= all modules available).
 */
export function parseEnabledModules(input: unknown): LicensableModule[] | null {
  if (input === undefined || input === null) return null;
  if (!Array.isArray(input)) {
    throw new Error('enabledModules must be an array of module keys');
  }
  const invalid = input.filter((m) => !isLicensableModule(m));
  if (invalid.length > 0) {
    throw new Error(`Invalid module key(s): ${invalid.join(', ')}`);
  }
  return [...new Set(input as LicensableModule[])];
}

/**
 * Normalize an incoming per-user `moduleAccess` value from a request body.
 * Returns a de-duplicated array of valid module keys, or null (= no access / deny-by-default).
 */
export function parseModuleAccess(input: unknown): ModuleKey[] | null {
  if (input === undefined || input === null) return null;
  if (!Array.isArray(input)) {
    throw new Error('moduleAccess must be an array of module keys');
  }
  const invalid = input.filter((m) => !isModuleKey(m));
  if (invalid.length > 0) {
    throw new Error(`Invalid module key(s): ${invalid.join(', ')}`);
  }
  return [...new Set(input as ModuleKey[])];
}

/**
 * Whether an LGU with the given stored `enabledModules` may use a module.
 * Non-licensable modules (Administration) are always available; null/undefined licensing
 * means unrestricted.
 */
export function lguHasModule(enabledModules: unknown, key: ModuleKey): boolean {
  if (!isLicensableModule(key)) return true;
  if (enabledModules === null || enabledModules === undefined) return true;
  if (!Array.isArray(enabledModules)) return true;
  return enabledModules.includes(key);
}

/**
 * Whether a user with the given role and stored `moduleAccess` grant may enter a module.
 * Deny-by-default: a null/absent grant means no access. The role must also allow the module.
 * (Callers should short-circuit SUPER_ADMIN before this — super admins ignore per-user grants.)
 */
export function userHasModule(role: string, moduleAccess: unknown, key: ModuleKey): boolean {
  if (!(ROLE_MODULES[role] ?? []).includes(key)) return false;
  if (moduleAccess === null || moduleAccess === undefined) return false;
  if (!Array.isArray(moduleAccess)) return false;
  return moduleAccess.includes(key);
}
