import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, FileCheck, Clock, CheckCircle2, Eye, FileDown, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateAppointmentTransmittal } from '@/lib/generateAppointmentTransmittal';
import { generateAppointmentTransmittalExcel } from '@/lib/generateAppointmentTransmittalExcel';
import type { Appointment, Position } from '@/types';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-500 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500 text-white border-transparent' },
};

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions-list'],
    queryFn: async () => {
      const { data } = await api.get('/positions', { params: { limit: 100 } });
      return data.data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['appointment-stats'],
    queryFn: async () => {
      const { data } = await api.get('/appointments/stats');
      return data.data;
    },
    staleTime: 0,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter, positionFilter, page],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (positionFilter !== 'all') params.positionId = positionFilter;
      const { data } = await api.get('/appointments', { params });
      return data;
    },
    staleTime: 0,
  });

  const appointments: Appointment[] = response?.data || [];
  const meta = response?.meta;

  const { user } = useAuthStore();
  const [transmittalFormat, setTransmittalFormat] = useState<'pdf' | 'excel' | null>(null);

  // CS Form No. 1 covers appointees whose final requirements are all verified — that is exactly
  // what COMPLETED means, so the transmittal is built from completed appointments only.
  const transmittalMutation = useMutation({
    mutationFn: async (fileFormat: 'pdf' | 'excel') => {
      setTransmittalFormat(fileFormat);
      const { data } = await api.get('/appointments', {
        params: { status: 'COMPLETED', limit: 100 },
      });
      const completed: Appointment[] = data.data || [];
      if (completed.length === 0) {
        throw new Error('NO_COMPLETED');
      }

      const mmddyyyy = (value?: string | null) =>
        value ? format(new Date(value), 'MM/dd/yyyy') : '';

      const appointees = await Promise.all(
        completed.map(async (appt) => {
          const applicant = appt.application?.applicant;
          let pds: any = {};
          try {
            const { data: detail } = await api.get(`/applications/${appt.applicationId}`);
            pds = detail.data?.personalDataSheet?.data ?? {};
          } catch {
            // Fall back to the account name — the form still prints, just without middle name
          }
          const position = appt.position;
          const publicationPeriod =
            position?.openDate && position?.closeDate
              ? `${mmddyyyy(position.openDate)} to ${mmddyyyy(position.closeDate)}`
              : '';
          return {
            lastName: pds.surname || applicant?.lastName || '',
            firstName: pds.firstName || applicant?.firstName || '',
            nameExtension: pds.nameExtension || '',
            middleName: pds.middleName || '',
            positionTitle: position?.title || '',
            salaryGrade: position?.salaryGrade ?? null,
            employmentStatus: '',
            periodOfEmployment: '',
            natureOfAppointment: '',
            dateOfIssuance: mmddyyyy(appt.appointmentDate),
            publicationPeriod,
            publicationMode: '',
          };
        })
      );

      const payload = {
        agencyName: user?.lgu?.name || '',
        cscFieldOffice: '',
        hrmoName: '',
        appointees,
      };

      if (fileFormat === 'excel') {
        await generateAppointmentTransmittalExcel(payload);
      } else {
        generateAppointmentTransmittal(payload);
      }
    },
    onSettled: () => setTransmittalFormat(null),
    onError: (error: any) => {
      if (error instanceof Error && error.message === 'NO_COMPLETED') {
        toast.error('No appointments have all requirements verified yet');
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to generate the transmittal form');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage appointments, generate forms, and verify final requirements.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">CS Form No. 1</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => transmittalMutation.mutate('excel')}
            disabled={transmittalMutation.isPending}
            title="Excel — leaves the manually-filled fields empty and typeable"
          >
            {transmittalMutation.isPending && transmittalFormat === 'excel' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => transmittalMutation.mutate('pdf')}
            disabled={transmittalMutation.isPending}
            title="PDF — print-ready"
          >
            {transmittalMutation.isPending && transmittalFormat === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
              <FileCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statsData?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total Appointments</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statsData?.pending || 0}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statsData?.completed || 0}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={(v) => { setPositionFilter(v); setPage(1); }}>
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
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No appointments found.</p>
          <p className="text-xs text-muted-foreground mt-1">Appointments are created from the Selection page after selecting applicants.</p>
        </Card>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointee</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Appointment Date</TableHead>
                  <TableHead>Oath Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => {
                  const applicant = appt.application?.applicant;
                  const badge = STATUS_BADGE[appt.status] || STATUS_BADGE.PENDING;
                  return (
                    <TableRow key={appt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {applicant ? `${applicant.lastName}, ${applicant.firstName}` : 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">{applicant?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{appt.position?.title}</p>
                          {appt.position?.itemNumber && (
                            <p className="text-xs text-muted-foreground">Item No. {appt.position.itemNumber}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{appt.position?.department?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(appt.appointmentDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {appt.oathDate ? format(new Date(appt.oathDate), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/rsp/appointments/${appt.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
