import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useModuleAccess } from '@/hooks/useActiveModule';
import { MODULES, type ModuleDef } from '@/lib/modules';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, ArrowRight, Settings, LogOut, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export function ModuleLauncherPage() {
  const { user, logout, moduleMemory, rememberModule, forgetModule } = useAuthStore();
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
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clearing local state is what matters
    }
    queryClient.clear();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-bold tracking-widest">
            PRIME-<span className="text-emerald-200">HRM</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white/80 hover:text-white hover:bg-white/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        {/* LGU branding */}
        <div className="flex flex-col items-center text-center mb-10">
          {user.lgu?.logo ? (
            <img
              src={user.lgu.logo}
              alt={user.lgu.name}
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/20 mb-4"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur ring-2 ring-white/20 mb-4">
              <Shield className="h-10 w-10 text-white" />
            </div>
          )}
          {user.lgu && (
            <h1 className="text-2xl md:text-3xl font-bold text-white">{user.lgu.name}</h1>
          )}
          <p className="mt-2 text-sm text-emerald-100">
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

            return (
              <button
                key={mod.key}
                type="button"
                disabled={!available}
                onClick={() => enter(mod)}
                aria-label={available ? `Open ${mod.name}` : `${mod.name} is not available`}
                className={
                  available
                    ? 'group relative flex flex-col rounded-2xl bg-white/10 p-6 text-left ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15 hover:ring-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
                    : 'relative flex cursor-not-allowed flex-col rounded-2xl bg-white/5 p-6 text-left ring-1 ring-white/10 backdrop-blur opacity-60'
                }
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                  {available ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>

                <h2 className="mt-4 text-lg font-bold text-white">{mod.label}</h2>
                <p className="text-sm font-medium text-emerald-100">{mod.name}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-emerald-200/80">
                  {mod.description}
                </p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  {available ? (
                    <>
                      Enter
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  ) : (
                    <span className="text-emerald-200/70">{unavailableReason}</span>
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
            <Label htmlFor="remember-module" className="text-sm text-emerald-100 cursor-pointer">
              Remember my choice and skip this screen next time
            </Label>
          </div>
        )}

        {/* Administration */}
        {canAccess('ADMIN') && (
          <Link
            to={MODULES.ADMIN.basePath}
            className="mt-6 inline-flex items-center gap-2 text-sm text-emerald-200/80 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            Administration
          </Link>
        )}
      </main>
    </div>
  );
}
