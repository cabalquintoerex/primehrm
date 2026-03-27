import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileStack, Briefcase, Globe, UserPlus, FileSearch, Filter,
  CalendarDays, ClipboardCheck, BarChart3, Award, FileCheck, Printer, ShieldCheck,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Create CSC Publication Batch',
    actor: 'LGU HR Admin',
    module: 'CSC Batches',
    path: '/admin/csc-batches',
    icon: FileStack,
    items: [
      'HR Admin clicks "New Batch"',
      'Fills in: Batch Number (unique per LGU), Posting Date, Closing Date (auto-calculated: Posting Date + 15 calendar days), Description (optional)',
      'System creates the batch with status Unpublished',
      'HR Admin can edit or delete the batch while it is unpublished',
    ],
  },
  {
    number: 2,
    title: 'Create Positions and Assign to Batch',
    actor: 'LGU HR Admin',
    module: 'Positions',
    path: '/admin/positions',
    icon: Briefcase,
    items: [
      'HR Admin clicks "Add Position"',
      'Fills in: Position Title, Plantilla Item No., Salary Grade (auto-fills monthly salary), Place of Assignment, Office/Department, No. of Vacancies',
      'CSC Publication Batch (required) \u2014 selecting a batch auto-fills Posting Date and Closing Date',
      'Qualification Standards: Education, Training, Experience, Eligibility, Competency',
      'Document Requirements (7 defaults pre-populated, customizable)',
      'Position is created with status DRAFT and linked to the selected CSC batch',
    ],
    note: 'Positions can also be added from the Batch Detail page using the "Add Positions" button.',
  },
  {
    number: 3,
    title: 'Publish the CSC Batch',
    actor: 'LGU HR Admin',
    module: 'CSC Batch Detail Page',
    path: '/admin/csc-batches/:id',
    icon: Globe,
    items: [
      'After CSC publishes the positions on their official website, HR Admin clicks "Mark as Published"',
      'System automatically sets the batch to Published and changes all DRAFT positions to OPEN status',
      'Positions now appear on the public careers page',
      'HR Admin can Unpublish the batch: OPEN positions revert to DRAFT, CLOSED/FILLED are not affected',
    ],
  },
  {
    number: 4,
    title: 'Applicant Applies',
    actor: 'Applicant (Public)',
    module: 'Public Careers Page',
    path: '/:lgu-slug/careers',
    icon: UserPlus,
    items: [
      'Applicant browses open positions on the LGU\'s careers page',
      'Clicks on a position to view full details (qualifications, requirements, closing date)',
      'Clicks "Apply Now" \u2014 new users register and fill out PDS (CS Form 212, 8-step wizard); returning users log in',
      'Uploads required documents (Letter of Intent, Transcript, Eligibility Certificate, etc.)',
      'PDS requirement is auto-fulfilled if PDS is on file',
      'Submits application \u2014 status: SUBMITTED',
    ],
  },
  {
    number: 5,
    title: 'HR Reviews and Endorses to Office/Department',
    actor: 'LGU HR Admin',
    module: 'Applications',
    path: '/admin/applications',
    icon: FileSearch,
    items: [
      'HR Admin views submitted applications with filters (by position, status, search by name)',
      'Opens an application to review: PDS summary, uploaded documents',
      'Clicks "Endorse to Office" \u2014 status changes: SUBMITTED \u2192 ENDORSED',
      'Application becomes visible to the Office Admin of the assigned department',
      'HR Admin can also Reject an application at this stage',
    ],
  },
  {
    number: 6,
    title: 'Office Admin Screens and Shortlists',
    actor: 'LGU Office Admin',
    module: 'Applications',
    path: '/admin/applications',
    icon: Filter,
    items: [
      'Office Admin sees only endorsed applications for their department',
      'Reviews applicant qualifications and documents',
      'Clicks "Shortlist" for qualified applicants \u2014 status: ENDORSED \u2192 SHORTLISTED',
      'Can Reject unqualified applicants \u2014 status: ENDORSED \u2192 REJECTED',
    ],
  },
  {
    number: 7,
    title: 'HR Schedules Interviews',
    actor: 'LGU HR Admin',
    module: 'Interviews',
    path: '/admin/interviews',
    icon: CalendarDays,
    items: [
      'HR Admin creates an interview schedule: selects the Position, sets Date, Venue, and Notes',
      'Assigns shortlisted applicants to the interview schedule',
      'Application status changes: SHORTLISTED \u2192 FOR_INTERVIEW',
    ],
  },
  {
    number: 8,
    title: 'Conduct Interview and Mark Attendance',
    actor: 'LGU HR Admin',
    module: 'Interview Detail',
    path: '/admin/interviews/:id',
    icon: ClipboardCheck,
    items: [
      'On the interview date, HR Admin opens the interview detail page',
      'Marks attendance: Attended or No Show',
      'Clicks "Complete Interview" \u2014 attended applicants: FOR_INTERVIEW \u2192 INTERVIEWED',
      'No-show applicants remain at FOR_INTERVIEW',
    ],
  },
  {
    number: 9,
    title: 'Encode Assessment Scores',
    actor: 'LGU HR Admin',
    module: 'Assessment',
    path: '/admin/assessments/:positionId',
    icon: BarChart3,
    items: [
      'HR Admin opens the assessment scoring page',
      'Inputs scores for each interviewed applicant across 7 criteria: Education, Training, Experience, Performance, Psychosocial Attributes, Potential, Interview',
      'System auto-computes Total Score and ranks applicants by total (descending)',
      'Clicks "Qualify" for passing applicants \u2014 status: INTERVIEWED \u2192 QUALIFIED',
    ],
  },
  {
    number: 10,
    title: 'Select for Appointment',
    actor: 'LGU HR Admin',
    module: 'Selection',
    path: '/admin/selection',
    icon: Award,
    items: [
      'HR Admin views all qualified applicants grouped by position',
      'Each position shows ranked applicants with assessment scores and vacancy slots',
      'Selects applicants via checkbox (up to the number of slots)',
      'Clicks "Select for Appointment" \u2014 status: QUALIFIED \u2192 SELECTED',
    ],
  },
  {
    number: 11,
    title: 'Create Appointment',
    actor: 'LGU HR Admin',
    module: 'Appointments',
    path: '/admin/appointments',
    icon: FileCheck,
    items: [
      'HR Admin clicks "Appoint" for selected applicants',
      'Enters Appointment Date and Oath Date (optional)',
      'Application status changes: SELECTED \u2192 APPOINTED',
      '8 default final requirements auto-created (Oath, Appointment Form, Assumption to Duty, Birth Certificate, Marriage Certificate, NBI, Medical, Barangay Clearance)',
      'If all vacancy slots are filled, position status auto-changes to FILLED',
    ],
  },
  {
    number: 12,
    title: 'Generate Appointment Documents',
    actor: 'LGU HR Admin',
    module: 'Appointment Detail',
    path: '/admin/appointments/:id',
    icon: Printer,
    items: [
      'Generate and print Appointment Form (CS Form 33-B) \u2014 LGU header, appointee details, position info, salary, signatures',
      'Generate and print Oath of Office (CS Form 32) \u2014 oath text, affiant signature, administering officer',
      'Documents are generated as printable HTML',
    ],
  },
  {
    number: 13,
    title: 'Final Requirements Verification',
    actor: 'LGU HR Admin',
    module: 'Appointment Detail',
    path: '/admin/appointments/:id',
    icon: ShieldCheck,
    items: [
      'HR Admin manages final requirements: can add custom requirements, delete unverified ones',
      'Clicks "Verify" on each requirement as appointee submits documents \u2014 system records verifier and timestamp',
      'Progress bar shows verification completion percentage',
      'When all requirements are verified: appointment status auto-changes PENDING \u2192 COMPLETED',
      'If any requirement is later unverified: status reverts COMPLETED \u2192 PENDING',
    ],
  },
];

const statusFlows = [
  {
    title: 'Position Status Flow',
    flow: 'DRAFT \u2192 OPEN \u2192 CLOSED \u2192 FILLED',
    descriptions: [
      { status: 'DRAFT', desc: 'Created, not yet publicly visible' },
      { status: 'OPEN', desc: 'Published via CSC batch, visible on careers page, accepting applications' },
      { status: 'CLOSED', desc: 'No longer accepting applications' },
      { status: 'FILLED', desc: 'All vacancy slots appointed' },
    ],
  },
  {
    title: 'Application Status Flow',
    flow: 'SUBMITTED \u2192 ENDORSED \u2192 SHORTLISTED \u2192 FOR_INTERVIEW \u2192 INTERVIEWED \u2192 QUALIFIED \u2192 SELECTED \u2192 APPOINTED',
    descriptions: [],
  },
  {
    title: 'CSC Batch Status Flow',
    flow: 'Unpublished \u2194 Published (reversible)',
    descriptions: [
      { status: 'Publish', desc: 'DRAFT positions \u2192 OPEN' },
      { status: 'Unpublish', desc: 'OPEN positions \u2192 DRAFT (CLOSED/FILLED unaffected)' },
    ],
  },
  {
    title: 'Appointment Status Flow',
    flow: 'PENDING \u2192 COMPLETED (auto, when all requirements verified)',
    descriptions: [],
  },
];

const rolePermissions = [
  { action: 'Manage LGUs', super: true, hr: false, office: false, applicant: false },
  { action: 'Manage Departments', super: true, hr: true, office: false, applicant: false },
  { action: 'Manage Users', super: true, hr: true, office: false, applicant: false },
  { action: 'Manage CSC Batches', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Create/Edit Positions', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Publish/Unpublish Batch', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'View Applications', super: 'View Only', hr: true, office: 'Own Dept', applicant: 'Own' },
  { action: 'Endorse to Office', super: false, hr: true, office: false, applicant: false },
  { action: 'Shortlist / Reject', super: false, hr: false, office: true, applicant: false },
  { action: 'Schedule Interviews', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Encode Assessment', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Qualify Applicants', super: false, hr: true, office: false, applicant: false },
  { action: 'Select for Appointment', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Create Appointment', super: false, hr: true, office: false, applicant: false },
  { action: 'Verify Requirements', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Manage Training', super: 'View Only', hr: true, office: false, applicant: false },
  { action: 'Apply to Positions', super: false, hr: false, office: false, applicant: true },
  { action: 'Fill PDS / Upload Docs', super: false, hr: false, office: false, applicant: true },
];

function PermBadge({ val }: { val: boolean | string }) {
  if (val === true) return <Badge className="bg-green-600 hover:bg-green-700 text-xs">Yes</Badge>;
  if (typeof val === 'string') return <Badge variant="outline" className="text-xs">{val}</Badge>;
  return <span className="text-muted-foreground text-xs">-</span>;
}

export function ProcessFlowPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Process Flow</h1>
        <p className="text-muted-foreground mt-1">
          Recruitment, Selection, and Placement (RSP) Process
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <CardTitle className="text-base">{step.title}</CardTitle>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Actor: <span className="font-medium text-foreground">{step.actor}</span></span>
                      <span>Module: <span className="font-medium text-foreground">{step.module}</span></span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pl-[72px]">
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  {step.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
                {step.note && (
                  <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                    {step.note}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Workflows */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Status Workflow Summary</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {statusFlows.map((sf) => (
            <Card key={sf.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{sf.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono bg-muted rounded px-3 py-2 mb-2 break-all">
                  {sf.flow}
                </p>
                {sf.descriptions.length > 0 && (
                  <ul className="space-y-1">
                    {sf.descriptions.map((d) => (
                      <li key={d.status} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{d.status}:</span> {d.desc}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Role Permissions */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Role Permissions Summary</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                {isSuperAdmin && <TableHead className="text-center">Super Admin</TableHead>}
                <TableHead className="text-center">HR Admin</TableHead>
                <TableHead className="text-center">Office Admin</TableHead>
                <TableHead className="text-center">Applicant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolePermissions
                .filter((rp) => isSuperAdmin || rp.action !== 'Manage LGUs')
                .map((rp) => (
                <TableRow key={rp.action}>
                  <TableCell className="text-sm font-medium">{rp.action}</TableCell>
                  {isSuperAdmin && <TableCell className="text-center"><PermBadge val={rp.super} /></TableCell>}
                  <TableCell className="text-center"><PermBadge val={rp.hr} /></TableCell>
                  <TableCell className="text-center"><PermBadge val={rp.office} /></TableCell>
                  <TableCell className="text-center"><PermBadge val={rp.applicant} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
