import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Loader2, Circle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * Status audit trail for a single application. Shared by the applicant's My Applications page
 * and the HR/office admin application detail page so the two can't drift apart.
 */

export interface ApplicationAuditLog {
  id: number;
  action: string;
  createdAt: string;
  oldValues?: any;
  newValues?: any;
  user?: { firstName: string; lastName: string; role: string };
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function statusDotColor(status: string): string {
  const colors: Record<string, string> = {
    SUBMITTED: 'text-blue-500',
    UNDER_REVIEW: 'text-amber-500',
    ENDORSED: 'text-purple-500',
    SHORTLISTED: 'text-indigo-500',
    FOR_INTERVIEW: 'text-cyan-500',
    INTERVIEWED: 'text-teal-500',
    QUALIFIED: 'text-emerald-500',
    SELECTED: 'text-green-500',
    APPOINTED: 'text-green-600',
    REJECTED: 'text-red-500',
    WITHDRAWN: 'text-gray-500',
  };
  return colors[status] || 'text-gray-400';
}

/** Maps an audit action to the status it lands the application on (for the dot colour). */
export function actionToStatus(action: string): string {
  const map: Record<string, string> = {
    SUBMIT_APPLICATION: 'SUBMITTED',
    ENDORSE_APPLICATION: 'ENDORSED',
    SHORTLIST_APPLICATION: 'SHORTLISTED',
    UPDATE_APPLICATION_STATUS: '',
    CREATE_INTERVIEW: 'FOR INTERVIEW',
    MARK_ATTENDANCE: 'FOR INTERVIEW',
    COMPLETE_INTERVIEW: 'INTERVIEWED',
    SAVE_ASSESSMENT_SCORE: 'ASSESSED',
    QUALIFY_APPLICANTS: 'QUALIFIED',
    SELECT_APPLICANTS: 'SELECTED',
    CREATE_APPOINTMENT: 'APPOINTED',
  };
  return map[action] || action.replace(/_/g, ' ');
}

export function actionLabel(action: string, newValues?: any): string {
  if (action === 'UPDATE_APPLICATION_STATUS' && newValues?.status) {
    return `Status changed to ${formatStatus(newValues.status)}`;
  }
  const labels: Record<string, string> = {
    SUBMIT_APPLICATION: 'Application submitted',
    ENDORSE_APPLICATION: 'Endorsed by office',
    SHORTLIST_APPLICATION: 'Shortlisted for evaluation',
    CREATE_INTERVIEW: 'Scheduled for interview',
    MARK_ATTENDANCE: 'Attendance marked',
    COMPLETE_INTERVIEW: 'Interview completed',
    SAVE_ASSESSMENT_SCORE: 'Assessment score recorded',
    QUALIFY_APPLICANTS: 'Qualified based on assessment',
    SELECT_APPLICANTS: 'Selected for appointment',
    CREATE_APPOINTMENT: 'Appointed to position',
  };
  return labels[action] || formatStatus(action);
}

export function ApplicationHistoryTimeline({ applicationId }: { applicationId: number }) {
  const { data: logs, isLoading } = useQuery<ApplicationAuditLog[]>({
    queryKey: ['application-history', applicationId],
    queryFn: async () => {
      const { data } = await api.get(`/applications/${applicationId}/history`);
      return data.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No history available.</p>;
  }

  return (
    <div className="relative pl-6 pt-2 pb-1 space-y-3">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-4 bottom-3 w-px bg-border" />

      {logs.map((log, i) => {
        const status = log.newValues?.status || actionToStatus(log.action);
        const isLast = i === logs.length - 1;
        return (
          <div key={log.id} className="relative flex gap-3 items-start">
            <div className="absolute -left-6 top-0.5">
              {isLast ? (
                <CheckCircle2 className={cn('h-[18px] w-[18px]', statusDotColor(status))} />
              ) : (
                <Circle className={cn('h-[18px] w-[18px] fill-background', statusDotColor(status))} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">
                {actionLabel(log.action, log.newValues)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(log.createdAt), 'MMM dd, yyyy h:mm a')}
                </span>
                {log.user && log.user.role !== 'APPLICANT' && (
                  <span className="text-[11px] text-muted-foreground">
                    by {log.user.firstName} {log.user.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
