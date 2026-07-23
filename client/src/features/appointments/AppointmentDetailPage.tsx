import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Loader2, FileDown, CheckCircle2, XCircle, Plus, Trash2, FileText,
  Calendar, MapPin, Building2, User, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  generateAppointmentForm,
  generateOathOfOffice,
  generateAssumptionToDuty,
} from '@/lib/generateAppointmentForms';
import type { Appointment, FinalRequirement, PDSData } from '@/types';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [showAddReq, setShowAddReq] = useState(false);
  const [newReqName, setNewReqName] = useState('');
  const [newReqDesc, setNewReqDesc] = useState('');
  const [showEditDates, setShowEditDates] = useState(false);
  const [editAppointmentDate, setEditAppointmentDate] = useState('');
  const [editOathDate, setEditOathDate] = useState('');

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data } = await api.get(`/appointments/${id}`);
      return data.data;
    },
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.put(`/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      toast.success('Appointment updated');
      setShowEditDates(false);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to update'),
  });

  const addReqMutation = useMutation({
    mutationFn: async (data: { requirementName: string; description: string }) =>
      api.post(`/appointments/${id}/requirements`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      toast.success('Requirement added');
      setShowAddReq(false);
      setNewReqName('');
      setNewReqDesc('');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to add requirement'),
  });

  const deleteReqMutation = useMutation({
    mutationFn: async (reqId: number) => api.delete(`/appointments/requirements/${reqId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      toast.success('Requirement removed');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to delete'),
  });

  const verifyMutation = useMutation({
    mutationFn: async (reqId: number) => api.put(`/appointments/requirements/${reqId}/verify`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      if (response.data.appointmentCompleted) {
        toast.success('All requirements verified — appointment completed!');
      } else {
        toast.success('Requirement verified');
      }
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to verify'),
  });

  const unverifyMutation = useMutation({
    mutationFn: async (reqId: number) => api.put(`/appointments/requirements/${reqId}/unverify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] });
      toast.success('Verification reverted');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to unverify'),
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Appointment not found.</p>
        <Button variant="link" onClick={() => navigate('/rsp/appointments')}>Back to Appointments</Button>
      </div>
    );
  }

  const applicant = appointment.application?.applicant;
  const position = appointment.position;
  const lgu = position?.lgu;
  const pdsData: PDSData | null = appointment.pds?.data || null;
  const requirements = appointment.finalRequirements || [];
  const verifiedCount = requirements.filter((r) => r.isVerified).length;
  const totalReqs = requirements.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/rsp/appointments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">Appointment Details</h1>
          <p className="text-muted-foreground">
            {applicant ? `${applicant.firstName} ${applicant.lastName}` : 'Unknown'} — {position?.title}
          </p>
        </div>
        <Badge className={appointment.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-transparent' : 'bg-amber-500 text-white border-transparent'}>
          {appointment.status}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Appointee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{applicant ? `${applicant.lastName}, ${applicant.firstName}` : '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{applicant?.email || '—'}</span>
            </div>
            {pdsData && (
              <>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {[pdsData.residentialAddress?.street, pdsData.residentialAddress?.barangay, pdsData.residentialAddress?.city].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Position & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{position?.title}</span>
              {position?.itemNumber && <span className="text-xs text-muted-foreground">(Item No. {position.itemNumber})</span>}
            </div>
            {position?.department?.name && (
              <p className="text-sm text-muted-foreground ml-6">{position.department.name}</p>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Appointment: {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Oath: {appointment.oathDate ? format(new Date(appointment.oathDate), 'MMMM d, yyyy') : 'Not set'}
              </span>
            </div>
            {!isSuperAdmin && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => {
                setEditAppointmentDate(format(new Date(appointment.appointmentDate), 'yyyy-MM-dd'));
                setEditOathDate(appointment.oathDate ? format(new Date(appointment.oathDate), 'yyyy-MM-dd') : '');
                setShowEditDates(true);
              }}>
                Edit Dates
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => generateAppointmentForm(appointment, pdsData)}>
              <FileDown className="mr-2 h-4 w-4" />
              Appointment Form (CS Form 33-A)
            </Button>
            <Button variant="outline" onClick={() => generateOathOfOffice(appointment, pdsData)}>
              <FileDown className="mr-2 h-4 w-4" />
              Oath of Office (CS Form 32)
            </Button>
            <Button variant="outline" onClick={() => generateAssumptionToDuty(appointment, pdsData)}>
              <FileDown className="mr-2 h-4 w-4" />
              Assumption to Duty (CS Form 4)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Final Requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Final Requirements</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {verifiedCount} of {totalReqs} verified
              </p>
            </div>
            {!isSuperAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowAddReq(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add Requirement
              </Button>
            )}
          </div>
          {totalReqs > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${totalReqs > 0 ? (verifiedCount / totalReqs) * 100 : 0}%` }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No requirements set.</p>
          ) : (
            <div className="space-y-2">
              {requirements.map((req) => (
                <RequirementRow
                  key={req.id}
                  requirement={req}
                  onVerify={() => verifyMutation.mutate(req.id)}
                  onUnverify={() => unverifyMutation.mutate(req.id)}
                  onDelete={() => deleteReqMutation.mutate(req.id)}
                  isVerifying={verifyMutation.isPending}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Add Requirement Dialog */}
      <Dialog open={showAddReq} onOpenChange={setShowAddReq}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Final Requirement</DialogTitle>
            <DialogDescription>Add a new requirement for this appointee to fulfill.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Requirement Name</Label>
              <Input value={newReqName} onChange={(e) => setNewReqName(e.target.value)} placeholder="e.g., Police Clearance" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={newReqDesc} onChange={(e) => setNewReqDesc(e.target.value)} placeholder="Instructions or details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReq(false)}>Cancel</Button>
            <Button
              onClick={() => addReqMutation.mutate({ requirementName: newReqName, description: newReqDesc })}
              disabled={!newReqName.trim() || addReqMutation.isPending}
            >
              {addReqMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dates Dialog */}
      <Dialog open={showEditDates} onOpenChange={setShowEditDates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Appointment Dates</DialogTitle>
            <DialogDescription>Update the appointment and oath dates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Appointment Date</Label>
              <Input type="date" value={editAppointmentDate} onChange={(e) => setEditAppointmentDate(e.target.value)} />
            </div>
            <div>
              <Label>Oath Date</Label>
              <Input type="date" value={editOathDate} onChange={(e) => setEditOathDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDates(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({
                appointmentDate: editAppointmentDate,
                oathDate: editOathDate || null,
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequirementRow({
  requirement, onVerify, onUnverify, onDelete, isVerifying, isSuperAdmin,
}: {
  requirement: FinalRequirement;
  onVerify: () => void;
  onUnverify: () => void;
  onDelete: () => void;
  isVerifying: boolean;
  isSuperAdmin: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${requirement.isVerified ? 'bg-emerald-50/50 border-emerald-200' : ''}`}>
      <div className="shrink-0">
        {requirement.isVerified ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${requirement.isVerified ? 'line-through text-muted-foreground' : ''}`}>
          {requirement.requirementName}
        </p>
        {requirement.description && (
          <p className="text-xs text-muted-foreground">{requirement.description}</p>
        )}
        {requirement.isVerified && requirement.verifier && (
          <p className="text-xs text-emerald-600 mt-1">
            Verified by {requirement.verifier.firstName} {requirement.verifier.lastName}
            {requirement.verifiedAt && ` on ${format(new Date(requirement.verifiedAt), 'MMM d, yyyy')}`}
          </p>
        )}
      </div>
      {!isSuperAdmin && (
        <div className="flex gap-1 shrink-0">
          {requirement.isVerified ? (
            <Button variant="ghost" size="sm" onClick={onUnverify} title="Revert verification">
              <XCircle className="h-4 w-4 text-amber-500" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onVerify} disabled={isVerifying} title="Verify requirement">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} title="Remove requirement">
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

