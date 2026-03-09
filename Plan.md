# LGU PRIME-HRM — Project Plan

## Overview

A web application for the Civil Service Commission's PRIME-HRM program that manages Recruitment, Selection, and Placement (RSP) and Learning and Development (L&D) for local government units.

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Framework    | Next.js 14+ (App Router)            |
| Language     | TypeScript                          |
| UI           | Tailwind CSS + shadcn/ui            |
| Database     | MySQL                               |
| ORM          | Prisma                              |
| Auth         | NextAuth.js (Credentials + JWT)     |
| Email        | Nodemailer (Gmail SMTP)             |
| Forms        | React Hook Form + Zod validation    |
| File Upload  | Local storage (uploadthing or multer) |
| PDF Gen      | @react-pdf/renderer or jspdf        |
| Deployment   | Ubuntu Linux server (self-hosted)   |

---

## User Roles

| Role                   | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| Super Admin            | Full system access. Manages LGUs, users, and system-wide settings.          |
| LGU HR Admin           | Manages job postings, applications, endorsements, interviews, and L&D.      |
| LGU Office/Dept Admin  | Screens endorsed applicants, does shortlisting for their department/office. |
| Public Applicant       | Registers an account, applies to positions, uploads requirements, tracks application status. |

---

## Phase Breakdown

---

### Phase 1 — Project Setup, Auth & User Management

**Goal:** Foundation of the application with authentication and role-based access.

**Tasks:**
- Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- Set up Prisma with MySQL schema (Users, Roles, LGUs)
- Implement NextAuth.js with credentials provider and JWT strategy
- Build registration flow for Public Applicants (signup, email verification)
- Build login page (shared for all roles)
- Super Admin dashboard: CRUD for LGUs, HR Admins, Office/Dept Admins
- Role-based middleware for route protection
- Base layout: sidebar navigation, header, responsive design
- Gmail SMTP configuration with Nodemailer

**Database Models:**
- `User` (id, email, password, name, role, lguId, isActive, emailVerified, createdAt)
- `LGU` (id, name, code, address, contactInfo, createdAt)
- `Department` (id, name, lguId, createdAt)

**Deliverable:** Working auth system, Super Admin can manage LGUs and users, public can register.

---

### Phase 2 — RSP: Job Posting & Public Application

**Goal:** HR can post jobs; public applicants can browse and apply.

**Tasks:**
- HR Admin: CRUD for job positions (title, salary grade, plantilla no., qualifications, description, status)
- HR Admin: Set required attachments per position (PDF, images, file types, labels)
- Public career portal: list of open positions with search and filters
- Position detail page (similar to CSC career portal)
- Application flow:
  - Online Personal Data Sheet (PDS) form — multi-step form based on CS Form 212
  - Online Work Experience Sheet (WES) form — based on CS Form 212-WES
  - File upload for required documents
- Applicant dashboard: view submitted applications and their current status
- Application status tracking (Applied, Under Review, Endorsed, Shortlisted, For Interview, etc.)

**Database Models:**
- `Position` (id, title, salaryGrade, plantillaNo, qualifications, description, status, lguId, departmentId, slots, deadline, createdBy, createdAt)
- `PositionRequirement` (id, positionId, label, fileTypes, isRequired)
- `Application` (id, positionId, applicantId, status, appliedAt, updatedAt)
- `PersonalDataSheet` (id, applicationId, — all PDS fields per CS Form 212)
- `WorkExperienceSheet` (id, applicationId, — all WES fields)
- `ApplicationAttachment` (id, applicationId, requirementId, filePath, fileName, uploadedAt)

**Deliverable:** Full job posting to application submission pipeline. Applicants can track status.

---

### Phase 3 — RSP: Application Management, Endorsement & Shortlisting

**Goal:** HR reviews applications, endorses to departments; departments shortlist.

**Tasks:**
- HR Admin: Applications list with filters (by position, status, date)
- HR Admin: View full application details (PDS, WES, attachments)
- HR Admin: Endorse selected applicants to the target Department/Office
- HR Admin: Generate position reports (number of applicants, status breakdown)
- Office/Dept Admin: View endorsed applicants for their department
- Office/Dept Admin: Screen and shortlist applicants (accept/reject with remarks)
- Office/Dept Admin: Submit shortlist back to HR
- HR Admin: View and finalize the shortlist
- Email notifications at each status change (endorsed, shortlisted, rejected)
- Applicant dashboard updates with real-time status

**Deliverable:** Complete endorsement and shortlisting workflow between HR and departments.

---

### Phase 4 — RSP: Interviews, Scoring & Document Generation

**Goal:** Schedule interviews, record scores, generate official documents.

**Tasks:**
- HR Admin: Set interview schedule (date, time, venue/link) for a position
- Email notification to shortlisted applicants with interview details
- HR Admin: Mark interview as completed per applicant
- HR Admin: Input scores in the Comparative/Assessment Form
  - Criteria-based scoring (education, experience, training, performance, etc.)
  - Auto-compute totals and rankings
- Generate **Certificate of Qualified Applicants** (PDF)
  - Lists ranked applicants for signing by Head of Agency and HRM PSB
- HR Admin / Head of Agency: Select appointee(s) based on position slots
- Generate **Appointment Form** (CS Form No. 33-B) as PDF
- Generate **Oath of Office** (CS Form No. 32) as PDF
- All generated documents downloadable and printable

**Database Models:**
- `InterviewSchedule` (id, positionId, date, time, venue, createdBy)
- `InterviewResult` (id, applicationId, scheduleId, isCompleted, remarks)
- `AssessmentScore` (id, applicationId, criteriaId, score, assessorId)
- `AssessmentCriteria` (id, positionId, name, maxScore, weight)
- `Appointment` (id, applicationId, positionId, status, appointedAt)

**Deliverable:** Full interview-to-appointment pipeline with PDF document generation.

---

### Phase 5 — RSP: Post-Selection Requirements & Verification

**Goal:** Manage final requirements for accepted applicants.

**Tasks:**
- HR Admin: Define/update final requirements checklist for accepted applicant(s)
- Email accepted applicant(s) with the list of final requirements
- Applicant: Upload final requirements through their dashboard
- HR Admin: Review and verify each uploaded requirement (approve/reject with remarks)
- HR Admin: Mark applicant as fully verified (all requirements complete)
- Status updates visible on applicant dashboard
- Summary view: all accepted applicants and their requirement completion status
- Final data export/summary for handoff to existing LGU HR & Payroll system (no integration)

**Database Models:**
- `PostSelectionRequirement` (id, appointmentId, label, fileTypes, isRequired, status)
- `PostSelectionSubmission` (id, requirementId, filePath, fileName, submittedAt, verifiedAt, verifiedBy, remarks)

**Deliverable:** Complete post-selection requirement workflow. RSP module fully functional.

---

### Phase 6 — Learning & Development (L&D)

**Goal:** Training management, assignment, scheduling, monitoring, and reporting.

**Tasks:**
- HR Admin: CRUD for trainings (title, description, type, provider, duration)
- Office/Dept Admin: Create department-specific trainings
- Dept Admin: Assign trainings to employees in their department
- HR Admin: Schedule trainings (date, time, venue, facilitator, max participants)
- Calendar view of upcoming trainings
- Training monitoring: attendance tracking, completion status
- Employee: View assigned trainings and schedule
- Employee: Submit post-training report (narrative report form)
- Employee: Submit proof of appearance/attendance (file upload)
- HR/Dept Admin: Review and approve submitted reports
- Training reports and analytics (completion rates, department breakdown)

**Database Models:**
- `Training` (id, title, description, type, provider, duration, lguId, departmentId, createdBy)
- `TrainingSchedule` (id, trainingId, date, time, venue, facilitator, maxParticipants)
- `TrainingAssignment` (id, trainingScheduleId, employeeId, assignedBy, status)
- `TrainingAttendance` (id, assignmentId, isPresent, date)
- `TrainingReport` (id, assignmentId, reportContent, filePath, submittedAt, reviewedBy, reviewStatus)

**Deliverable:** Fully functional L&D module.

---

## Folder Structure (Next.js App Router)

```
primehrm/
├── prisma/
│   └── schema.prisma
├── public/
│   └── uploads/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (public)/
│   │   │   ├── careers/
│   │   │   └── careers/[id]/
│   │   ├── (dashboard)/
│   │   │   ├── admin/          # Super Admin pages
│   │   │   ├── hr/             # HR Admin pages
│   │   │   ├── department/     # Office/Dept Admin pages
│   │   │   └── applicant/      # Applicant dashboard
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── positions/
│   │   │   ├── applications/
│   │   │   ├── interviews/
│   │   │   ├── trainings/
│   │   │   └── uploads/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── forms/
│   │   ├── layouts/
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── mail.ts
│   │   ├── pdf.ts
│   │   └── utils.ts
│   ├── types/
│   └── hooks/
├── .env
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Status Flow — Application Lifecycle

```
Applied → Under Review → Endorsed → Shortlisted → For Interview
→ Interviewed → Assessed → Qualified → Selected → Requirements Pending
→ Requirements Verified → Completed
```

(Rejected possible at: Under Review, Shortlisting, or Assessment stages)

---

## Notes

- Each phase will be developed and tested before moving to the next.
- PDF templates will be based on official CSC forms.
- The system does NOT integrate with existing LGU HR/Payroll — it provides a data export point.
- Gmail SMTP will be used initially; can be swapped to a transactional email service later.
- File uploads stored locally on the Ubuntu server; can migrate to cloud storage if needed.
