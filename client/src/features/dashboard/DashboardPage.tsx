import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Briefcase, Users, FileCheck, CheckCircle, GraduationCap, Building2,
  FolderTree, Shield, Eye, Loader2, ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import type { ApplicationStatus } from '@/types';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-gray-500 hover:bg-gray-600 text-white border-transparent' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
  ENDORSED: { label: 'Endorsed', className: 'bg-indigo-500 hover:bg-indigo-600 text-white border-transparent' },
  SHORTLISTED: { label: 'Shortlisted', className: 'bg-amber-500 hover:bg-amber-600 text-white border-transparent' },
  FOR_INTERVIEW: { label: 'For Interview', className: 'bg-purple-500 hover:bg-purple-600 text-white border-transparent' },
  INTERVIEWED: { label: 'Interviewed', className: 'bg-violet-500 hover:bg-violet-600 text-white border-transparent' },
  QUALIFIED: { label: 'Qualified', className: 'bg-teal-500 hover:bg-teal-600 text-white border-transparent' },
  SELECTED: { label: 'Selected', className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' },
  APPOINTED: { label: 'Appointed', className: 'bg-green-600 hover:bg-green-700 text-white border-transparent' },
  REJECTED: { label: 'Rejected', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-500 hover:bg-slate-600 text-white border-transparent' },
};

interface DashboardData {
  stats: {
    // Super Admin
    totalLgus?: number;
    totalUsers?: number;
    totalDepartments?: number;
    totalPositions?: number;
    // LGU Admin
    openPositions?: number;
    totalApplications?: number;
    pendingAppointments?: number;
    completedAppointments?: number;
    upcomingTrainings?: number;
    applicationsByStatus?: Record<string, number>;
  };
  recentPositions: {
    id: number;
    title: string;
    salaryGrade: number | null;
    slots: number;
    openDate: string | null;
    closeDate: string | null;
    status: string;
    department: { id: number; name: string } | null;
  }[];
  recentApplications: {
    id: number;
    status: ApplicationStatus;
    submittedAt: string;
    applicant: { id: number; firstName: string; lastName: string; email: string };
    position: { id: number; title: string };
  }[];
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats;

  if (isSuperAdmin) {
    return <SuperAdminDashboard stats={stats} />;
  }

  return <LguAdminDashboard data={data} navigate={navigate} />;
}

function SuperAdminDashboard({ stats }: { stats: DashboardData['stats'] | undefined }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">System Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total LGUs"
          value={stats?.totalLgus ?? 0}
          subtitle="Registered LGUs"
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          subtitle="Active users"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Departments"
          value={stats?.totalDepartments ?? 0}
          subtitle="Active departments"
          icon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Positions"
          value={stats?.totalPositions ?? 0}
          subtitle="All positions"
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}

function LguAdminDashboard({
  data,
  navigate,
}: {
  data: DashboardData | undefined;
  navigate: (path: string) => void;
}) {
  const { user } = useAuthStore();
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName} {user?.lastName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Positions"
          value={stats?.openPositions ?? 0}
          subtitle="Currently published"
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Applications"
          value={stats?.totalApplications ?? 0}
          subtitle="All applications"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Pending Appointments"
          value={stats?.pendingAppointments ?? 0}
          subtitle="Awaiting completion"
          icon={<FileCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Completed Appointments"
          value={stats?.completedAppointments ?? 0}
          subtitle="Fully onboarded"
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Application Pipeline Summary */}
      {stats?.applicationsByStatus && Object.keys(stats.applicationsByStatus).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.applicationsByStatus).map(([status, count]) => {
                const config = STATUS_CONFIG[status as ApplicationStatus];
                if (!config) return null;
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <Badge className={config.className}>{config.label}</Badge>
                    <span className="text-sm font-medium text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout for tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recently Published Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Recently Published Positions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/admin/positions')}
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {data?.recentPositions && data.recentPositions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Position</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">SG</TableHead>
                    <TableHead className="text-xs">Closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPositions.map((pos) => (
                    <TableRow
                      key={pos.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/positions`)}
                    >
                      <TableCell className="text-xs font-medium">{pos.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pos.department?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{pos.salaryGrade ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pos.closeDate ? format(new Date(pos.closeDate), 'MMM d, yyyy') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No open positions
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Applicants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Recent Applicants</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/admin/applications')}
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {data?.recentApplications && data.recentApplications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Applicant</TableHead>
                    <TableHead className="text-xs">Position</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentApplications.map((app) => (
                    <TableRow
                      key={app.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/applications/${app.id}`)}
                    >
                      <TableCell className="text-xs font-medium">
                        {app.applicant.firstName} {app.applicant.lastName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {app.position.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_CONFIG[app.status]?.className ?? ''}`}>
                          {STATUS_CONFIG[app.status]?.label ?? app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(app.submittedAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No applications yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Trainings indicator */}
      {(stats?.upcomingTrainings ?? 0) > 0 && (
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/admin/training')}
        >
          <CardContent className="flex items-center gap-3 py-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {stats!.upcomingTrainings} upcoming training{stats!.upcomingTrainings! > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">Click to view training schedule</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
