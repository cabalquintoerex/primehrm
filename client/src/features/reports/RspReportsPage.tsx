import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { STATUS_COLORS, formatLabel, ChartLoader, EmptyChart } from './reportCharts';

interface PositionReports {
  byStatus: { status: string; count: number }[];
  byDepartment: { department: string; count: number }[];
}

interface ApplicationReports {
  byStatus: { status: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
}

export function RspReportsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Recruitment Reports</h1>
        <p className="text-sm text-muted-foreground">Positions and application pipeline analytics</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-6 mt-4">
          {posLoading ? <ChartLoader /> : posData && <PositionCharts data={posData} />}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6 mt-4">
          {appLoading ? <ChartLoader /> : appData && <ApplicationCharts data={appData} />}
        </TabsContent>
      </Tabs>
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
