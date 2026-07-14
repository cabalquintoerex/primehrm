import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { ApplicationStatus } from '@/types';

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
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

export function DashboardLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
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
