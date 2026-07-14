import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, CalendarClock, Users, Percent, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard, DashboardLoader } from './components';

const TRAINING_STATUS: Record<string, { label: string; className: string }> = {
  UPCOMING: { label: 'Upcoming', className: 'bg-blue-500 text-white border-transparent' },
  ONGOING: { label: 'Ongoing', className: 'bg-amber-500 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-green-600 text-white border-transparent' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 text-white border-transparent' },
};

const TRAINING_TYPE_LABEL: Record<string, string> = {
  MANAGERIAL: 'Managerial',
  SUPERVISORY: 'Supervisory',
  TECHNICAL: 'Technical',
  FOUNDATION: 'Foundation',
};

interface LndDashboardData {
  stats: {
    totalTrainings: number;
    upcomingTrainings: number;
    ongoingTrainings: number;
    completedTrainings: number;
    totalParticipants: number;
    participantsTrained: number;
    completionRate: number;
  };
  recentTrainings: {
    id: number;
    title: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    numberOfHours: number | string | null;
    _count: { participants: number };
  }[];
}

export function LndDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<LndDashboardData>({
    queryKey: ['dashboard-lnd'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/lnd');
      return data.data;
    },
  });

  if (isLoading) return <DashboardLoader />;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Learning &amp; Development Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.firstName} {user?.lastName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Trainings"
          value={stats?.totalTrainings ?? 0}
          subtitle={`${stats?.completedTrainings ?? 0} completed`}
          icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Upcoming / Ongoing"
          value={`${stats?.upcomingTrainings ?? 0} / ${stats?.ongoingTrainings ?? 0}`}
          subtitle="Scheduled &amp; in progress"
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Participants Trained"
          value={stats?.participantsTrained ?? 0}
          subtitle={`of ${stats?.totalParticipants ?? 0} enrolled`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.completionRate ?? 0}%`}
          subtitle="Attended vs enrolled"
          icon={<Percent className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Recent Trainings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Recent Trainings</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate('/lnd/training')}>
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {data?.recentTrainings && data.recentTrainings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Schedule</TableHead>
                    <TableHead className="text-xs">Participants</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTrainings.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/lnd/training/${t.id}`)}
                    >
                      <TableCell className="text-xs font-medium">{t.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {TRAINING_TYPE_LABEL[t.type] ?? t.type}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(t.startDate), 'MMM d')} – {format(new Date(t.endDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-xs">{t._count.participants}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${TRAINING_STATUS[t.status]?.className ?? ''}`}>
                          {TRAINING_STATUS[t.status]?.label ?? t.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No trainings yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
