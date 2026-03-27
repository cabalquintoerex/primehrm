import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  OPEN: '#22c55e',
  CLOSED: '#f59e0b',
  FILLED: '#3b82f6',
  SUBMITTED: '#6b7280',
  ENDORSED: '#6366f1',
  SHORTLISTED: '#f59e0b',
  FOR_INTERVIEW: '#a855f7',
  INTERVIEWED: '#8b5cf6',
  QUALIFIED: '#14b8a6',
  SELECTED: '#10b981',
  APPOINTED: '#16a34a',
  REJECTED: '#ef4444',
  WITHDRAWN: '#64748b',
  UPCOMING: '#3b82f6',
  ONGOING: '#f59e0b',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
  MANAGERIAL: '#6366f1',
  SUPERVISORY: '#f59e0b',
  TECHNICAL: '#3b82f6',
  FOUNDATION: '#22c55e',
  PENDING: '#f59e0b',
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#a855f7', '#f97316', '#64748b', '#10b981', '#8b5cf6'];

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('For Interview', 'For Interview');
}

interface PositionReports {
  byStatus: { status: string; count: number }[];
  byDepartment: { department: string; count: number }[];
}

interface ApplicationReports {
  byStatus: { status: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

interface TrainingReports {
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export function ReportsPage() {
  const [tab, setTab] = useState('positions');

  const { data: posData, isLoading: posLoading } = useQuery<PositionReports>({
    queryKey: ['reports-positions'],
    queryFn: async () => {
      const { data } = await api.get('/reports/positions');
      return data.data;
    },
  });

  const { data: appData, isLoading: appLoading } = useQuery<ApplicationReports>({
    queryKey: ['reports-applications'],
    queryFn: async () => {
      const { data } = await api.get('/reports/applications');
      return data.data;
    },
  });

  const { data: trainData, isLoading: trainLoading } = useQuery<TrainingReports>({
    queryKey: ['reports-trainings'],
    queryFn: async () => {
      const { data } = await api.get('/reports/trainings');
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Analytics and insights</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="trainings">Training</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-6 mt-4">
          {posLoading ? <ChartLoader /> : posData && <PositionCharts data={posData} />}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6 mt-4">
          {appLoading ? <ChartLoader /> : appData && <ApplicationCharts data={appData} />}
        </TabsContent>

        <TabsContent value="trainings" className="space-y-6 mt-4">
          {trainLoading ? <ChartLoader /> : trainData && <TrainingCharts data={trainData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function PositionCharts({ data }: { data: PositionReports }) {
  const statusData = data.byStatus.map((d) => ({
    ...d,
    label: formatLabel(d.status),
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Positions by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="label"
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Positions by Department</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byDepartment.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byDepartment} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicationCharts({ data }: { data: ApplicationReports }) {
  const pipelineData = data.byStatus.map((d) => ({
    ...d,
    label: formatLabel(d.status),
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  }));

  const trendData = data.monthlyTrend.map((d) => {
    const [year, month] = d.month.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return {
      ...d,
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Application Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Monthly Application Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrainingCharts({ data }: { data: TrainingReports }) {
  const typeData = data.byType.map((d) => ({
    ...d,
    label: formatLabel(d.type),
    fill: STATUS_COLORS[d.type] || '#94a3b8',
  }));

  const statusData = data.byStatus.map((d) => ({
    ...d,
    label: formatLabel(d.status),
    fill: STATUS_COLORS[d.status] || '#94a3b8',
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Trainings by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="count"
                  nameKey="label"
                  label={({ label, count }) => `${label}: ${count}`}
                >
                  {typeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Trainings by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
      No data available
    </div>
  );
}
