import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { InterviewSchedule, InterviewStatus, Position, Application, PaginatedResponse } from '@/types';

const STATUS_CONFIG: Record<InterviewStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
};

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function InterviewsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formPositionId, setFormPositionId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([]);

  // Fetch interviews
  const { data: interviews, isLoading } = useQuery<InterviewSchedule[]>({
    queryKey: ['interviews', statusFilter, positionFilter],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (positionFilter !== 'ALL') params.positionId = positionFilter;
      const { data } = await api.get('/interviews', { params });
      return data.data;
    },
  });

  // Fetch positions for filter and form
  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions-list'],
    queryFn: async () => {
      const { data } = await api.get('/positions', { params: { limit: 100 } });
      return data.data;
    },
  });

  // Fetch applications for selected position in form
  const { data: applicationsForPosition } = useQuery<Application[]>({
    queryKey: ['applications-for-interview', formPositionId],
    queryFn: async () => {
      const results: Application[] = [];
      const [shortlisted, forInterview] = await Promise.all([
        api.get('/applications', { params: { positionId: formPositionId, status: 'SHORTLISTED', limit: 100 } }),
        api.get('/applications', { params: { positionId: formPositionId, status: 'FOR_INTERVIEW', limit: 100 } }),
      ]);
      results.push(...(shortlisted.data.data || []));
      results.push(...(forInterview.data.data || []));
      return results;
    },
    enabled: !!formPositionId,
  });

  // Create interview mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      positionId: number;
      scheduleDate: string;
      venue: string;
      notes: string;
      applicationIds: number[];
    }) => {
      return api.post('/interviews', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview scheduled successfully');
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to schedule interview');
    },
  });

  const resetForm = () => {
    setFormPositionId('');
    setFormDate('');
    setFormVenue('');
    setFormNotes('');
    setSelectedApplicationIds([]);
  };

  const handleCreate = () => {
    if (!formPositionId || !formDate) {
      toast.error('Position and schedule date are required');
      return;
    }
    createMutation.mutate({
      positionId: Number(formPositionId),
      scheduleDate: new Date(formDate).toISOString(),
      venue: formVenue,
      notes: formNotes,
      applicationIds: selectedApplicationIds,
    });
  };

  const toggleApplication = (appId: number) => {
    setSelectedApplicationIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Interview Schedules</h1>
          <p className="text-sm text-muted-foreground">Manage interview schedules for positions</p>
        </div>
        {!isSuperAdmin && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule Interview
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={positionFilter} onValueChange={setPositionFilter}>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Schedule Date/Time</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Applicants</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : !interviews || interviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No interview schedules found
                </TableCell>
              </TableRow>
            ) : (
              interviews.map((interview) => (
                <TableRow
                  key={interview.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/interviews/${interview.id}`)}
                >
                  <TableCell className="font-medium">
                    {interview.position?.title || '-'}
                    {interview.position?.department && (
                      <span className="text-xs text-muted-foreground block">
                        {interview.position.department.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {interview.scheduleDate
                      ? format(new Date(interview.scheduleDate), 'MMM d, yyyy h:mm a')
                      : '-'}
                  </TableCell>
                  <TableCell>{interview.venue || '-'}</TableCell>
                  <TableCell>{interview._count?.applicants ?? interview.applicants?.length ?? 0}</TableCell>
                  <TableCell>
                    <InterviewStatusBadge status={interview.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Interview Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Set up an interview schedule and assign applicants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Position *</Label>
              <Select value={formPositionId} onValueChange={(val) => { setFormPositionId(val); setSelectedApplicationIds([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {positions?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule Date & Time *</Label>
              <Input
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                placeholder="Enter venue"
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
            {formPositionId && (
              <div className="space-y-2">
                <Label>Applicants</Label>
                {!applicationsForPosition || applicationsForPosition.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shortlisted or for-interview applicants found for this position.</p>
                ) : (
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {applicationsForPosition.map((app) => (
                      <label key={app.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={selectedApplicationIds.includes(app.id)}
                          onChange={() => toggleApplication(app.id)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                          {app.applicant ? `${app.applicant.firstName} ${app.applicant.lastName}` : `Application #${app.id}`}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">{app.status}</Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
