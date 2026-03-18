import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Award, CheckCircle2, Users, Briefcase, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Position, Department, AssessmentScore, ApplicationStatus } from '@/types';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  QUALIFIED: { label: 'Qualified', className: 'bg-teal-500 text-white border-transparent' },
  SELECTED: { label: 'Selected', className: 'bg-emerald-500 text-white border-transparent' },
  APPOINTED: { label: 'Appointed', className: 'bg-blue-500 text-white border-transparent' },
};

export function SelectionPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [appointDialog, setAppointDialog] = useState<{ applicationId: number; applicantName: string } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [oathDate, setOathDate] = useState('');

  // Fetch positions for filter
  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions-list'],
    queryFn: async () => {
      const { data } = await api.get('/positions', { params: { limit: 100 } });
      return data.data;
    },
  });

  // Fetch departments for filter
  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data;
    },
  });

  // Fetch qualified applicants with scores
  const { data: assessments, isLoading } = useQuery<AssessmentScore[]>({
    queryKey: ['qualified-applicants', positionFilter, departmentFilter],
    queryFn: async () => {
      const params: any = {};
      if (positionFilter !== 'all') params.positionId = positionFilter;
      if (departmentFilter !== 'all') params.departmentId = departmentFilter;
      const { data } = await api.get('/assessments/qualified', { params });
      return data.data || [];
    },
    staleTime: 0,
  });

  // Select for appointment mutation
  const selectMutation = useMutation({
    mutationFn: async (applicationIds: number[]) => {
      return api.post('/assessments/select', { applicationIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualified-applicants'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Applicants selected for appointment');
      setSelected(new Set());
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to select applicants');
    },
  });

  // Appoint mutation
  const appointMutation = useMutation({
    mutationFn: async (data: { applicationId: number; appointmentDate: string; oathDate?: string }) => {
      return api.post('/appointments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualified-applicants'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      toast.success('Appointment created successfully');
      setAppointDialog(null);
      setAppointmentDate('');
      setOathDate('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    },
  });

  // Group assessments by position
  const grouped = (assessments || []).reduce<Record<number, { position: AssessmentScore['position']; items: AssessmentScore[] }>>((acc, a) => {
    const posId = a.positionId;
    if (!acc[posId]) {
      acc[posId] = { position: a.position, items: [] };
    }
    acc[posId].items.push(a);
    return acc;
  }, {});

  const toggleSelect = (applicationId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  const handleSelectForAppointment = () => {
    if (selected.size === 0) {
      toast.error('Please select at least one applicant');
      return;
    }
    selectMutation.mutate(Array.from(selected));
  };

  // Count qualified (not yet selected) per position
  const getQualifiedCount = (items: AssessmentScore[]) =>
    items.filter((a) => a.application?.status === 'QUALIFIED').length;

  const getSelectedCount = (items: AssessmentScore[]) =>
    items.filter((a) => a.application?.status === 'SELECTED').length;

  const totalQualified = assessments?.filter((a) => a.application?.status === 'QUALIFIED').length || 0;
  const totalSelected = assessments?.filter((a) => a.application?.status === 'SELECTED').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight">Selection for Appointment</h1>
        <p className="text-sm text-muted-foreground">Review qualified applicants and select for appointment based on assessment scores.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-teal-50">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalQualified}</p>
              <p className="text-xs text-muted-foreground">Qualified Applicants</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSelected}</p>
              <p className="text-xs text-muted-foreground">Selected for Appointment</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{selected.size}</p>
              <p className="text-xs text-muted-foreground">Currently Checked</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={positionFilter} onValueChange={(v) => { setPositionFilter(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by Position" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positions?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isSuperAdmin && selected.size > 0 && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 ml-auto"
            onClick={handleSelectForAppointment}
            disabled={selectMutation.isPending}
          >
            {selectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Award className="mr-2 h-4 w-4" />
            Select for Appointment ({selected.size})
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No qualified applicants found.</p>
          <p className="text-xs text-muted-foreground mt-1">Applicants must be assessed and qualified through the Interview module first.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([posId, group]) => {
            const pos = group.position;
            const slots = pos?.slots || 1;
            const qualifiedCount = getQualifiedCount(group.items);
            const selectedCount = getSelectedCount(group.items);
            const selectedInPosition = group.items.filter(
              (a) => a.application?.status === 'QUALIFIED' && selected.has(a.applicationId)
            ).length;

            return (
              <Card key={posId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{pos?.title || 'Unknown Position'}</CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {pos?.itemNumber && <span>Item No. {pos.itemNumber}</span>}
                        {pos?.department?.name && <span>{pos.department.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Vacancy Slots</p>
                      <p className="text-lg font-bold text-gray-900">{slots}</p>
                      {selectedCount > 0 && (
                        <p className="text-xs text-emerald-600">{selectedCount} already selected</p>
                      )}
                    </div>
                  </div>
                  {selectedInPosition + selectedCount > slots && (
                    <p className="text-xs text-amber-600 mt-2">
                      Warning: Selections ({selectedInPosition + selectedCount}) exceed available slots ({slots})
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.items.map((assessment, index) => {
                      const app = assessment.application;
                      const applicant = app?.applicant;
                      const status = app?.status as ApplicationStatus;
                      const isAlreadySelected = status === 'SELECTED';
                      const isAppointed = status === 'APPOINTED';
                      const isChecked = selected.has(assessment.applicationId);
                      const badge = STATUS_BADGE[status] || STATUS_BADGE.QUALIFIED;

                      return (
                        <div
                          key={assessment.id}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                            isChecked ? 'border-emerald-300 bg-emerald-50/50' : 'hover:bg-muted/30'
                          } ${isAlreadySelected || isAppointed ? 'opacity-60' : ''}`}
                        >
                          {/* Rank */}
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-sm font-bold text-gray-600 shrink-0">
                            {index + 1}
                          </div>

                          {/* Checkbox */}
                          {!isSuperAdmin && (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAlreadySelected || isAppointed}
                              onChange={() => toggleSelect(assessment.applicationId)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                            />
                          )}

                          {/* Name & Email */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {applicant ? `${applicant.lastName}, ${applicant.firstName}` : 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">{applicant?.email || ''}</p>
                          </div>

                          {/* Score */}
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-gray-900">
                              {assessment.totalScore != null ? Number(assessment.totalScore).toFixed(2) : '-'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Total Score</p>
                          </div>

                          {/* Appoint button for SELECTED */}
                          {!isSuperAdmin && isAlreadySelected && !isAppointed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 text-blue-600 border-blue-300 hover:bg-blue-50"
                              onClick={() => setAppointDialog({
                                applicationId: assessment.applicationId,
                                applicantName: applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Unknown',
                              })}
                            >
                              <FileCheck className="mr-1 h-3.5 w-3.5" />
                              Appoint
                            </Button>
                          )}

                          {/* Status Badge */}
                          <Badge className={`${badge.className} shrink-0`}>{badge.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Appoint Dialog */}
      <Dialog open={!!appointDialog} onOpenChange={(open) => { if (!open) setAppointDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Appointment</DialogTitle>
            <DialogDescription>
              Set appointment and oath dates for {appointDialog?.applicantName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Appointment Date *</Label>
              <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
            </div>
            <div>
              <Label>Oath Date (optional)</Label>
              <Input type="date" value={oathDate} onChange={(e) => setOathDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!appointDialog || !appointmentDate) {
                  toast.error('Please set an appointment date');
                  return;
                }
                appointMutation.mutate({
                  applicationId: appointDialog.applicationId,
                  appointmentDate,
                  oathDate: oathDate || undefined,
                });
              }}
              disabled={appointMutation.isPending || !appointmentDate}
            >
              {appointMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
