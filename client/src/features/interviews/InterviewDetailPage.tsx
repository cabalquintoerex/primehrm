import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, CheckCircle, ClipboardCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { InterviewSchedule, InterviewStatus, ApplicationStatus } from '@/types';

const STATUS_CONFIG: Record<InterviewStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' },
  COMPLETED: { label: 'Completed', className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500 hover:bg-red-600 text-white border-transparent' },
};

const APP_STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
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

export function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});

  const { data: interview, isLoading } = useQuery<InterviewSchedule>({
    queryKey: ['interview', id],
    queryFn: async () => {
      const { data } = await api.get(`/interviews/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Complete interview mutation
  const completeMutation = useMutation({
    mutationFn: async (attendanceData: { applicationId: number; attended: boolean }[]) => {
      return api.put(`/interviews/${id}/complete`, { attendance: attendanceData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Interview marked as completed');
      setCompleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete interview');
    },
  });

  // Cancel interview mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/interviews/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Interview cancelled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel interview');
    },
  });

  // Mark individual applicant as not attending
  const noShowMutation = useMutation({
    mutationFn: async ({ applicationId, attended }: { applicationId: number; attended: boolean }) => {
      return api.put(`/interviews/${id}/attendance`, { applicationId, attended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Attendance updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    },
  });

  const openCompleteDialog = () => {
    if (interview?.applicants) {
      const initial: Record<number, boolean> = {};
      interview.applicants.forEach((a) => {
        initial[a.id] = a.attended ?? true;
      });
      setAttendance(initial);
    }
    setCompleteDialogOpen(true);
  };

  const handleComplete = () => {
    if (!interview?.applicants) return;
    const attendanceData = interview.applicants.map((a) => ({
      applicationId: a.applicationId,
      attended: attendance[a.id] ?? false,
    }));
    completeMutation.mutate(attendanceData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/interviews')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Interviews
        </Button>
        <p className="text-muted-foreground">Interview schedule not found.</p>
      </div>
    );
  }

  const isScheduled = interview.status === 'SCHEDULED';
  const isCompleted = interview.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/interviews')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">
            {interview.position?.title || 'Interview Schedule'}
          </h1>
          <p className="text-muted-foreground">
            {interview.scheduleDate
              ? format(new Date(interview.scheduleDate), 'MMMM d, yyyy h:mm a')
              : 'No date set'}
          </p>
        </div>
        <Badge className={STATUS_CONFIG[interview.status].className}>
          {STATUS_CONFIG[interview.status].label}
        </Badge>
      </div>

      {/* Interview Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Interview Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Position</p>
              <p className="font-medium">{interview.position?.title || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Item Number</p>
              <p className="font-medium">{interview.position?.itemNumber || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{interview.position?.department?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Venue</p>
              <p className="font-medium">{interview.venue || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Schedule Date & Time</p>
              <p className="font-medium">
                {interview.scheduleDate
                  ? format(new Date(interview.scheduleDate), 'MMMM d, yyyy h:mm a')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Created By</p>
              <p className="font-medium">
                {interview.creator
                  ? `${interview.creator.firstName} ${interview.creator.lastName}`
                  : '-'}
              </p>
            </div>
            {interview.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{interview.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isScheduled && !isSuperAdmin && (
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openCompleteDialog}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Complete
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Interview
          </Button>
        </div>
      )}

      {isCompleted && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Interview Completed</p>
              <p className="text-xs text-muted-foreground">Proceed to encode assessment scores for the applicants.</p>
            </div>
            <Link to={`/admin/assessments/${interview.positionId}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Encode Assessment Scores
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Applicants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Applicants</CardTitle>
        </CardHeader>
        <CardContent>
          {!interview.applicants || interview.applicants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applicants assigned to this interview.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Application Status</TableHead>
                    <TableHead>Attended</TableHead>
                    {isScheduled && !isSuperAdmin && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interview.applicants.map((ia) => {
                    const app = ia.application;
                    const applicant = app?.applicant;
                    return (
                      <TableRow key={ia.id}>
                        <TableCell className="font-medium">
                          {applicant ? `${applicant.firstName} ${applicant.lastName}` : '-'}
                        </TableCell>
                        <TableCell>{applicant?.email || '-'}</TableCell>
                        <TableCell>
                          {app && (
                            <Badge className={APP_STATUS_CONFIG[app.status].className}>
                              {APP_STATUS_CONFIG[app.status].label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {ia.attended === null ? (
                            <Badge variant="outline">Pending</Badge>
                          ) : ia.attended ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-transparent">Yes</Badge>
                          ) : (
                            <Badge className="bg-red-500 hover:bg-red-600 text-white border-transparent">No Show</Badge>
                          )}
                        </TableCell>
                        {isScheduled && !isSuperAdmin && (
                          <TableCell className="text-right">
                            {ia.attended === false ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => noShowMutation.mutate({ applicationId: ia.applicationId, attended: true })}
                                disabled={noShowMutation.isPending}
                              >
                                Undo
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => noShowMutation.mutate({ applicationId: ia.applicationId, attended: false })}
                                disabled={noShowMutation.isPending}
                              >
                                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                No Show
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Interview Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Interview as Complete</DialogTitle>
            <DialogDescription>
              Mark attendance for each applicant. Applicants marked as attended will have their application status updated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {interview.applicants?.map((ia) => {
              const applicant = ia.application?.applicant;
              return (
                <label key={ia.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={attendance[ia.id] ?? false}
                    onChange={(e) => setAttendance((prev) => ({ ...prev, [ia.id]: e.target.checked }))}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium">
                    {applicant ? `${applicant.firstName} ${applicant.lastName}` : `Applicant #${ia.applicationId}`}
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
