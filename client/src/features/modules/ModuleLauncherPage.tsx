import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useModuleAccess } from '@/hooks/useActiveModule';
import { MODULES, logoutDestination, type ModuleDef } from '@/lib/modules';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ArrowRight, Settings, LogOut, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { assetUrl } from '@/lib/basePath';

/** Per-module card tints. Mirrors the `pillars` treatment on LoginPage so the two screens match. */
const CARD_STYLES: Record<string, { card: string; iconBg: string; title: string; name: string; desc: string }> = {
  RSP: {
    card: 'bg-gradient-to-br from-emerald-100 to-emerald-50 ring-emerald-200 hover:ring-emerald-400 hover:shadow-emerald-600/15',
    iconBg: 'bg-emerald-600 shadow-emerald-600/25',
    title: 'text-emerald-950',
    name: 'text-emerald-700',
    desc: 'text-emerald-800/70',
  },
  LND: {
    card: 'bg-gradient-to-br from-teal-100 to-teal-50 ring-teal-200 hover:ring-teal-400 hover:shadow-teal-600/15',
    iconBg: 'bg-teal-600 shadow-teal-600/25',
    title: 'text-teal-950',
    name: 'text-teal-700',
    desc: 'text-teal-800/70',
  },
};

export function ModuleLauncherPage() {
  const { user, logout, moduleMemory, rememberModule, forgetModule, lastLguSlug } = useAuthStore();
  const { launcherModules, canAccess, enabledModules } = useModuleAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) return null;

  const [shouldRemember, setShouldRemember] = useState(moduleMemory?.userId === user.id);
  const licensed = new Set(launcherModules.map((m) => m.key));

  // Show every business module so an unlicensed one reads as "not available" rather than vanishing.
  const cards: ModuleDef[] = [MODULES.RSP, MODULES.LND];

  // The preference is only committed once a module is actually chosen — otherwise flipping
  // the switch alone would silently bind the user to a module they never picked.
  const enter = (mod: ModuleDef) => {
    if (shouldRemember) rememberModule(user.id, mod.key);
    navigate(mod.basePath);
  };

  const onToggleRemember = (checked: boolean) => {
    setShouldRemember(checked);
    if (!checked) forgetModule();
  };

  const handleLogout = async () => {
    // Resolve the destination before clearing the store — afterwards the LGU is gone.
    const destination = logoutDestination(user, lastLguSlug);
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clearing local state is what matters
    }
    queryClient.clear();
    logout();
    navigate(destination);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-2 text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md shadow-emerald-600/20">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-widest">
            PRIME-<span className="text-emerald-600">HRM</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-900 hover:bg-emerald-100/60"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* LGU branding */}
        <div className="flex flex-col items-center text-center mb-10">
          {user.lgu?.logo ? (
            <img
              src={assetUrl(user.lgu.logo)}
              alt={user.lgu.name}
              className="h-20 w-20 rounded-full object-cover bg-white ring-2 ring-emerald-200 shadow-md shadow-emerald-900/5 mb-4"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white ring-2 ring-emerald-200 shadow-md shadow-emerald-900/5 mb-4">
              <Shield className="h-10 w-10 text-emerald-600" />
            </div>
          )}
          {user.lgu && (
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{user.lgu.name}</h1>
          )}
          <p className="mt-2 text-sm text-gray-600">
            Welcome back, {user.firstName}. Choose a module to continue.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          {cards.map((mod) => {
            const Icon = mod.icon;
            const available = licensed.has(mod.key);
            const roleAllows = mod.roles.includes(user.role);
            const lguLicensed = !mod.licensable || !enabledModules || enabledModules.includes(mod.key);
            // Precedence mirrors canAccessModule: role → LGU license → per-user grant.
            const unavailableReason = !roleAllows
              ? 'Not available for your role'
              : !lguLicensed
                ? 'Not enabled for this LGU'
                : 'Not assigned to your account';

            const style = CARD_STYLES[mod.key];

            return (
              <button
                key={mod.key}
                type="button"
                disabled={!available}
                onClick={() => enter(mod)}
                aria-label={available ? `Open ${mod.name}` : `${mod.name} is not available`}
                className={
                  available
                    ? `group relative flex flex-col rounded-2xl p-6 text-left ring-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${style.card}`
                    : 'relative flex cursor-not-allowed flex-col rounded-2xl bg-gray-100/70 p-6 text-left ring-1 ring-gray-200'
                }
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${
                    available ? `text-white ${style.iconBg}` : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {available ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>

                <h2 className={`mt-4 text-lg font-bold ${available ? style.title : 'text-gray-500'}`}>
                  {mod.label}
                </h2>
                <p className={`text-sm font-medium ${available ? style.name : 'text-gray-400'}`}>
                  {mod.name}
                </p>
                <p className={`mt-3 flex-1 text-sm leading-relaxed ${available ? style.desc : 'text-gray-400'}`}>
                  {mod.description}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                  {available ? (
                    <span className={`inline-flex items-center gap-1.5 ${style.title}`}>
                      Enter
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  ) : (
                    <span className="text-gray-500">{unavailableReason}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Remember preference */}
        {launcherModules.length > 0 && (
          <div className="mt-8 flex items-center gap-3">
            <Switch id="remember-module" checked={shouldRemember} onCheckedChange={onToggleRemember} />
            <Label htmlFor="remember-module" className="text-sm text-gray-600 cursor-pointer">
              Remember my choice and skip this screen next time
            </Label>
          </div>
        )}

        {/* Administration */}
        {canAccess('ADMIN') && (
          <Link
            to={MODULES.ADMIN.basePath}
            className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Administration
          </Link>
        )}
      </main>
    </div>
  );
}
