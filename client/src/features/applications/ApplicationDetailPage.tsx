import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Download, Loader2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Application, ApplicationStatus, PersonalDataSheet, PDSData, ApplicationDocument, AssessmentScore } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

// Valid next statuses based on current status (HR Admin)
const STATUS_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ['ENDORSED', 'REJECTED'],
  // SHORTLISTED → FOR_INTERVIEW is handled by the Interview module (assign to interview schedule)
  // FOR_INTERVIEW → INTERVIEWED is handled by the Interview module (mark attendance)
  INTERVIEWED: ['QUALIFIED', 'REJECTED'],
  QUALIFIED: ['SELECTED', 'REJECTED'],
  SELECTED: ['APPOINTED', 'REJECTED'],
};

// Office Admin can only shortlist (ENDORSED → SHORTLISTED)
const OFFICE_ADMIN_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  ENDORSED: ['SHORTLISTED', 'REJECTED'],
};

// Action button labels (imperative, not past tense)
const ACTION_LABELS: Partial<Record<ApplicationStatus, string>> = {
  ENDORSED: 'Endorse to Office',
  SHORTLISTED: 'Shortlist',
  FOR_INTERVIEW: 'Set for Interview',
  INTERVIEWED: 'Mark as Interviewed',
  QUALIFIED: 'Qualify',
  SELECTED: 'Select for Appointment',
  APPOINTED: 'Appoint',
  REJECTED: 'Reject',
};

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left py-2 font-semibold text-sm hover:text-emerald-600 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="pl-6 pb-4">{children}</div>}
    </div>
  );
}

interface ApplicationDetail extends Application {
  personalDataSheet?: PersonalDataSheet;
  workExperienceSheet?: { id: number; data: any };
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isHRAdmin = isSuperAdmin || user?.role === 'LGU_HR_ADMIN';
  const isOfficeAdmin = user?.role === 'LGU_OFFICE_ADMIN';
  const canManage = isHRAdmin || isOfficeAdmin;

  const [statusNotes, setStatusNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; status: ApplicationStatus | null }>({
    open: false,
    status: null,
  });

  const { data: application, isLoading } = useQuery<ApplicationDetail>({
    queryKey: ['application', id],
    queryFn: async () => {
      const { data } = await api.get(`/applications/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  // Fetch assessment score for this application
  const { data: assessmentScore } = useQuery<AssessmentScore | null>({
    queryKey: ['assessment-score', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/assessments/application/${id}`);
        return data.data || null;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!id && isHRAdmin,
    staleTime: 0,
  });

  const hasAssessmentScore = assessmentScore && assessmentScore.totalScore != null;

  const statusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: ApplicationStatus; notes: string }) => {
      return api.put(`/applications/${id}/status`, { status, notes: notes || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications-stats'] });
      toast.success('Application status updated');
      setConfirmDialog({ open: false, status: null });
      setStatusNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setConfirmDialog({ open: true, status: newStatus });
  };

  const confirmStatusChange = () => {
    if (confirmDialog.status) {
      statusMutation.mutate({ status: confirmDialog.status, notes: statusNotes });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/applications')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Applications
        </Button>
        <p className="text-muted-foreground">Application not found.</p>
      </div>
    );
  }

  const pds: PDSData | undefined = application.personalDataSheet?.data;
  const documents: ApplicationDocument[] = application.documents || [];
  const nextStatuses = isOfficeAdmin
    ? (OFFICE_ADMIN_TRANSITIONS[application.status] || [])
    : (STATUS_TRANSITIONS[application.status] || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/applications')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold tracking-tight">
            {application.applicant
              ? `${application.applicant.firstName} ${application.applicant.lastName}`
              : 'Unknown Applicant'}
          </h1>
          <p className="text-muted-foreground">{application.position?.title || 'Unknown Position'}</p>
        </div>
        <ApplicationStatusBadge status={application.status} />
      </div>

      {/* Section 1: Application Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Application Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Position</p>
              <p className="font-medium">{application.position?.title || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Item Number</p>
              <p className="font-medium">{application.position?.itemNumber || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Salary Grade</p>
              <p className="font-medium">{application.position?.salaryGrade ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{application.position?.department?.name || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Applicant</p>
              <p className="font-medium">
                {application.applicant
                  ? `${application.applicant.firstName} ${application.applicant.lastName}`
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{application.applicant?.email || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date Submitted</p>
              <p className="font-medium">
                {application.submittedAt ? format(new Date(application.submittedAt), 'MMMM d, yyyy h:mm a') : '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Status</p>
              <div className="mt-1">
                <ApplicationStatusBadge status={application.status} />
              </div>
            </div>
            {application.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{application.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: PDS Summary */}
      {pds && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Data Sheet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CollapsibleSection title="Personal Information" defaultOpen>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Full Name</p>
                  <p className="font-medium">
                    {[pds.surname, pds.firstName, pds.middleName, pds.nameExtension].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{pds.dateOfBirth || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sex</p>
                  <p className="font-medium">{pds.sex || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Civil Status</p>
                  <p className="font-medium">{pds.civilStatus || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mobile No.</p>
                  <p className="font-medium">{pds.mobileNo || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{pds.emailAddress || '-'}</p>
                </div>
              </div>
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Educational Background">
              {pds.education && pds.education.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>School Name</TableHead>
                        <TableHead>Degree/Course</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Year Graduated</TableHead>
                        <TableHead>Honors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pds.education.map((edu, i) => (
                        <TableRow key={i}>
                          <TableCell>{edu.level}</TableCell>
                          <TableCell>{edu.schoolName}</TableCell>
                          <TableCell>{edu.degree}</TableCell>
                          <TableCell>{edu.period?.from} - {edu.period?.to}</TableCell>
                          <TableCell>{edu.yearGraduated}</TableCell>
                          <TableCell>{edu.honors}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No education entries.</p>
              )}
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Civil Service Eligibility">
              {pds.eligibilities && pds.eligibilities.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Eligibility</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Date of Exam</TableHead>
                        <TableHead>Place of Exam</TableHead>
                        <TableHead>License No.</TableHead>
                        <TableHead>Validity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pds.eligibilities.map((elig, i) => (
                        <TableRow key={i}>
                          <TableCell>{elig.name}</TableCell>
                          <TableCell>{elig.rating}</TableCell>
                          <TableCell>{elig.dateOfExam}</TableCell>
                          <TableCell>{elig.placeOfExam}</TableCell>
                          <TableCell>{elig.licenseNo}</TableCell>
                          <TableCell>{elig.licenseValidity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No eligibility entries.</p>
              )}
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Work Experience">
              {pds.workExperience && pds.workExperience.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Position Title</TableHead>
                        <TableHead>Department/Agency</TableHead>
                        <TableHead>Monthly Salary</TableHead>
                        <TableHead>SG</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gov't Service</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pds.workExperience.map((we, i) => (
                        <TableRow key={i}>
                          <TableCell className="whitespace-nowrap">{we.period?.from} - {we.period?.to}</TableCell>
                          <TableCell>{we.positionTitle}</TableCell>
                          <TableCell>{we.department}</TableCell>
                          <TableCell>{we.monthlySalary}</TableCell>
                          <TableCell>{we.salaryGrade}</TableCell>
                          <TableCell>{we.statusOfAppointment}</TableCell>
                          <TableCell>{we.isGovernmentService ? 'Yes' : 'No'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No work experience entries.</p>
              )}
            </CollapsibleSection>

            <Separator />

            <CollapsibleSection title="Skills, Distinctions & Memberships">
              <div className="space-y-3 text-sm">
                {pds.specialSkills && pds.specialSkills.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Special Skills & Hobbies</p>
                    <div className="flex flex-wrap gap-1">
                      {pds.specialSkills.map((skill, i) => (
                        <Badge key={i} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {pds.nonAcademicDistinctions && pds.nonAcademicDistinctions.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Non-Academic Distinctions/Recognition</p>
                    <div className="flex flex-wrap gap-1">
                      {pds.nonAcademicDistinctions.map((d, i) => (
                        <Badge key={i} variant="outline">{d}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {pds.membershipInAssociations && pds.membershipInAssociations.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Membership in Associations/Organizations</p>
                    <div className="flex flex-wrap gap-1">
                      {pds.membershipInAssociations.map((m, i) => (
                        <Badge key={i} variant="outline">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(!pds.specialSkills || pds.specialSkills.length === 0) &&
                 (!pds.nonAcademicDistinctions || pds.nonAcademicDistinctions.length === 0) &&
                 (!pds.membershipInAssociations || pds.membershipInAssociations.length === 0) && (
                  <p className="text-muted-foreground">No entries.</p>
                )}
              </div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-md border">
                  <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{doc.requirement?.label || 'Document'}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                  </div>
                  <a
                    href={`${API_BASE}/${doc.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-3 w-3" />
                      Download
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Assessment Scores (visible for INTERVIEWED+ applicants) */}
      {isHRAdmin && ['INTERVIEWED', 'QUALIFIED', 'SELECTED', 'APPOINTED'].includes(application.status) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAssessmentScore ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Education', value: assessmentScore.educationScore },
                    { label: 'Training', value: assessmentScore.trainingScore },
                    { label: 'Experience', value: assessmentScore.experienceScore },
                    { label: 'Performance', value: assessmentScore.performanceScore },
                    { label: 'Psychosocial', value: assessmentScore.psychosocialScore },
                    { label: 'Potential', value: assessmentScore.potentialScore },
                    { label: 'Interview', value: assessmentScore.interviewScore },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border p-3 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {item.value != null ? Number(item.value).toFixed(2) : '-'}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-emerald-700 font-medium">Total Score</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {assessmentScore.totalScore != null ? Number(assessmentScore.totalScore).toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
                {assessmentScore.remarks && (
                  <div>
                    <p className="text-xs text-muted-foreground">Remarks</p>
                    <p className="text-sm text-gray-900">{assessmentScore.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No assessment scores recorded yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scores must be encoded from the Interview module before the applicant can be qualified.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 5: Actions (HR/Office Admin) */}
      {!isSuperAdmin && canManage && nextStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  Current status: <ApplicationStatusBadge status={application.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map((nextStatus) => {
                    const config = STATUS_CONFIG[nextStatus];
                    const isReject = nextStatus === 'REJECTED';
                    const needsAssessment = nextStatus === 'QUALIFIED' && !hasAssessmentScore;
                    return (
                      <Button
                        key={nextStatus}
                        variant={isReject ? 'destructive' : 'default'}
                        className={isReject ? '' : config.className}
                        onClick={() => handleStatusChange(nextStatus)}
                        disabled={needsAssessment}
                        title={needsAssessment ? 'Assessment scores required before qualifying' : undefined}
                      >
                        {ACTION_LABELS[nextStatus] || config.label}
                      </Button>
                    );
                  })}
                </div>
                {nextStatuses.includes('QUALIFIED') && !hasAssessmentScore && (
                  <p className="text-xs text-amber-600 mt-2">
                    Assessment scores must be recorded before this applicant can be qualified.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Status Change Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Change application status from{' '}
              <span className="font-semibold">{STATUS_CONFIG[application.status].label}</span> to{' '}
              <span className="font-semibold">
                {confirmDialog.status ? STATUS_CONFIG[confirmDialog.status].label : ''}
              </span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add notes about this status change..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog({ open: false, status: null });
                setStatusNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.status === 'REJECTED' ? 'destructive' : 'default'}
              onClick={confirmStatusChange}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
