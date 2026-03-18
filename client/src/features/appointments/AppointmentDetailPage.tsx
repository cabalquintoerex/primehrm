import { useState, useRef } from 'react';
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
  ArrowLeft, Loader2, Printer, CheckCircle2, XCircle, Plus, Trash2, FileText,
  Calendar, MapPin, Building2, User, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Appointment, FinalRequirement, PDSData } from '@/types';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const appointmentFormRef = useRef<HTMLDivElement>(null);
  const oathFormRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Form</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 20px; font-size: 12pt; }
            .form-container { max-width: 8.5in; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; }
            .no-border { border: none; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .underline { text-decoration: underline; }
            .header { text-align: center; margin-bottom: 10px; }
            .signature-line { border-bottom: 1px solid #000; min-width: 200px; display: inline-block; margin-top: 30px; }
            @media print { body { margin: 0; } @page { margin: 0.5in; } }
          </style>
        </head>
        <body>${ref.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

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
        <Button variant="link" onClick={() => navigate('/admin/appointments')}>Back to Appointments</Button>
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/appointments')}>
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
            <Button variant="outline" onClick={() => handlePrint(appointmentFormRef)}>
              <Printer className="mr-2 h-4 w-4" />
              Print Appointment Form (CS Form 33-B)
            </Button>
            <Button variant="outline" onClick={() => handlePrint(oathFormRef)}>
              <Printer className="mr-2 h-4 w-4" />
              Print Oath of Office (CS Form 32)
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

      {/* Hidden printable forms */}
      <div className="hidden">
        <div ref={appointmentFormRef}>
          <AppointmentFormTemplate appointment={appointment} pdsData={pdsData} />
        </div>
        <div ref={oathFormRef}>
          <OathOfOfficeTemplate appointment={appointment} pdsData={pdsData} />
        </div>
      </div>

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

function AppointmentFormTemplate({ appointment, pdsData }: { appointment: Appointment; pdsData: PDSData | null }) {
  const applicant = appointment.application?.applicant;
  const position = appointment.position;
  const lgu = position?.lgu;
  const name = applicant ? `${applicant.firstName} ${applicant.lastName}` : '';
  const appointmentDate = format(new Date(appointment.appointmentDate), 'MMMM d, yyyy');

  return (
    <div className="form-container" style={{ fontFamily: "'Times New Roman', Times, serif", padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <p style={{ fontSize: '9pt', margin: 0 }}>CS Form No. 33-B</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>Revised 2018</p>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <p style={{ fontSize: '9pt', margin: 0 }}>Republic of the Philippines</p>
        <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: '2px 0' }}>{lgu?.name || 'LOCAL GOVERNMENT UNIT'}</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>{lgu?.address || ''}</p>
      </div>

      <h2 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', margin: '15px 0', textDecoration: 'underline' }}>
        APPOINTMENT
      </h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px', width: '30%' }}>1. Name of Appointee:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{name}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>2. Position Title:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{position?.title || ''}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>3. Item No.:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{position?.itemNumber || ''}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>4. Salary Grade / Step:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{position?.salaryGrade || ''}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>5. Rate per Annum (Monthly Salary):</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
              {position?.monthlySalary ? `₱${Number(position.monthlySalary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>6. Place of Assignment:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{position?.placeOfAssignment || position?.department?.name || ''}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>7. Date of Appointment:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{appointmentDate}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>8. Employment Status:</td>
            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>Permanent</td>
          </tr>
          {pdsData && (
            <>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>9. Date of Birth:</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{pdsData.dateOfBirth || ''}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>10. Address:</td>
                <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                  {[pdsData.residentialAddress?.houseNo, pdsData.residentialAddress?.street, pdsData.residentialAddress?.barangay, pdsData.residentialAddress?.city, pdsData.residentialAddress?.province].filter(Boolean).join(', ')}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '30px', marginBottom: '5px' }}></div>
          <p style={{ fontSize: '9pt', margin: 0 }}>Appointing Officer/Authority</p>
        </div>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '30px', marginBottom: '5px' }}></div>
          <p style={{ fontSize: '9pt', margin: 0 }}>Date</p>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center', width: '45%' }}>
        <p style={{ fontSize: '10pt', margin: '0 0 5px 0' }}>Certified by:</p>
        <div style={{ borderBottom: '1px solid #000', minHeight: '30px', marginBottom: '5px' }}></div>
        <p style={{ fontSize: '9pt', margin: 0 }}>Human Resource Management Officer</p>
      </div>
    </div>
  );
}

function OathOfOfficeTemplate({ appointment, pdsData }: { appointment: Appointment; pdsData: PDSData | null }) {
  const applicant = appointment.application?.applicant;
  const position = appointment.position;
  const lgu = position?.lgu;
  const name = applicant ? `${applicant.firstName} ${applicant.lastName}` : '';
  const oathDate = appointment.oathDate ? format(new Date(appointment.oathDate), 'MMMM d, yyyy') : '________________';

  return (
    <div className="form-container" style={{ fontFamily: "'Times New Roman', Times, serif", padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '5px' }}>
        <p style={{ fontSize: '9pt', margin: 0 }}>CS Form No. 32</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>Revised 2017</p>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <p style={{ fontSize: '9pt', margin: 0 }}>Republic of the Philippines</p>
        <p style={{ fontSize: '12pt', fontWeight: 'bold', margin: '2px 0' }}>{lgu?.name || 'LOCAL GOVERNMENT UNIT'}</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>{lgu?.address || ''}</p>
      </div>

      <h2 style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', margin: '20px 0', textDecoration: 'underline' }}>
        OATH OF OFFICE
      </h2>

      <div style={{ fontSize: '11pt', lineHeight: '1.8', textAlign: 'justify', marginTop: '20px' }}>
        <p>
          I, <strong style={{ textDecoration: 'underline' }}>{name}</strong>, having been appointed to the position of{' '}
          <strong style={{ textDecoration: 'underline' }}>{position?.title || ''}</strong> in the{' '}
          <strong>{lgu?.name || ''}</strong>, do solemnly swear (or affirm) that I will faithfully discharge to the best of my ability the duties of my present position and of all others that I may hereafter hold under the Republic of the Philippines; that I will support and defend the Constitution of the Philippines and will maintain true faith and allegiance thereto; that I will obey the laws, legal orders and decrees promulgated by the duly constituted authorities of the Republic of the Philippines; and that I impose this obligation upon myself voluntarily, without mental reservation or purpose of evasion.
        </p>
        <p style={{ textAlign: 'right', marginTop: '5px' }}>SO HELP ME GOD.</p>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '30px', marginBottom: '5px' }}></div>
          <p style={{ fontSize: '10pt', margin: 0, fontWeight: 'bold' }}>{name}</p>
          <p style={{ fontSize: '9pt', margin: 0 }}>Affiant</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <p style={{ fontSize: '10pt' }}>
          SUBSCRIBED AND SWORN to before me this <strong>{oathDate}</strong>,
          affiant exhibiting to me the following identification:
        </p>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10pt' }}>
        <p>Community Tax Certificate No.: ________________</p>
        <p>Issued on: ________________</p>
        <p>Issued at: ________________</p>
      </div>

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center', width: '45%' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '30px', marginBottom: '5px' }}></div>
          <p style={{ fontSize: '9pt', margin: 0 }}>Administering Officer</p>
        </div>
      </div>
    </div>
  );
}
