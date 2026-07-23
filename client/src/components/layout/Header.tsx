import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Menu, User, GitBranch, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActiveModule, useModuleAccess } from '@/hooks/useActiveModule';
import { MODULES, logoutDestination } from '@/lib/modules';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout, lastLguSlug } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeModule = useActiveModule();
  const { canAccess } = useModuleAccess();

  // Profile lives inside whichever module you are in, so the sidebar keeps its context.
  const basePath = activeModule?.basePath ?? '/applicant';
  // The process flow documents the RSP pipeline, so it is only offered there.
  const showProcessFlow = activeModule?.key === 'RSP' || user?.role === 'APPLICANT';
  // Administration is reachable from any business module, but not from itself.
  const showAdminGear = canAccess('ADMIN') && activeModule?.key !== 'ADMIN';

  const handleLogout = async () => {
    // Resolve the destination before clearing the store — afterwards the LGU is gone.
    const destination = logoutDestination(user, lastLguSlug);
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    queryClient.clear();
    logout();
    navigate(destination);
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <p className="text-sm text-muted-foreground hidden md:block">
          Hi <span className="font-medium text-foreground">{user?.firstName}</span>, welcome to your PRIME-HRM! Have a great day.
        </p>
      </div>

      {showAdminGear && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to={MODULES.ADMIN.basePath} aria-label="Administration">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Administration</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(`${basePath}/profile`)} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {showProcessFlow && (
            <DropdownMenuItem
              onClick={() => navigate(`${basePath}/process-flow`)}
              className="cursor-pointer"
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Process Flow
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
