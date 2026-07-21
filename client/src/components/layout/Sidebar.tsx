import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Building2,
  Users,
  FolderTree,
  Briefcase,
  X,
  Shield,
  ClipboardList,
  FileText,
  Calendar,
  Award,
  FileCheck,
  GraduationCap,
  FileStack,
  BarChart3,
  ScrollText,
  ChevronsUpDown,
  LayoutGrid,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActiveModule, useModuleAccess } from '@/hooks/useActiveModule';
import { homeFor, type ModuleKey } from '@/lib/modules';
import { assetUrl } from '@/lib/basePath';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  /** Which module owns this item. Null items belong to the applicant portal. */
  module: ModuleKey | null;
}

const navItems: NavItem[] = [
  // ---- Recruitment, Selection & Placement ----
  {
    title: 'Dashboard',
    href: '/rsp/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Positions',
    href: '/rsp/positions',
    icon: Briefcase,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Publications',
    href: '/rsp/publications',
    icon: FileStack,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Applications',
    href: '/rsp/applications',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Interviews',
    href: '/rsp/interviews',
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Selection',
    href: '/rsp/selection',
    icon: Award,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Appointments',
    href: '/rsp/appointments',
    icon: FileCheck,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },
  {
    title: 'Reports',
    href: '/rsp/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'RSP',
  },

  // ---- Learning & Development ----
  {
    title: 'Dashboard',
    href: '/lnd/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'LND',
  },
  {
    title: 'Training',
    href: '/lnd/training',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'LND',
  },
  {
    title: 'Reports',
    href: '/lnd/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'LND',
  },

  // ---- Administration ----
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN'],
    module: 'ADMIN',
  },
  {
    title: 'LGU Management',
    href: '/admin/lgus',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
    module: 'ADMIN',
  },
  {
    title: 'Departments',
    href: '/admin/departments',
    icon: FolderTree,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'ADMIN',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'ADMIN',
  },
  {
    title: 'HRMPSB Signatories',
    href: '/admin/psb-members',
    icon: Users,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'ADMIN',
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: ScrollText,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
    module: 'ADMIN',
  },

  // ---- Applicant portal ----
  {
    title: 'Dashboard',
    href: '/applicant/dashboard',
    icon: LayoutDashboard,
    roles: ['APPLICANT'],
    module: null,
  },
  {
    title: 'Personal Data Sheet',
    href: '/applicant/pds',
    icon: FileText,
    roles: ['APPLICANT'],
    module: null,
  },
  {
    title: 'Work Experience Sheet',
    href: '/applicant/wes',
    icon: Briefcase,
    roles: ['APPLICANT'],
    module: null,
  },
  {
    title: 'My Applications',
    href: '/applicant/applications',
    icon: ClipboardList,
    roles: ['APPLICANT'],
    module: null,
  },
];

function ModuleSwitcher({ onNavigate }: { onNavigate: () => void }) {
  const activeModule = useActiveModule();
  const { modules } = useModuleAccess();

  if (!activeModule) return null;

  const ActiveIcon = activeModule.icon;

  return (
    <div className="border-b px-2 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 h-auto py-2 hover:bg-accent"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                Module
              </span>
              <span className="text-sm font-semibold truncate leading-tight">
                {activeModule.label}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch module
          </DropdownMenuLabel>
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = mod.key === activeModule.key;
            return (
              <DropdownMenuItem key={mod.key} asChild>
                <Link to={mod.basePath} onClick={onNavigate} className="cursor-pointer">
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="flex-1">{mod.label}</span>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/modules" onClick={onNavigate} className="cursor-pointer">
              <LayoutGrid className="mr-2 h-4 w-4" />
              All modules
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const activeModule = useActiveModule();

  // Only show nav for the module you are currently in; applicants have no module.
  const filteredItems = navItems.filter(
    (item) =>
      user && item.roles.includes(user.role) && item.module === (activeModule?.key ?? null)
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-12 items-center border-b px-4">
        <Link to={user ? homeFor(user) : '/'} className="flex items-center gap-2">
          {user?.lgu?.logo ? (
            <img src={assetUrl(user.lgu.logo)} alt={user.lgu.name} className="h-6 w-6 rounded object-cover" />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary">PRIME-HRM</span>
            {user?.lgu && (
              <span className="text-[10px] text-muted-foreground leading-tight">
                {user.lgu.name}
              </span>
            )}
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="ml-auto md:hidden" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ModuleSwitcher onNavigate={onClose} />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive =
              location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {user?.role.replace(/_/g, ' ').toLowerCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background">
        {sidebarContent}
      </aside>
    </>
  );
}
