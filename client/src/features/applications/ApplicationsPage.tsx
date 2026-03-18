import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Application, ApplicationStatus, PaginatedResponse, Position } from '@/types';

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

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isOfficeAdmin = user?.role === 'LGU_OFFICE_ADMIN';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Application>>({
    queryKey: ['applications', search, statusFilter, positionFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { search, page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (positionFilter !== 'ALL') params.positionId = positionFilter;
      const { data } = await api.get('/applications', { params });
      return data;
    },
  });

  const { data: stats } = useQuery<Record<string, number>>({
    queryKey: ['applications-stats'],
    queryFn: async () => {
      const { data } = await api.get('/applications/stats');
      return data.data || data;
    },
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions-list'],
    queryFn: async () => {
      const { data } = await api.get('/positions', { params: { limit: 100 } });
      return data.data;
    },
  });

  const statuses: ApplicationStatus[] = [
    'SUBMITTED', 'ENDORSED', 'SHORTLISTED', 'FOR_INTERVIEW',
    'INTERVIEWED', 'QUALIFIED', 'SELECTED', 'APPOINTED', 'REJECTED', 'WITHDRAWN',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {data?.meta.total !== undefined ? `${data.meta.total} total applications` : 'Manage job applications'}
        </p>
        {isOfficeAdmin && (
          <p className="text-sm text-emerald-600 mt-1">
            Showing applications endorsed to your department.
          </p>
        )}
      </div>

      {/* Status Summary Cards */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const count = stats[status] || 0;
            if (count === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setStatusFilter(status); setPage(1); }}>
                <CardContent className="p-3 flex items-center gap-2">
                  <span className="text-lg font-bold">{count}</span>
                  <Badge className={config.className}>{config.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by applicant name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={(value) => { setPositionFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Positions</SelectItem>
            {positions?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Submitted</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/applications/${app.id}`)}
                >
                  <TableCell className="font-medium">
                    {app.applicant ? `${app.applicant.firstName} ${app.applicant.lastName}` : '-'}
                  </TableCell>
                  <TableCell>{app.position?.title || '-'}</TableCell>
                  <TableCell>{app.position?.department?.name || '-'}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={app.status} />
                  </TableCell>
                  <TableCell>
                    {app.submittedAt ? format(new Date(app.submittedAt), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/applications/${app.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= data.meta.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
