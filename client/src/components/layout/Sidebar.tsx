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
  User,
  GraduationCap,
  FileStack,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'],
  },
  {
    title: 'LGU Management',
    href: '/admin/lgus',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    title: 'Departments',
    href: '/admin/departments',
    icon: FolderTree,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'CSC Batches',
    href: '/admin/csc-batches',
    icon: FileStack,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Positions',
    href: '/admin/positions',
    icon: Briefcase,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Applications',
    href: '/admin/applications',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'],
  },
  {
    title: 'Interviews',
    href: '/admin/interviews',
    icon: Calendar,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Selection',
    href: '/admin/selection',
    icon: Award,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Appointments',
    href: '/admin/appointments',
    icon: FileCheck,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Training',
    href: '/admin/training',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: ScrollText,
    roles: ['SUPER_ADMIN', 'LGU_HR_ADMIN'],
  },
  // Applicant nav items
  {
    title: 'Dashboard',
    href: '/applicant/dashboard',
    icon: LayoutDashboard,
    roles: ['APPLICANT'],
  },
  {
    title: 'Personal Data Sheet',
    href: '/applicant/pds',
    icon: FileText,
    roles: ['APPLICANT'],
  },
  {
    title: 'My Applications',
    href: '/applicant/applications',
    icon: ClipboardList,
    roles: ['APPLICANT'],
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();

  const basePath = user?.role === 'APPLICANT' ? '/applicant' : '/admin';

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );
  const profileHref = `${basePath}/profile`;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-12 items-center border-b px-4">
        <Link to={user?.role === 'APPLICANT' ? '/applicant/dashboard' : '/admin/dashboard'} className="flex items-center gap-2">
          {user?.lgu?.logo ? (
            <img src={user.lgu.logo} alt={user.lgu.name} className="h-6 w-6 rounded object-cover" />
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

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
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
