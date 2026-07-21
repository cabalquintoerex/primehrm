import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Briefcase, Calendar, Paperclip, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  ApplicationHistoryTimeline,
  formatStatus,
} from '@/features/applications/ApplicationHistoryTimeline';
import type { Application, ApplicationStatus } from '@/types';

function statusColor(status: ApplicationStatus): string {
  const colors: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    ENDORSED: 'bg-purple-100 text-purple-700',
    SHORTLISTED: 'bg-indigo-100 text-indigo-700',
    FOR_INTERVIEW: 'bg-cyan-100 text-cyan-700',
    INTERVIEWED: 'bg-teal-100 text-teal-700',
    QUALIFIED: 'bg-emerald-100 text-emerald-700',
    SELECTED: 'bg-green-100 text-green-700',
    APPOINTED: 'bg-green-200 text-green-800',
    REJECTED: 'bg-red-100 text-red-700',
    WITHDRAWN: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function MyApplicationsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['my-applications'],
    queryFn: async () => {
      const { data } = await api.get('/applications/my');
      return data.data || data || [];
    },
  });

  const toggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Applications</h1>
        <p className="text-sm text-muted-foreground">Track the status of your submitted applications.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : !applications || applications.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">You haven't submitted any applications yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Browse career opportunities to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const isExpanded = expandedId === app.id;
            return (
              <Card key={app.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(app.id)}
                  className="w-full p-4 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {app.position?.title || `Position #${app.positionId}`}
                      </h3>
                      {app.position?.department?.name && (
                        <p className="text-xs text-muted-foreground">{app.position.department.name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(app.submittedAt), 'MMM dd, yyyy')}
                        </span>
                        {app.documents && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {app.documents.length} document{app.documents.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${statusColor(app.status)} border-0 text-[11px]`}>
                        {formatStatus(app.status)}
                      </Badge>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    <ApplicationHistoryTimeline applicationId={app.id} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
