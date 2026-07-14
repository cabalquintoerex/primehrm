import { Loader2 } from 'lucide-react';

export const STATUS_COLORS: Record<string, string> = {
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

export function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ChartLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
      No data available
    </div>
  );
}
