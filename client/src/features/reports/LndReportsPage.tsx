import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { STATUS_COLORS, formatLabel, ChartLoader, EmptyChart } from './reportCharts';

interface TrainingReports {
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

export function LndReportsPage() {
  const { data, isLoading } = useQuery<TrainingReports>({
    queryKey: ['reports-trainings'],
    queryFn: async () => {
      const { data } = await api.get('/reports/trainings');
      return data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Learning &amp; Development Reports</h1>
        <p className="text-sm text-muted-foreground">Training program analytics</p>
      </div>

      {isLoading ? <ChartLoader /> : data && <TrainingCharts data={data} />}
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
