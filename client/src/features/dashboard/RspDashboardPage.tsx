import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, Users, FileCheck, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { ApplicationStatus } from '@/types';
import { StatCard, DashboardLoader, STATUS_CONFIG } from './components';

interface RspDashboardData {
  stats: {
    openPositions: number;
    totalApplications: number;
    pendingAppointments: number;
    completedAppointments: number;
    applicationsByStatus: Record<string, number>;
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

export function RspDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<RspDashboardData>({
    queryKey: ['dashboard-rsp'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/rsp');
      return data.data;
    },
  });

  if (isLoading) return <DashboardLoader />;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Recruitment Dashboard</h1>
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
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/rsp/positions')}>
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
                      onClick={() => navigate('/rsp/positions')}
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
              <p className="text-sm text-muted-foreground text-center py-6">No open positions</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Applicants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Recent Applicants</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/rsp/applications')}>
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
                      onClick={() => navigate(`/rsp/applications/${app.id}`)}
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
              <p className="text-sm text-muted-foreground text-center py-6">No applications yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
