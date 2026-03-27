import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: number | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; role: string } | null;
}

interface PaginatedResponse {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface Filters {
  actions: string[];
  entities: string[];
}

const ACTION_COLORS: Record<string, string> = {
  SUBMIT_APPLICATION: 'bg-gray-500',
  ENDORSE_APPLICATION: 'bg-indigo-500',
  SHORTLIST_APPLICATION: 'bg-amber-500',
  REJECT_APPLICATION: 'bg-red-500',
  CREATE_INTERVIEW: 'bg-purple-500',
  COMPLETE_INTERVIEW: 'bg-violet-500',
  SAVE_ASSESSMENT_SCORE: 'bg-cyan-500',
  QUALIFY_APPLICANTS: 'bg-teal-500',
  SELECT_APPLICANTS: 'bg-emerald-500',
  CREATE_APPOINTMENT: 'bg-green-600',
  UPDATE_APPOINTMENT: 'bg-green-500',
  VERIFY_REQUIREMENT: 'bg-blue-500',
  UNVERIFY_REQUIREMENT: 'bg-orange-500',
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
};

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntity(entity: string): string {
  return entity.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: filters } = useQuery<Filters>({
    queryKey: ['audit-log-filters'],
    queryFn: async () => {
      const { data } = await api.get('/audit-logs/filters');
      return data.data;
    },
  });

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['audit-logs', debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (entityFilter !== 'ALL') params.entity = entityFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await api.get('/audit-logs', { params });
      return data;
    },
  });

  const clearFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = search || actionFilter !== 'ALL' || entityFilter !== 'ALL' || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all system actions and changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user, action..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                {filters?.actions.map((a) => (
                  <SelectItem key={a} value={a}>{formatAction(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Entities</SelectItem>
                {filters?.entities.map((e) => (
                  <SelectItem key={e} value={e}>{formatEntity(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              placeholder="From date"
            />

            <div className="flex gap-2">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                placeholder="To date"
              />
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[160px]">Date & Time</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Entity</TableHead>
                      <TableHead className="text-xs">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data && data.data.length > 0 ? (
                      data.data.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.user ? (
                              <div>
                                <span className="font-medium">{log.user.firstName} {log.user.lastName}</span>
                                <span className="text-muted-foreground ml-1 text-[10px]">
                                  ({log.user.role.replace(/_/g, ' ').toLowerCase()})
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] text-white border-transparent ${ACTION_COLORS[log.action] || 'bg-gray-500'}`}>
                              {formatAction(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium">{formatEntity(log.entity)}</span>
                            {log.entityId && (
                              <span className="text-muted-foreground ml-1">#{log.entityId}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                            <ChangeDetails oldValues={log.oldValues} newValues={log.newValues} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data?.meta && data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {((data.meta.page - 1) * data.meta.limit) + 1}–{Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {data.meta.page} of {data.meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChangeDetails({ oldValues, newValues }: { oldValues: any; newValues: any }) {
  if (!oldValues && !newValues) return <span>—</span>;

  const changes: string[] = [];

  if (newValues && typeof newValues === 'object') {
    for (const [key, val] of Object.entries(newValues)) {
      const oldVal = oldValues?.[key];
      if (oldVal !== undefined && oldVal !== val) {
        changes.push(`${formatKey(key)}: ${oldVal} → ${val}`);
      } else if (oldVal === undefined) {
        changes.push(`${formatKey(key)}: ${val}`);
      }
    }
  }

  if (changes.length === 0 && oldValues && newValues) {
    // Fallback: show status change
    if (oldValues.status && newValues.status) {
      return <span>{oldValues.status} → {newValues.status}</span>;
    }
  }

  return (
    <span className="truncate block" title={changes.join(', ')}>
      {changes.join(', ') || '—'}
    </span>
  );
}

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}
