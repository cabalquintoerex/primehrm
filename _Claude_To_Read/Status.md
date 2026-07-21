# LGU PRIME-HRM — Project Status

## Phase 1: Foundation & Core Setup — COMPLETED

### Server (Express + Prisma + MySQL)
- [x] Project scaffolding — Express, TypeScript, Prisma ORM
- [x] Database schema — lgus, users, departments, positions, audit_logs
- [x] Prisma schema pushed to MySQL `primehrm` database
- [x] Authentication — JWT login/logout/refresh, bcrypt password hashing
- [x] Role-based middleware — authenticate, requireRole, requireSuperAdmin, requireLguAdmin, denySuperAdminWrite
- [x] LGU CRUD controller & routes (with public slug lookup)
- [x] Department CRUD controller & routes
- [x] User CRUD controller & routes (scoped by LGU)
- [x] Audit logging utility
- [x] Health check endpoint
- [x] Error handler middleware
- [x] Zod validation middleware
- [x] Seed data — super admin, 4 LGUs, departments, HR/office admins, applicant
- [x] Seed: Cebu City full RSP pipeline (CSC batches, positions, applications, interviews, assessments, appointments, training, audit logs)

### Client (React + Vite + Tailwind + shadcn/ui)
- [x] Project scaffolding — Vite, TypeScript, Tailwind CSS, path aliases
- [x] Green theme CSS variables (primary: emerald/green)
- [x] shadcn/ui components — button, input, label, card, dialog, table, select, dropdown-menu, separator, avatar, badge, tooltip, scroll-area, switch, textarea
- [x] API service with Axios — interceptors, token refresh on 401, 30s timeout
- [x] Zustand auth store with persistence
- [x] React Router v6 routing with protected routes
- [x] TanStack Query setup (5-min staleTime)
- [x] Layout — Sidebar (collapsible, mobile responsive), Header with user dropdown
- [x] Login page — modern split-screen design with LGU branding, four pillars display, slug-based LGU lookup, demo accounts (Lapu-Lapu: HR Admin, Office Admin, Applicant)
- [x] Dashboard page — stat cards (placeholder)
- [x] LGU Management page — full CRUD with search, pagination, logo upload (Sharp compression), header bg upload (Sharp 1920x600 WebP), dialogs (SUPER_ADMIN only)
- [x] Department Management page — full CRUD with search, dialogs, LGU filter & selector for SUPER_ADMIN
- [x] User Management page — full CRUD with role selection, department assignment, pagination, LGU filter & selector for SUPER_ADMIN

---

## Phase 2: RSP — Job Posting & Public Careers Portal — COMPLETED

- [x] Position CRUD for HR admin (CSC-accurate fields)
- [x] Position status workflow (DRAFT → OPEN → CLOSED → FILLED)
- [x] Public careers page at `/:lgu-slug/careers` with search & pagination, LGU header bg support
- [x] Position detail page with full CSC-style layout
- [x] Applicant registration & login
- [x] Salary grade auto-fill from LGU salary schedule (grades 1-30)
- [x] Monthly salary number formatting (commas + decimals)
- [x] LGU logo upload with Sharp image compression (200x200 WebP)
- [x] LGU careers page header background upload with Sharp optimization (1920x600 WebP)
- [x] Static file serving for uploads
- [x] Slug redirect (`/:slug` → `/:slug/login`)
- [x] Seed: 4 LGUs (Cebu City, Mandaue, Lapu-Lapu, Cebu Province) with departments & HR admins
- [x] Seed: 30 positions for Lapu-Lapu with all fields populated
- [x] Seed: 6 applicant profiles with complete PDS & Work Experience Sheets (Juan, Maria, Roberto, Anna, Pedro, Elena)
- [x] Seed: Clean reseed with FK-ordered deletion (includes CscPublicationBatch)

### Demo Accounts
> Phase 18 reduced the seed to **Lapu-Lapu only**. The Cebu City / Mandaue / Cebu Province
> accounts below no longer exist.

| Role | Username | Password | LGU |
|------|----------|----------|-----|
| Super Admin | superadmin | admin123 | — |
| HR Admin | lapulapuhr | hradmin123 | Lapu-Lapu |
| Office Admin | lapulapueng | office123 | Lapu-Lapu (Engineering) |
| Office Admin | lapulaputourism | office123 | Lapu-Lapu (Tourism) |
| Applicant | juandelacruz | applicant123 | — |
| Applicant | mariagarcia | applicant123 | — |
| Applicant | robertosantos | applicant123 | — |
| Applicant | annareyes | applicant123 | — |
| Applicant | pedrovillanueva | applicant123 | — |
| Applicant | elenamarcos | applicant123 | — |

### URLs
- http://localhost:3000 — Super admin login
- http://localhost:3000/cebu-city/login — LGU-branded login
- http://localhost:3000/lapu-lapu-city/careers — Public careers page
- http://localhost:3000/modules — Module launcher (after login)
- http://localhost:5000/api/health — Server health check

> **Note:** As of the Module Separation phase, admin routes are namespaced by module —
> `/rsp/*` (recruitment), `/lnd/*` (training), `/admin/*` (LGUs, departments, users, audit logs).
> Old `/admin/*` paths for moved pages redirect automatically.

---

## Phase 3: RSP — Application Process — COMPLETED

- [x] Online PDS form (CS Form 212) — 8-step wizard (Personal Info, Family, Education, Eligibility, Work Experience, Voluntary Work, L&D, Other Info)
- [x] PDS form UX polish — numeric-only ID fields, salary formatting, tab order fixes for Select components
- [x] Document requirements per position — 7 defaults auto-created, HR can customize
- [x] Document upload system — Multer (5MB limit, PDF/JPEG/PNG)
- [x] Application submission flow — PDS check → profile summary → document upload → submit
- [x] PDS auto-attachment detection (skips PDS file upload if PDS exists)
- [x] Applicant dashboard — applications list with status badges, quick links
- [x] Browse Careers — LGU picker dialog, public LGU list endpoint (GET /lgus/public)
- [x] "Already Applied" indicator on careers page and position detail page
- [x] PDS data loading fix (useEffect sync instead of queryFn state mutation)
- [x] Apply page PDS data shape fix (consistent query cache with PDS form)
- [x] Auto-refresh applications list after successful submission (cache invalidation)
- [x] Apply page with login/register prompt for unauthenticated users
- [x] Public position requirements endpoint
- [x] File storage setup (uploads directory with static serving)

---

## Phase 4: RSP — HR Application Management — COMPLETED

- [x] Applications list page with filters (search by name, filter by position, filter by status)
- [x] Status summary cards (clickable to filter by status)
- [x] Application detail view (PDS summary with collapsible sections, uploaded documents with download)
- [x] Confirm dialog with optional notes for status changes
- [x] Application stats endpoint (GET /applications/stats) — counts by status
- [x] Office admin scoping — sees only endorsed+ applications for their department
- [x] Sidebar nav: "Applications" visible to SUPER_ADMIN, LGU_HR_ADMIN, LGU_OFFICE_ADMIN
- [x] Routes: /rsp/applications (list) and /rsp/applications/:id (detail)

### Application Status Workflow
```
SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED
                                                                                          ↘ REJECTED (at any step)
```
- UNDER_REVIEW status removed from workflow (SUBMITTED goes directly to ENDORSED)

### Role-Based Status Transitions
| Role | Allowed Transitions |
|------|-------------------|
| HR Admin | SUBMITTED → ENDORSED, INTERVIEWED → QUALIFIED (requires assessment score), QUALIFIED → SELECTED, SELECTED → APPOINTED |
| Office Admin | ENDORSED → SHORTLISTED, ENDORSED → REJECTED |
| Interview Module | SHORTLISTED → FOR_INTERVIEW (assign to schedule), FOR_INTERVIEW → INTERVIEWED (mark attendance) |

### Action Button Labels (Imperative Tense)
- Endorse to Office, Shortlist, Qualify, Select for Appointment, Appoint, Reject

### Assessment Score Gating
- Qualify button disabled when no assessment score exists for the applicant
- Assessment scores section displayed on application detail (7 criteria grid + total score)
  — **superseded by Phase 13**: the grid now renders the position's own factor template

---

## Phase 5: RSP — Interview & Assessment — COMPLETED

- [x] Interview scheduling — HR creates interview schedules with date, venue, notes
- [x] Applicant assignment — select shortlisted/for-interview applicants to assign to interview
- [x] Auto status update — assigned applicants automatically set to FOR_INTERVIEW
- [x] Interview completion — mark attendance per applicant, auto-update attended to INTERVIEWED
- [x] Per-applicant "No Show" action on interview detail (mark before completing)
- [x] Interview cancellation
- [x] Prominent "Encode Assessment Scores" card shown after interview completion
- [x] Comparative assessment scoring — 7 criteria (Education, Training, Experience, Performance, Psychosocial, Potential, Interview) — **superseded by Phase 13** (user-defined groups/factors)
- [x] Auto-computed total score and ranking by total desc
- [x] Qualify applicants — bulk action to mark INTERVIEWED → QUALIFIED (requires assessment score)
- [x] Cache invalidation — interview mutations (complete, cancel, no-show) invalidate applications query
- [x] Database models: InterviewSchedule, InterviewScheduleApplicant, AssessmentScore
- [x] Sidebar nav: "Interviews" for SUPER_ADMIN, LGU_HR_ADMIN
- [x] Routes: /rsp/interviews, /rsp/interviews/:id, /rsp/assessments/:positionId
- [ ] Email notifications (Nodemailer) — deferred
- [x] Generate Certificate of Qualified Applicants (PDF) — **done in Phase 15** (HRMPSB Certification, generated per position from the Selection module)

---

## Phase 5.5: RSP — Selection for Appointment — COMPLETED

- [x] Selection page — list all qualified/selected applicants grouped by position
- [x] Stats cards — Qualified Applicants count, Selected for Appointment count, Currently Checked count
- [x] Filter dropdowns — filter by Position, filter by Department
- [x] Applicants sorted by total assessment score (ranked with number)
- [x] Checkbox per applicant for bulk selection (disabled for already-selected)
- [x] Applicant row: rank number, name, email, total score, status badge (Qualified/Selected)
- [x] Vacancy slots display per position with warning when selections exceed slots
- [x] "Select for Appointment" bulk action button (QUALIFIED → SELECTED)
- [x] Server endpoint: GET /assessments/qualified — returns QUALIFIED/SELECTED applicants with scores, filterable by positionId and departmentId
- [x] Server endpoint: POST /assessments/select — bulk select applicants for appointment
- [x] Sidebar nav: "Selection" with Award icon for SUPER_ADMIN, LGU_HR_ADMIN
- [x] Route: /rsp/selection

---

## Phase 6: RSP — Appointment & Onboarding — COMPLETED

- [x] Database: Appointment and FinalRequirement models added to Prisma schema
- [x] Create appointment from SELECTED applications (SELECTED → APPOINTED)
- [x] "Appoint" button on Selection page with appointment/oath date dialog
- [x] Auto-create 8 default final requirements per appointment (Oath, Appointment Form, Assumption to Duty, Birth Certificate, Marriage Certificate, NBI, Medical, Barangay Clearance)
- [x] Auto-fill position to FILLED when all vacancy slots are appointed
- [x] Appointments list page with filters (status, position) and pagination
- [x] Appointment stats cards (Total, Pending, Completed)
- [x] Appointment detail page — appointee info, position, PDS data, dates
- [x] Generate Appointment Form (CS Form 33-B) — printable HTML with LGU header, appointee details, position info, salary, signatures — **superseded in Phase 16 by CS Form 33-A (Revised 2025)**
- [x] Generate Oath of Office (CS Form 32) — printable HTML with oath text, affiant signature, administering officer
- [x] Final requirements management — add custom requirements, delete unverified ones
- [x] Verify/unverify individual requirements with verifier tracking and timestamp
- [x] Progress bar showing verification completion
- [x] Auto-complete appointment when all requirements are verified
- [x] Auto-revert appointment to PENDING when a requirement is unverified
- [x] Edit appointment/oath dates
- [x] Sidebar nav: "Appointments" with FileCheck icon for SUPER_ADMIN, LGU_HR_ADMIN
- [x] Routes: /rsp/appointments (list) and /rsp/appointments/:id (detail)
- [x] Audit logging on all mutations (CREATE_APPOINTMENT, UPDATE_APPOINTMENT, ADD/DELETE/VERIFY/UNVERIFY requirement)

---

## Phase 6.5: PDS PDF Generation (CS Form 212 Revised 2025) — COMPLETED

- [x] jsPDF-based PDF generation (`client/src/lib/generatePDS.ts`)
- [x] Manual drawing approach (rect, line, text) for pixel-perfect layout
- [x] 8.5 x 13 inch folio paper (612 x 936 points), narrow margins (20pt)
- [x] Helper functions: drawCell, putLabel, putValue, drawCheckbox, drawSectionHeader
- [x] Column grid system with named constants (X0–X6) for consistent alignment
- [x] Section header styling: #969696 bg, white bold italic text
- [x] Label cell styling: #eaeaea bg
- [x] Font sizes: Labels 5.5pt, Values 7pt, Section headers 7.5pt
- [x] Page 1 — Form header with left/top/right border, padded text (CS Form No. 212 title, warning, instructions)
- [x] Page 1 — I. Personal Information (16 rows with complex rowspan/colspan layouts)
- [x] Page 1 — Citizenship block with rowspanned checkbox layout (Filipino/Dual/By Birth/By Naturalization)
- [x] Page 1 — II. Family Background (spouse, father, mother, children with dynamic rows)
- [x] Page 1 — III. Educational Background (5 education level rows, 1.5x row height for word wrap, aligned columns)
- [x] Page 1 — Education: Year Graduated column aligned with children DOB column, reduced header fonts for compact columns
- [x] Page 1 — Signature/Date row and page footer
- [x] Page 2 — IV. Civil Service Eligibility (7 data rows, 6 columns: Eligibility, Rating, Date, Place, License No., Valid Until)
- [x] Page 2 — V. Work Experience (2025 revised format — no Monthly Salary/Pay Grade columns; From, To, Position Title, Dept, Status, Gov't Service)
- [x] Page 2 — Dynamic row count to fill available page space, Signature/Date row with e-signature note
- [x] Page 3 — VI. Voluntary Work (7 rows: Organization, Inclusive Dates, Hours, Position)
- [x] Page 3 — VII. Learning & Development (dynamic rows: Title, Dates, Hours, Type of L&D, Conducted By)
- [x] Page 3 — VIII. Other Information (7 rows, 3 equal columns: Skills/Hobbies, Distinctions, Memberships)
- [x] Page 3 — Signature/Date row and page footer
- [x] Page 4 — Questions 34–40 (left/right split layout, question cells with LABEL_BG, YES/NO checkboxes, details fields)
- [x] Page 4 — Q34 (consanguinity a/b), Q35 (admin offense/criminal), Q36 (convicted), Q37 (separated), Q38 (election a/b), Q39 (immigrant), Q40 (indigenous/PWD/solo parent)
- [x] Page 4 — 41. References (3 rows: Name, Address, Contact/Email; contact column aligned with YES checkbox column)
- [x] Page 4 — Passport-sized photo box (140pt wide, inner bordered table with passport text + PHOTO label)
- [x] Page 4 — 42. Declaration text (LABEL_BG), Gov ID inner table, Signature inner table, Right Thumbmark inner table
- [x] Page 4 — Oath section (SUBSCRIBED AND SWORN, wet signature inner table + Person Administering Oath label)
- [x] Page 4 — Page footer (CS FORM 212 Revised 2025, Page 4 of 4)

### Page 4 Polish (Complete)
- [x] Q35 a/b: Rowspanned question label cell (left), separate answer/checkbox cells (right)
- [x] Q38 a/b: Rowspanned question label cell (left), separate answer/checkbox cells (right)
- [x] Q40 intro + a/b/c: Merged into single rowspanned label cell (left), separate answer cells (right)
- [x] Q34–Q40: Increased row heights for better spacing
- [x] Section 41 References: Title row spans only up to photo box (not full width), height 22pt
- [x] Section 41 Passport photo: Inner bordered table with padding (row 1: passport text no bg, row 2: PHOTO label with LABEL_BG), 140pt wide, extends into declaration area to align with thumbmark
- [x] Section 42 Declaration: LABEL_BG background on declaration text cell
- [x] Section 42 Gov ID: Inner bordered table with 4pt padding (header row with LABEL_BG, 3 plain field rows, govRowH=24pt)
- [x] Section 42 Signature: Inner bordered table with 4pt padding (4 rows: wet signature space, Signature label with LABEL_BG 10pt, date space, Date Accomplished label with LABEL_BG 10pt)
- [x] Section 42 Right Thumbmark: Inner bordered table with 4pt padding (big space + Right Thumbmark label with LABEL_BG 10pt), matches gov ID/signature height
- [x] Oath section: Wet signature / Person Administering Oath as inner bordered table (no parent border, 240pt wide centered, big space 36pt + label with LABEL_BG 12pt)

### Page 1 Polish (Complete)
- [x] Civil status row height increased (RH + 18 = 35pt) for better checkbox layout
- [x] Date of birth / Place of birth rows expanded (citizenBlockH = RH * 3) to fit citizenship checkboxes
- [x] Residential & permanent address: subdivision+barangay merged into one cell, city+province merged into one cell
- [x] All date values formatted to dd/mm/yyyy (fmtDate helper) — DOB, children DOB, eligibility dates, work exp, voluntary work, L&D, license validity, Q35b date
- [x] Labels 1-5, 7-15, 19-21, 22-25, 26 vertically centered in cells (putLabel `h` option)
- [x] NAME EXTENSION labels (2, 22, 24) kept top-aligned

### Pages 2-3 Polish (Complete)
- [x] V. Work Experience — instruction text merged into section header row (drawSectionHeaderWithSub)
- [x] VI. Voluntary Work — reduced Inclusive Dates & Number of Hours column widths, expanded Position/Nature of Work
- [x] VI. Voluntary Work — NUMBER OF HOURS label wrapped to 3 lines
- [x] VII. L&D — reduced Inclusive Dates, Number of Hours & Type of L&D column widths, expanded Conducted/Sponsored By
- [x] VII. L&D — NUMBER OF HOURS label wrapped to 3 lines

### Reference Document
- Layout reference: `_Claude_To_Read/RefFiles/2025 revised PDS new2.pdf` (CS Form 212 Revised 2025, 4 pages)
  - Page 1: Personal Information, Family Background, Educational Background
  - Page 2: Civil Service Eligibility, Work Experience
  - Page 3: Voluntary Work, L&D, Other Information
  - Page 4: Questions 34–40, References, Declaration, Gov ID, Signature, Oath

### Files Modified
- `client/src/lib/generatePDS.ts` — Complete 4-page PDS PDF generation (~2150 lines)
- `client/src/features/pds/PDSFormPage.tsx` — Updated to call `generatePDS(formData)` for PDF export

---

## Phase 7: Learning & Development — COMPLETED

### Database
- [x] TrainingType enum (MANAGERIAL, SUPERVISORY, TECHNICAL, FOUNDATION)
- [x] TrainingStatus enum (UPCOMING, ONGOING, COMPLETED, CANCELLED)
- [x] Training model (title, description, type, venue, conductedBy, startDate, endDate, numberOfHours, status, lguId, createdBy)
- [x] TrainingParticipant model (firstName, lastName, department, attended, completedAt, remarks) — standalone, not linked to User
- [x] Relations on Lgu (trainings) and User (trainingsCreated)
- [x] Schema pushed to database

### Server
- [x] Training controller — createTraining, getTrainings, getTraining, updateTraining, deleteTraining
- [x] Participant management — addParticipants (bulk, name/department fields), removeParticipant
- [x] Status actions — completeTraining, cancelTraining, markAttendance (bulk)
- [x] Training routes with authenticate + requireRole(SUPER_ADMIN, LGU_HR_ADMIN)
- [x] Routes registered at /api/trainings in app.ts
- [x] Audit logging on all mutations
- [x] LGU scoping for non-super-admin users
- [x] Delete restricted to UPCOMING trainings only

### Client
- [x] Training types added to types/index.ts (TrainingType, TrainingStatus, Training, TrainingParticipant)
- [x] TrainingPage (/lnd/training) — list with stats cards (Total, Upcoming, Ongoing, Completed), search, status/type filters, paginated table, create/edit dialog with SuggestionInput quick-fill, delete confirmation
- [x] TrainingDetailPage (/lnd/training/:id) — training info card, participants table (Name, Department, Attended, Completed), add participants form dialog (multi-row with first name, last name, department dropdown), attendance marking, complete/cancel actions
- [x] Sidebar nav: "Training" with GraduationCap icon after Appointments (SUPER_ADMIN, LGU_HR_ADMIN)
- [x] App.tsx routes: /lnd/training and /lnd/training/:id
- [x] View button with Eye icon in training list actions column

### Not Yet Done
- [ ] Training records integration with PDS Section VII
- [ ] Training reports & certificates
- [ ] L&D Module Overhaul — public training portal, interest registration, certificate generation (see Plan.md Phase 7 Expansion)

---

## Phase 7.5: CSC Publication Batch Management — COMPLETED

### Database
- [x] CscPublicationBatch model (batchNumber, description, openDate, closeDate, isPublished, publishedAt, lguId, createdBy)
- [x] @@unique([lguId, batchNumber]) constraint
- [x] Position model: added optional cscBatchId FK → CscPublicationBatch (onDelete: SetNull)
- [x] Reverse relations on Lgu (cscBatches) and User (cscBatchesCreated)

### Server
- [x] CSC Batch controller — getCscBatches, getCscBatch, createCscBatch, updateCscBatch, deleteCscBatch
- [x] Publish/Unpublish — publishCscBatch (DRAFT positions → OPEN), unpublishCscBatch (OPEN positions → DRAFT)
- [x] Batch position management — addPositionsToBatch, removePositionFromBatch
- [x] Batch detail includes LGU data (name, slug, address, contactNumber, email)
- [x] Closing date auto-calculated (posting date + 15 calendar days)
- [x] CSC batch routes with authenticate + requireLguAdmin
- [x] Registered at /api/csc-batches in app.ts
- [x] Position controller updated — cscBatchId required on create, included in responses
- [x] Position status guard — cannot publish position individually if batch is unpublished
- [x] Position status transitions — OPEN → DRAFT (unpublish) and OPEN → CLOSED (close) as separate actions
- [x] Public controller — positions only visible when cscBatch.isPublished = true

### Client
- [x] CscPublicationBatch type with lgu, creator, positions fields
- [x] CscBatchPage — stats cards (Total, Published, Unpublished), searchable table, create/edit/delete dialogs
- [x] CscBatchDetailPage — batch info cards, positions table, add/remove positions, publish/unpublish
- [x] Position form — CSC Batch required field, auto-fills openDate/closeDate from batch
- [x] Positions table — CSC Batch column, separate Unpublish and Close buttons for OPEN positions
- [x] Sidebar: "CSC Batches" (FileStack icon) before Positions (SUPER_ADMIN, LGU_HR_ADMIN)
- [x] Routes: /rsp/csc-batches and /rsp/csc-batches/:id

### Export Features
- [x] Export to PDF (CS Form No. 9, Revised 2025) — `client/src/lib/generateCSCBatchForm.ts`
  - jsPDF manual drawing, landscape 8.5x13 folio (936x612pt)
  - Full form layout: header, LGU name, positions table with Qualification Standards merged header, footer instructions, signatory
  - Only includes non-DRAFT positions (OPEN, CLOSED, FILLED)
- [x] Export to Excel — `client/src/lib/generateCSCBatchExcel.ts`
  - ExcelJS with full styling (bold headers, borders, merges, alignment, wrap text)
  - Same CS Form No. 9 layout as PDF version
  - Only includes non-DRAFT positions (OPEN, CLOSED, FILLED)

---

## SUPER_ADMIN Role Restrictions — COMPLETED

SUPER_ADMIN can only **manage** (full CRUD) LGUs, Departments, and Users. All other modules are **view-only**.

### Server
- [x] `denySuperAdminWrite` middleware in `server/src/middleware/auth.ts` — returns 403 for SUPER_ADMIN on mutation endpoints
- [x] Applied to all mutation routes: CSC Batches, Positions, Applications, Interviews, Assessments, Appointments, Training
- [x] GET routes remain accessible (view-only)

### Client — Action Buttons Hidden for SUPER_ADMIN
- [x] CSC Batches: create/edit/delete/publish/unpublish/add-remove positions (exports remain visible)
- [x] Positions: add/edit/delete/status change buttons
- [x] Applications: status change actions (endorse, shortlist, reject, qualify, select, appoint)
- [x] Interviews: schedule/complete/cancel/attendance buttons
- [x] Selection: checkboxes, select for appointment, appoint buttons
- [x] Appointments: edit dates, add/verify/unverify/delete requirements (print buttons remain visible)
- [x] Training: add/edit/delete/complete/cancel/manage participants

### SUPER_ADMIN Enhancements
- [x] Department page: LGU filter dropdown + LGU select on create form + LGU column in table
- [x] User page: LGU filter dropdown + LGU select on create form + LGU column in table

---

## Process Flow Page — COMPLETED

- [x] `client/src/features/process-flow/ProcessFlowPage.tsx` — 13-step RSP process cards with icons, status workflow summary, role permissions table
- [x] Role Permissions table visible only to SUPER_ADMIN
- [x] Accessible via Header profile dropdown menu ("Process Flow" with GitBranch icon)
- [x] Routes: /rsp/process-flow and /applicant/process-flow (all logged-in users)
- [x] Reference doc: `_Claude_To_Read/ProcessFlow.md` updated with current SUPER_ADMIN view-only permissions

---

## Phase 8: Polish, Reports & Optimization — COMPLETED

### 8.1 Dashboard Revamp
- [x] LGU Admin dashboard — stats cards (Open Positions, Total Applications, Pending/Completed Appointments), application pipeline badges, recent positions table, recent applicants table, upcoming trainings banner
- [x] Super Admin dashboard — system overview (Total LGUs, Users, Departments, Positions)
- [x] Server endpoint: `GET /api/dashboard/stats` — aggregated dashboard data in one call, role-scoped
- [x] Sidebar LGU logo — shows uploaded LGU logo instead of Shield icon when available

### 8.2 Reports with Charts (Recharts)
- [x] Reports page with Tabs (Positions, Applications, Training)
- [x] Position reports — donut chart by status, horizontal bar chart by department
- [x] Application reports — pipeline bar chart (color-coded by status), monthly trend chart (last 6 months)
- [x] Training reports — donut chart by type, bar chart by status
- [x] Server endpoints: `GET /api/reports/positions`, `/api/reports/applications`, `/api/reports/trainings`
- [x] Sidebar nav: "Reports" with BarChart3 icon (SUPER_ADMIN, LGU_HR_ADMIN)
- [x] Route: /rsp/reports
- [x] shadcn/ui Tabs component added (`client/src/components/ui/tabs.tsx`)

### 8.3 Audit Log Viewer
- [x] Audit log page with filterable, paginated table
- [x] Filters: search (user/action/entity), action dropdown, entity dropdown, date from/to, clear all
- [x] Table columns: Date & Time, User (name + role), Action (color-coded badge), Entity (#id), Details (old → new changes)
- [x] Server endpoints: `GET /api/audit-logs` (paginated, filterable), `GET /api/audit-logs/filters` (distinct actions/entities)
- [x] LGU-scoped — HR admins only see logs from their LGU's users
- [x] Sidebar nav: "Audit Logs" with ScrollText icon (SUPER_ADMIN, LGU_HR_ADMIN)
- [x] Route: /admin/audit-logs

### 8.4 Mobile Responsiveness
- [x] `overflow-x-auto` added to all 19 table wrappers across 14 pages — tables scroll horizontally on small screens
- [x] Dialog scrolling — `max-h-[90vh] overflow-y-auto` on DialogContent component (all dialogs)

### 8.5 Performance Optimization
- [x] Lazy loading — all 28 page components use `React.lazy()` + `Suspense` with spinner fallback
- [x] Search debouncing (500ms) — `useDebounce` hook applied to all 9 search inputs
- [x] Custom hook: `client/src/hooks/useDebounce.ts`

---

## Dependencies & Tools

### Server (`server/package.json`)
| Package | Purpose |
|---------|---------|
| express | Web framework |
| typescript / ts-node-dev | TypeScript runtime |
| @prisma/client / prisma | ORM & database migrations |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| multer | File upload handling (documents, logos, header backgrounds) |
| sharp | Image compression (logo → 200x200 WebP, header bg → 1920x600 WebP) |
| zod | Request validation |
| cors | Cross-origin requests |
| dotenv | Environment variables |
| nodemailer | Email notifications (configured, not yet active) |

### Client (`client/package.json`)
| Package | Purpose |
|---------|---------|
| react / react-dom | UI framework |
| vite | Build tool & dev server |
| typescript | Type checking |
| tailwindcss | Utility-first CSS |
| @radix-ui/* | Headless UI primitives (via shadcn/ui) |
| @tanstack/react-query | Server state management & caching |
| react-router-dom | Client-side routing |
| zustand | Auth state management (persisted) |
| axios | HTTP client with interceptors |
| react-hook-form / @hookform/resolvers | Form handling with Zod validation |
| zod | Schema validation |
| lucide-react | Icons |
| sonner | Toast notifications |
| jspdf | PDF generation (PDS CS Form 212, CSC Batch CS Form 9) |
| jspdf-autotable | jsPDF table plugin (installed, used by PDS) |
| exceljs | Excel generation with styling (CSC Batch CS Form 9 export) |
| file-saver | Client-side file download (used with exceljs) |
| recharts | Charts & data visualization (Reports page) |
| class-variance-authority / clsx / tailwind-merge | shadcn/ui utilities |

### Production Deployment Checklist
- [ ] Node.js 18+ runtime
- [ ] MySQL 8.x with `primehrm` database
- [ ] Run `npx prisma migrate deploy` (or `npx prisma db push`) on server
- [ ] Run `npx prisma generate` on server
- [ ] Set environment variables: DATABASE_URL, JWT_SECRET, CORS_ORIGIN
- [ ] Create `uploads/` directory with write permissions (for documents & logos)
- [ ] Run `npm run build` on client (Vite production build)
- [ ] Serve client build as static files or via CDN
- [ ] Run `npm run db:seed` for initial data (optional)

---

## Getting Started

### Prerequisites
- Node.js, MySQL 8.x running with database `primehrm`

### Start Services (2 terminals)

**Terminal 1 — Server (Express API on port 5000):**
```bash
cd server
npm run dev
```

**Terminal 2 — Client (Vite on port 3000):**
```bash
cd client
npm run dev
```

### Useful Commands
```bash
# Reseed database (resets all data)
cd server && npm run db:seed

# Push schema changes to database
cd server && npm run db:push

# Regenerate Prisma client after schema changes
cd server && npm run db:generate
```

---

## Key Bug Fixes & Technical Notes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| PDS not loading on form | setState inside queryFn unreliable with cached queries | useEffect sync on query result |
| ApplyPage crash (firstName undefined) | PDS form and ApplyPage shared `['pds']` key but different data shapes | Unified to return raw PDS JSON, access `pds.firstName` |
| Applications not refreshing after submit | Missing cache invalidation | Added `invalidateQueries(['my-applications'])` in ApplyPage onSuccess |
| Interview complete → Applications stale | completeMutation didn't invalidate applications cache | Added `invalidateQueries(['applications'])` to complete/cancel/noShow mutations |
| Assessment scores not displaying | Query cached from initial load | Set `staleTime: 0` on assessment-score query |
| 500 on interview complete | Client sent `applicantId: a.id` instead of `applicationId` | Fixed to `applicationId: a.applicationId` |
| Dialog aria-describedby warnings | Missing DialogDescription | Added DialogDescription to all Dialogs |
| DOM nesting (div in p) | Badge renders div, was inside p tag | Changed parent to span/div |
| Prisma Decimal as string | Prisma serializes Decimal fields as strings | Use `Number()` conversion for display |
| Seed audit logs showing generic CREATE/UPDATE | Seed used wrong action names (`CREATE`/`UPDATE`) and entity case (`Application`) | Fixed to match real controller actions (`SUBMIT_APPLICATION`, `ENDORSE_APPLICATION`, etc.) and lowercase entity (`application`) |
| PDS stale data across user sessions | TanStack Query cache persists after logout — new user sees previous user's cached PDS | Added `queryClient.clear()` on logout in Header.tsx |

---

## Login Page Redesign — COMPLETED

- [x] Split-screen layout: green branded left panel + white login right panel
- [x] Left panel: emerald gradient background with white text, subtle Shield pattern
- [x] LGU logo (24px, rounded-2xl), name (2xl-3xl bold), address with MapPin icon, contact with Phone icon, email with Mail icon — all centered
- [x] PRIME-HRM branding with glass-effect icon container, HRM in emerald-200
- [x] Removed Performance Management and Rewards & Recognition pillar cards
- [x] 2 active pillars (RSP + L&D) displayed side-by-side with glass-effect styling (bg-white/10 backdrop-blur)
- [x] Right panel: clean white background, login form, demo accounts
- [x] Demo accounts updated to Lapu-Lapu: `lapulapuhr`, `lapulapueng`, `juandelacruz`

---

## Lapu-Lapu Seed Data Expansion — COMPLETED

- [x] 5 departments: HR, Engineering, Treasury, Tourism, Health
- [x] Tourism Office Admin account (`lapulaputourism` / `office123`)
- [x] 4 CSC Batches — all published (2026-001 through 2026-004)
- [x] 13 positions across 4 batches (12 OPEN + 1 FILLED):
  - Batch 1 (Feb): Civil Engineer III, Tourism Ops Officer III, Revenue Collection Officer II
  - Batch 2 (Mar): Nurse II, Administrative Officer III
  - Batch 3 (Apr): Fire Marshal I, Social Welfare Officer II, IT Officer I
  - Batch 4 (May): Environmental Management Specialist II, Administrative Aide VI (2 slots), Tourism Promotion Officer I, Driver I, Utility Worker I (2 slots)
- [x] 9 applications with full pipeline status transitions + 78 audit logs
- [x] 3 interviews, 4 assessments, 2 appointments, 3 trainings

---

## Phase 9: Module Separation (RSP / L&D / Administration) — 9A–9C COMPLETED

Training was previously inside the single `/admin` area. The app is now split into two business
modules plus a system section, with a post-login launcher and a sidebar switcher.

### Route Namespaces
| Section | Base | Pages | Who can enter |
|---------|------|-------|---------------|
| RSP | `/rsp` | Dashboard, Positions, Publications, Applications, Interviews, Selection, Appointments, Reports | SUPER_ADMIN, LGU_HR_ADMIN, LGU_OFFICE_ADMIN |
| L&D | `/lnd` | Dashboard, Training, Reports | SUPER_ADMIN, LGU_HR_ADMIN |
| Administration | `/admin` | Dashboard (super admin), LGU Management, Departments, Users, HRMPSB Signatories, Audit Logs | SUPER_ADMIN, LGU_HR_ADMIN |
| Applicant portal | `/applicant` | Dashboard, PDS, My Applications | APPLICANT |

### Post-Login Destination
| Role | Lands on | Why |
|------|----------|-----|
| SUPER_ADMIN | `/admin` → `/admin/lgus` | Administration is their whole job |
| LGU_HR_ADMIN | `/modules` | Two modules available → launcher |
| LGU_OFFICE_ADMIN | `/rsp` → `/rsp/dashboard` | Only one module available → launcher skipped |
| APPLICANT | `/applicant/dashboard` | No modules |

### 9A — Module Foundation (COMPLETED)
- [x] `client/src/lib/modules.ts` — registry: `MODULES`, `moduleForPath`, `canAccessModule`, `modulesForUser`, `launcherModulesForUser`, `defaultDestination`, `homeFor`, `postLoginDestination`
- [x] `ModuleKey` type (`'RSP' | 'LND' | 'ADMIN'`) declared in `types/index.ts` to keep the import direction one-way (no cycle with `modules.ts`)
- [x] `client/src/hooks/useActiveModule.ts` — `useActiveModule`, `useEnabledModules`, `useModuleAccess`
- [x] Auth store: persisted `moduleMemory: { userId, module }` + `rememberModule` / `forgetModule`
- [x] `moduleMemory` deliberately survives logout (device preference, not session state)
- [x] `ProtectedRoute` gains a `module` prop — checks role **and** LGU licensing
- [x] `Lgu.enabledModules?: ModuleKey[] | null` added to client types (server field lands in 9E)

### 9B — Route Restructure (COMPLETED)
- [x] All 54 hardcoded `/admin/*` refs updated across 19 files
- [x] `postLoginDestination()` replaces hardcoded `/admin/dashboard` in LoginPage & RegisterPage
- [x] `homeFor(user)` replaces `role === 'APPLICANT' ? ... : ...` ternaries in CareersPage, PositionDetailPage, ProtectedRoute, Sidebar brand link
- [x] Header profile link is now module-relative (`${basePath}/profile`)
- [x] Process Flow only offered inside RSP and the applicant portal (it documents the RSP pipeline)
- [x] `AdminIndexRedirect` — `/admin` sends SUPER_ADMIN to `lgus`, HR admin to `departments`
- [x] `LegacyRedirect` for 11 moved segments — `/admin/positions/3` → `/rsp/positions/3`, preserves query string

### 9C — Launcher & Switcher (COMPLETED)
- [x] `client/src/features/modules/ModuleLauncherPage.tsx` — emerald gradient, LGU logo + name, two module cards, sign-out
- [x] Unavailable modules render as locked cards with a reason ("Not enabled for this LGU" vs "Not available for your role")
- [x] "Remember my choice and skip this screen next time" Switch — only committed when a module is actually clicked
- [x] Sidebar `ModuleSwitcher` dropdown — current module, switch targets with check mark, "All modules" link
- [x] Sidebar nav items tagged with `module` and filtered by active module + role
- [x] Administration gear icon in Header (hidden while already inside Administration)

### Key Design Decisions
| Decision | Rationale |
|----------|-----------|
| Active module **derived from URL**, never stored | Storing it lets the sidebar and route desync (e.g. at `/lnd/training` while showing the RSP sidebar). `moduleForPath(pathname)` cannot disagree with itself. |
| Launcher after login, not a picker on the login form | Login establishes identity, not destination. A picker would force module choice before auth and require logout to switch. |
| Administration is a header gear, not a launcher card | It is system settings, not a business module. Keeps the launcher honest and scales to PRIME-HRM pillars 3 & 4. |
| `moduleMemory` keyed to `userId` | A different user on the same browser still sees the launcher instead of inheriting the previous user's module. |
| Remember toggle commits on card click, not on toggle | Flipping the switch alone would otherwise silently bind the user to a module they never picked. |
| LGU_OFFICE_ADMIN excluded from L&D | Every L&D page is HR-only today; including them meant clicking the L&D card bounced straight back to the launcher. Re-add when department-level training assignment ships. |
| `defaultDestination` skips launcher at 1 module | A launcher with a single card is just a speed bump. |

### Verification
- Client typecheck clean (2 pre-existing `suggestion-input.tsx` errors unrelated)
- Production `vite build` succeeds
- All new/changed files transform without error on the running Vite dev server
- Live API confirmed: login payload carries `lgu` (with logo) for HR admins, `null` for super admin

### 9D — Split Dashboards & Reports (COMPLETED)
Three dashboards, one per section, each with its own endpoint:

| Dashboard | Route | Endpoint | Who |
|-----------|-------|----------|-----|
| Administration (system overview) | `/admin/dashboard` | `GET /api/dashboard/admin` | SUPER_ADMIN |
| Recruitment | `/rsp/dashboard` | `GET /api/dashboard/rsp` | SUPER_ADMIN (all LGUs), LGU_HR_ADMIN, LGU_OFFICE_ADMIN (dept-scoped) |
| Learning & Development | `/lnd/dashboard` | `GET /api/dashboard/lnd` | SUPER_ADMIN (all LGUs), LGU_HR_ADMIN |

- [x] `GET /api/dashboard/stats` retired; replaced by `/admin`, `/rsp`, `/lnd` (see `dashboard.controller.ts`, `dashboard.routes.ts`)
- [x] The old super-admin "system overview" moved out of `/rsp/dashboard` into `/admin/dashboard` (it was orphaned — super admins land on `/admin`, never `/rsp`)
- [x] `AdminIndexRedirect`: `/admin` → `dashboard` for SUPER_ADMIN, `departments` for HR admin
- [x] `/lnd` index now redirects to `dashboard` (was `training`)
- [x] Cross-module "upcoming trainings" banner removed from the RSP dashboard
- [x] Client dashboard split into `AdminDashboardPage`, `RspDashboardPage`, `LndDashboardPage` + shared `components.tsx` (`StatCard`, `DashboardLoader`, `STATUS_CONFIG`)
- [x] L&D dashboard stats: total/upcoming/ongoing/completed trainings, participants enrolled vs trained, attendance rate, recent trainings table
- [x] Reports split: `RspReportsPage` (`/rsp/reports`, Positions + Applications tabs) and `LndReportsPage` (`/lnd/reports`, training charts) + shared `reportCharts.tsx` (`STATUS_COLORS`, `formatLabel`, `ChartLoader`, `EmptyChart`)
- [x] Report endpoints unchanged (`/reports/positions`, `/reports/applications`, `/reports/trainings` already separate)
- [x] Sidebar: L&D gains Dashboard + Reports; Administration gains Dashboard (SUPER_ADMIN)
- [x] Verified live: all three dashboard endpoints return correct data; `/dashboard/admin` returns 403 for HR admin

### 9E — Per-LGU Module Licensing (COMPLETED)
A SUPER_ADMIN can license RSP and/or L&D per LGU. Administration is never licensable.

- [x] `enabledModules Json?` on `lgus` table (`@map("enabled_modules")`). **Null = all modules on** — matches the client's `?? undefined` handling, avoids MySQL JSON-default issues
- [x] `server/src/config/modules.ts` — `LICENSABLE_MODULES` (`['RSP','LND']`), `parseEnabledModules` (validates + de-dupes, throws on bad key), `lguHasModule`
- [x] `createLgu` / `updateLgu` accept `enabledModules`; invalid keys → 400; update uses `Prisma.DbNull` to clear
- [x] `enabledModules` included in `login` and `getMe` `lgu` selects; auto-present in `getLgus` / `getLgu` (no select)
- [x] `authenticate` middleware fetches `lgu.enabledModules` and exposes it on `req.user`
- [x] `requireModule(key)` middleware — 403 when the user's LGU lacks the module; SUPER_ADMIN and no-LGU users bypass
- [x] Applied `requireModule('LND')` to all training routes, `GET /dashboard/lnd`, `GET /reports/trainings`
- [x] RSP left client-enforced for now (it is the core module, rarely disabled); middleware is ready to apply the same way if needed
- [x] Client: `LguPage` dialog has RSP / L&D toggles (Switch); table shows a Modules column; sends `enabledModules` on create/update
- [x] Seed: Cebu City, Lapu-Lapu, Cebu Province = both modules; **Mandaue = RSP only** (demo of a disabled module)
- [x] Verified live: `mandauehr` gets 403 on `/trainings`, `/dashboard/lnd`, `/reports/trainings` but 200 on `/dashboard/rsp`; enabling L&D via PUT flips it to 200; invalid module key → 400

#### How Licensing Interacts With the Client
> The `mandauehr` examples below are historical — Phase 18 removed Mandaue from the seed. The
> mechanism is unchanged; there is simply no seeded account demonstrating it.

- `mandauehr` has `enabledModules: ['RSP']` → `launcherModulesForUser` returns only RSP → launcher is skipped, lands on `/rsp`
- If they reach `/modules`, the L&D card renders locked ("Not enabled for this LGU")
- The L&D route group is guarded by `ProtectedRoute module="LND"` → redirected to their home if they navigate there directly

### 9F — Per-User Module Access (COMPLETED)
HR admins (and super admins) grant modules to individual users within their LGU. This is a third
layer **below** LGU licensing.

**Effective access = role ∩ LGU licensing ∩ per-user grant.** SUPER_ADMIN bypasses the last two.

- [x] `moduleAccess Json?` on `users` table (`@map("module_access")`). **Null = no modules (deny-by-default)** — the opposite of the LGU field, which is null = all
- [x] All three modules grantable per user (RSP, L&D, **and Administration**), clamped to what the user's role allows (office admins → RSP only)
- [x] `server/src/config/modules.ts` extended: `ALL_MODULES`, `ROLE_MODULES` (server mirror of client role→module map), `parseModuleAccess`, `userHasModule`; `lguHasModule` now returns true for non-licensable ADMIN
- [x] `authenticate` loads `moduleAccess`; `requireModule(key)` now checks **both** LGU license and per-user grant
- [x] `requireModule('ADMIN')` applied to `/users` and `/audit-logs` (Administration surfaces). Department reads left open — RSP needs them
- [x] `createUser` / `updateUser` accept `moduleAccess`, validate + clamp to role; invalid key → 400
- [x] **Self-lockout guard**: a user editing their own record cannot remove their own ADMIN grant (server 400 + client disables the toggle)
- [x] `moduleAccess` returned in `login` / `getMe` / `getUsers`; `getUsers` `lgu` select now includes `enabledModules` (so the super-admin form can compute grantable modules)
- [x] Client: `canAccessModule` enforces the grant (deny-by-default, super admin bypass); `accessOptionsFor(user)` builds the opts; threaded through `homeFor` / `postLoginDestination` / `useModuleAccess` / `ProtectedRoute`
- [x] Launcher: third locked-card reason — role → LGU license → **"Not assigned to your account"**
- [x] `UserPage`: module toggle switches in the create/edit dialog (only grantable modules shown), Modules table column, self-lockout disables own ADMIN toggle
- [x] Seed: every HR/office admin gets an explicit grant (HR = RSP+LND+ADMIN, or RSP+ADMIN for Mandaue which lacks L&D; office admins = RSP)
- [x] Verified live: office admin (RSP only) → 403 on `/users` and `/trainings`, 200 on `/applications`; created a recruitment-only HR admin (RSP only) → 403 on L&D + Administration; self-lockout, role-clamp, and invalid-key all rejected

#### The Three-Layer Access Model
```
LGU licensing (super admin)   — which modules the LGU bought        (null = all)
   ∩ Role                     — which modules the role can ever use
   ∩ Per-user grant (HR)      — which modules THIS user may enter    (null = none)
   = effective module access
```
Server enforcement: L&D via `requireModule('LND')` (training, L&D dashboard/reports); Administration
via `requireModule('ADMIN')` (users, audit-logs). RSP stays client-enforced (core module; its routes
mix in public/applicant endpoints).

---

## RSP — Reuse Previous Position (SUPERSEDED by Phase 10)

> **Superseded.** The inline title-autocomplete reuse feature and the `GET /positions/templates`
> endpoint were removed in **Phase 10**. The Positions **catalog** is now itself the reusable list:
> a position is defined once in the catalog and added to any number of publications. `positionTemplates.ts`
> and the `/templates` route no longer exist. The section below is kept for history only.

When creating a position, HR can pre-fill the whole form from a position the LGU has posted
before, instead of re-encoding the same plantilla item each publication batch.

- [x] Server: `GET /positions/templates` — distinct prior positions for the LGU, deduped by
  `title + itemNumber` (most recent kept), with all fields, qualification standards, document
  requirements, and the last batch number. LGU-scoped; route registered **before** `/:id`
- [x] Client: **inline autocomplete on the Position Title field** (create only) — as HR types or
  focuses the title, matching prior positions drop down under it (`positionTemplates.ts` holds the
  type + `usePositionTemplates` hook). No separate box/button — kept subtle per design feedback
- [x] Selecting a suggestion pre-fills every field via `setValue` + `setDocRequirements` (+ toast)
- [x] Copies **everything incl. the document-requirements list** (uses the form's existing
  second `POST /positions/:id/requirements` call — no change to `createPosition` needed)
- [x] CSC batch, posting date, and closing date intentionally NOT copied — they belong to the
  new batch. Result is a fresh DRAFT position, no link to the source
- [x] Verified live: Lapu-Lapu HR sees 13 distinct templates (each with 7 requirements);
  Mandaue (no positions) sees 0 → picker hidden

---

## Phase 10: Positions Catalog & Publications Remodel — COMPLETED

Restructured the RSP position model into a **master/instance (catalog + snapshot)** design and
renamed "CSC Batches" to **Publications**. Motivation: the old model conflated the reusable position
definition, its recruitment status, and its batch assignment on one `Position` row, which forced
re-encoding and put status actions in the wrong place.

### Conceptual model
- **Positions** module = master **catalog** of reusable position definitions (qualification standards
  + document-requirement template). No status, no slots, no publication link.
- **Publications** module = create a publication, then **add positions from the catalog** into it.
  Each add **snapshots** the catalog definition (and its document requirements) into a `Position`
  **instance** that carries status/slots/dates and owns the applicant pipeline. Published records are
  therefore frozen even if the catalog master later changes.
- The same catalog position can be added to many publications over time (true reuse).

### Database
- [x] New `PositionCatalog` model (`position_catalog`) — master definition; `isActive`; relations to
  Lgu/Department; `documentRequirements PositionCatalogRequirement[]`; `positions Position[]`
- [x] New `PositionCatalogRequirement` model (`position_catalog_requirements`) — requirement template,
  `onDelete: Cascade`
- [x] Renamed `CscPublicationBatch` → `Publication` (`publications`); `batchNumber` → `publicationNumber`;
  `@@unique([lguId, publicationNumber])`; relation `PublicationCreator`
- [x] `Position` — dropped `cscBatchId`, added `publicationId` (→ Publication, SetNull) and `catalogId`
  (→ PositionCatalog, SetNull). Still owns status/slots/dates + applications/interviews/assessments/appointments
- [x] `db push` + `prisma generate` (dev workflow, no migration files)

### Server
- [x] New `positionCatalog.controller.ts` + `positionCatalog.routes.ts` — CRUD at `/api/position-catalog`;
  create/update embed the document-requirement template; delete blocked while used in ≥1 publication
- [x] Renamed `cscBatch.controller.ts`/`routes.ts` → `publication.controller.ts`/`routes.ts` at
  `/api/publications`; `addPositionsToPublication` snapshots selected catalog entries into instances;
  `removePositionFromPublication` deletes an instance (blocked if it has applications)
- [x] `position.controller.ts` — positions are now instances only; removed `createPosition` and
  `getPositionTemplates`; `updatePositionStatus` guards "publication must be published first"
- [x] `public.controller.ts` — careers filter now `publication.isPublished`
- [x] `app.ts` — mounts `/api/publications` and `/api/position-catalog`; `/api/csc-batches` removed

### Client
- [x] Positions page (`features/positions/PositionPage.tsx`) → **catalog CRUD** (no status/slots/
  publication/dates; removed reuse autocomplete; added Active toggle + "Used in N publications" column)
- [x] New `features/publications/` — `PublicationPage.tsx` (list/create/edit/delete) and
  `PublicationDetailPage.tsx` (add-from-catalog with per-position slots; **per-instance Publish/
  Unpublish/Close/Mark-Filled actions moved here from Positions**; publish/unpublish publication;
  CS Form 9 PDF/Excel export retained)
- [x] **Edit-in-publication** (per-publication qualification overrides): each DRAFT posting has an
  Edit dialog to change its qualifications, slots, department, and document requirements **for that
  publication only** — the catalog master and other publications are untouched (it edits the snapshot).
  A **"Customized"** badge flags instances whose QS differ from the catalog; a **Reset to catalog
  default** button re-copies the master's QS + requirements. Server freezes non-DRAFT postings:
  `PUT /positions/:id` and `POST /positions/:id/requirements` reject edits unless status is DRAFT
  (unpublish to edit). `getPublication` now includes each position's `catalog` QS for the badge.
  This is the answer to "same title, different requirements per publication" — no separate module.
- [x] **"View Careers Page"** button on both the Publications list and detail headers — opens
  `/{lgu-slug}/careers` in a new tab (real anchor; hidden for super admins, who have no LGU).
- [x] Sidebar: **Positions now before Publications**; "CSC Batches" renamed to "Publications"
- [x] Routes `/rsp/positions`, `/rsp/publications`, `/rsp/publications/:id`; legacy `/rsp/csc-batches`
  and `/admin/csc-batches` redirect to `/rsp/publications`
- [x] Types: `Publication`, `PositionCatalog`, `PositionCatalogRequirement`; `Position` gains
  `publicationId`/`catalogId`; removed `CscPublicationBatch`
- [x] Deleted `positionTemplates.ts` and the old `features/csc-batches/` folder
- [x] ProcessFlow page + `ProcessFlow.md` updated to the catalog → publication → snapshot flow

### Concern #1 (cache) fixed
The old "create a position, then refresh to see it in the batch" bug is gone by design: positions are
added directly on the publication detail page, and every mutation there invalidates `['publication']`,
`['publications']`, and `['position-catalog']`.

### Seed
- [x] `seed.ts` rewritten via a `makePosition()` helper that creates a catalog master + snapshotted
  instance for each seeded position. Result: **18 catalog masters, 6 publications, 18 instances**
  (all linked; 126 catalog + 126 instance document requirements). Verified live end-to-end (create
  catalog → add to publication → publish auto-opens instances → status guard → remove/delete).

---

## Upcoming Work (To Do)

### Appointment Document Annexes
- [ ] ANNEX A — DBM-CSC Form No. 1, Position Description Form (Revised 2017) — Fillable
- [ ] ANNEX B — SS Porma Blg. 32, Narebisa 2025 — Panunumpa sa Katungkulan — Generate
- [x] ANNEX C — CS Form No. 33-A, Revised 2025 — Appointment Form (Regulated) — **done in Phase 16** (replaced CS Form 33-B)
- [x] ANNEX I — CS Form No. 1, Revised 2025 — Appointment Transmittal and Action Form — **done in Phase 16** (PDF + Excel)
- [x] ANNEX L — CS Form No. 4, Revised 2025 — Certification of Assumption to Duty — **done in Phase 16**

### L&D Module Overhaul
- [x] Module switcher after login (RSP / L&D) + toggle in sidebar/header — done in Phase 9C
- [ ] Public training portal at `/:lgu-slug/trainings`
- [ ] Training interest registration (any logged-in user)
- [ ] HR manages interest submissions (approve/reject/waitlist)
- [ ] Training certificate PDF generation for completed participants

---

## LGU Careers Header Background — COMPLETED

- [x] Database: `headerBg` nullable field added to `lgus` table (Prisma schema)
- [x] Server: `uploadHeader` multer config (5MB limit, JPG/PNG/WebP, `uploads/headers/` directory)
- [x] Server: `uploadLguHeaderBg` controller — Sharp resize 1920x600, WebP quality 80, old file cleanup, audit logged
- [x] Server: Route `POST /api/lgus/:id/header-bg` (SUPER_ADMIN only)
- [x] Server: `getLguBySlug` includes `headerBg` in public response
- [x] Client: `headerBg` field added to `Lgu` type
- [x] Client: LGU Management dialog — header bg upload section with wide preview, 5MB limit
- [x] Client: Careers page — uses `lgu.headerBg` as hero background (falls back to plain bg-slate-800)
- [x] Client: Careers page — PRIME-HRM text enlarged (`text-base sm:text-lg`, bold, tracking-widest)

---

## Login Page Updates — COMPLETED

- [x] Demo accounts updated to Lapu-Lapu: `lapulapuhr`, `lapulapueng`, `juandelacruz`
- [x] Super Admin account removed from demo accounts display

---

## Cebu City Full Pipeline Seed Data

Seed file: `server/prisma/seed.ts` | Reference: `_Claude_To_Read/SeedData.md`

### CSC Publication Batches
| Batch | Status | Positions |
|-------|--------|-----------|
| 2026-001 | Published (Jan 15–30) | Admin Officer V, Nurse III, Accountant II |
| 2026-002 | Unpublished (Mar 1–16) | IT Officer I, Social Welfare Officer II |

### Positions (Cebu City)
| Position | Dept | SG | Slots | Status |
|----------|------|----|-------|--------|
| Administrative Officer V | Engineering | 18 | 2 | OPEN |
| Nurse III | Health | 17 | 1 | FILLED |
| Accountant II | Treasury | 15 | 1 | OPEN |
| IT Officer I | HR Office | 19 | 1 | DRAFT |
| Social Welfare Officer II | Social Welfare | 15 | 1 | DRAFT |

### Applications Pipeline (8 total)
| Position | Applicant | Status | Notes |
|----------|-----------|--------|-------|
| Admin Officer V | Juan Dela Cruz | APPOINTED | Score 97.00, appointment PENDING (3/8 reqs verified) |
| Admin Officer V | Roberto Santos | SELECTED | Score 91.50, awaiting appointment |
| Admin Officer V | Pedro Villanueva | QUALIFIED | Score 82.50, not selected (slots full) |
| Admin Officer V | Anna Reyes | SHORTLISTED | Awaiting interview assignment |
| Admin Officer V | Elena Marcos | ENDORSED | Awaiting office admin screening |
| Nurse III | Maria Garcia | APPOINTED | Score 102.50, appointment COMPLETED (8/8 verified) |
| Accountant II | Anna Reyes | SUBMITTED | Pending HR review |
| Accountant II | Pedro Villanueva | SUBMITTED | Pending HR review |

### Interviews (2 completed)
| Position | Date | Venue | Applicants |
|----------|------|-------|------------|
| Admin Officer V | 2026-02-15 | Conference Room A | Juan ✓, Roberto ✓, Pedro ✓ |
| Nurse III | 2026-02-10 | Conference Room B | Maria ✓ |

### Appointments (2)
| Appointee | Position | Status | Requirements |
|-----------|----------|--------|-------------|
| Juan Dela Cruz | Admin Officer V | PENDING | 3/8 verified (Oath, Appointment Form, Assumption to Duty) |
| Maria Garcia | Nurse III | COMPLETED | 8/8 verified |

### Training (4)
| Title | Type | Status | Participants |
|-------|------|--------|-------------|
| Public Service Values and Ethics | FOUNDATION | COMPLETED | 5 (4 attended, 1 absent) |
| Records Management and Digital Archiving | TECHNICAL | ONGOING | 4 |
| Leadership and Supervisory Development | SUPERVISORY | UPCOMING | 0 |
| Gender and Development Sensitivity Training | MANAGERIAL | COMPLETED | 3 (all attended) |

### Audit Logs
- 68 audit logs using correct controller action names:
  - Application: `SUBMIT_APPLICATION`, `ENDORSE_APPLICATION`, `SHORTLIST_APPLICATION`, `CREATE_INTERVIEW`, `COMPLETE_INTERVIEW`, `SAVE_ASSESSMENT_SCORE`, `QUALIFY_APPLICANTS`, `SELECT_APPLICANTS`, `CREATE_APPOINTMENT`
  - Appointment: `CREATE_APPOINTMENT`, `UPDATE_APPOINTMENT`, `VERIFY_REQUIREMENT`
  - Interview: `CREATE_INTERVIEW`, `COMPLETE_INTERVIEW`
  - CSC Batch & Training: `CREATE`, `UPDATE`

---

## Lapu-Lapu City Full Pipeline Seed Data

Seed file: `server/prisma/seed.ts`

### Departments (5)
Human Resource Office, Engineering Office, Treasury Office, Tourism Office, Health Office

### CSC Publication Batches
| Batch | Status | Positions |
|-------|--------|-----------|
| 2026-001 | Published (Feb 1–16) | Civil Engineer III, Tourism Ops Officer III, Revenue Collection Officer II |
| 2026-002 | Unpublished (Apr 1–16) | Nurse II, Administrative Officer III |

### Positions (Lapu-Lapu)
| Position | Dept | SG | Slots | Status |
|----------|------|----|-------|--------|
| Civil Engineer III | Engineering | 19 | 2 | OPEN |
| Tourism Operations Officer III | Tourism | 18 | 1 | OPEN |
| Revenue Collection Officer II | Treasury | 15 | 1 | FILLED |
| Nurse II | Health | 15 | 1 | DRAFT |
| Administrative Officer III | HR | 14 | 1 | DRAFT |

### Applications Pipeline (9 total)
| Position | Applicant | Status | Notes |
|----------|-----------|--------|-------|
| Civil Engineer III | Juan Dela Cruz | APPOINTED | Score 102.00, appointment PENDING (4/8 reqs verified) |
| Civil Engineer III | Roberto Santos | SELECTED | Score 95.00, awaiting appointment |
| Civil Engineer III | Anna Reyes | QUALIFIED | Score 86.50, not selected (slots full) |
| Civil Engineer III | Pedro Villanueva | SHORTLISTED | Awaiting interview assignment |
| Civil Engineer III | Elena Marcos | ENDORSED | Awaiting office admin screening |
| Tourism Ops Officer III | Maria Garcia | INTERVIEWED | Awaiting assessment scoring |
| Tourism Ops Officer III | Anna Reyes | FOR_INTERVIEW | Assigned to interview (no show) |
| Revenue Collection Officer II | Pedro Villanueva | APPOINTED | Score 94.00, appointment COMPLETED (8/8 verified) |
| Revenue Collection Officer II | Elena Marcos | REJECTED | Did not meet eligibility requirements |

### Interviews (3)
| Position | Date | Venue | Status |
|----------|------|-------|--------|
| Civil Engineer III | 2026-03-01 | Conference Room, 2nd Floor | COMPLETED (Juan ✓, Roberto ✓, Anna ✓) |
| Tourism Ops Officer III | 2026-03-05 | Mayor's Conference Room | COMPLETED (Maria ✓, Anna ✗) |
| Revenue Collection Officer II | 2026-02-25 | Conference Room, 2nd Floor | COMPLETED (Pedro ✓) |

### Appointments (2)
| Appointee | Position | Status | Requirements |
|-----------|----------|--------|-------------|
| Juan Dela Cruz | Civil Engineer III | PENDING | 4/8 verified (Oath, Appointment Form, Assumption to Duty, Birth Certificate) |
| Pedro Villanueva | Revenue Collection Officer II | COMPLETED | 8/8 verified |

### Training (3)
| Title | Type | Status | Participants |
|-------|------|--------|-------------|
| Coastal Resource Management Training | TECHNICAL | COMPLETED | 4 (3 attended, 1 absent) |
| Tourism Promotion and Digital Marketing | FOUNDATION | ONGOING | 3 |
| Local Government Executive Leadership Program | MANAGERIAL | UPCOMING | 0 |

### Audit Logs
- 78 audit logs with full status transition tracking for all 9 applications

---

## Phase 11: Work Experience Sheet Module — COMPLETED

Standalone WES module (CS Form No. 212 Attachment), mirroring the PDS module's create-data →
generate-PDF pattern. The backend already existed (`GET`/`POST /wes`, `getMyWes`/`saveMyWes`) —
this was client-only work.

### Design decisions
| Decision | Rationale |
|----------|-----------|
| **Fully independent of the PDS** — no prefill from PDS Section V | Explicit requirement. The applicant fills the WES from scratch; the two sheets never read each other |
| Repeating **entry cards**, not a table | The printed form is a narrative document (bulleted blocks per job), not a grid. Narrative text in a table cell is unusable |
| `duration` is **free text**, not date pickers | The form's own instruction calls for `"1998-Present"` and abbreviated months — date pickers make the required format impossible |
| `accomplishments` is a **string array** | The form lists them as separate bullets, not prose |

### Data shape (`WESEntry`)
`duration`, `position`, `officeUnit`, `immediateSupervisor`, `agencyAndLocation`,
`accomplishments: string[]`, `summaryOfDuties`.

> The previous `WESData` type modelled PDS Section V (`monthlySalary`, `salaryGrade`,
> `statusOfAppointment`) and matched nothing on the real form. It was referenced nowhere in the
> client, so it was replaced outright.

### Client
- [x] `features/wes/WESFormPage.tsx` — entry cards, add/remove entries, add/remove accomplishment
  bullets, duties textarea, save + download from header and footer
- [x] Form instructions reproduced verbatim from the CSC form in an amber callout
- [x] `lib/generateWES.ts` — jsPDF, folio 8.5x13 (matches PDS output). Split into `buildWESDoc()`
  (pure, returns the doc) and `generateWES()` (saves), so the layout can be rendered headlessly
- [x] Renders title, both instructions, per-entry bullets with bold labels, sub-bulleted
  accomplishments and duties, signature-over-printed-name block, "Attachment to CS Form No. 212"
  page footer, and paginates when entries overflow
- [x] Route `/applicant/wes`; sidebar entry after Personal Data Sheet; applicant dashboard quick-link
  card (grid widened to `sm:grid-cols-2 lg:grid-cols-4`)

### Verification
- PDF **rendered headlessly and visually inspected** against the source form
- API round-trip confirmed: `POST` → `GET` preserves all 7 fields, `version` increments
- Fixed during review: section headings printed a stray trailing colon (`"Summary of Actual Duties:"`)
  because `bulletField` always appended `": "` — now suppressed when there is no value

> **This note was wrong — corrected in Phase 18.** The seeded WES rows did use the retired
> PDS-Section-V shape, but the effect was **not** "open the form empty": `accomplishments` was
> undefined and the render called `.map()` on it, so the page crashed to a blank screen. Both the
> seed and the page were fixed in Phase 18.

---

## Phase 12: Application Status Trail — COMPLETED

Surfaces the existing audit log as a per-application timeline. `GET /applications/:id/history` and a
`HistoryTimeline` component already existed, but the timeline was only on the **applicant's** My
Applications page — HR and office admins, who actually drive the pipeline, had no trail.

- [x] `features/applications/ApplicationHistoryTimeline.tsx` — timeline plus its label maps
  (`actionLabel`, `actionToStatus`, `statusDotColor`, `formatStatus`) extracted out of
  `MyApplicationsPage` into one shared component (~130 duplicated lines removed)
- [x] **Status History** card on `ApplicationDetailPage`, directly under Application Information
- [x] Status mutation now invalidates `['application-history', id]` — without it a change wouldn't
  appear in the trail until a page reload
- [x] **Security fix**: `getApplicationHistory` only checked applicant ownership, so *any*
  authenticated admin could read *any* application's trail, including another LGU's. Now mirrors
  `getApplication` scoping (LGU for HR; LGU + department + not-SUBMITTED for office admins).
  Verified live: cross-LGU read went **200 → 403**

> The audit log **page** (`/admin/audit-logs`) is unchanged and remains in Administration only.
> An RSP shortcut to it was tried and reverted — Administration is its home.

---

## HR Shortlisting — COMPLETED

HR admins can now shortlist, not just office admins.

- [x] Server: removed the explicit `LGU_HR_ADMIN + SHORTLISTED → 403` block in
  `updateApplicationStatus`
- [x] Client: `STATUS_TRANSITIONS` (HR map) had **no `ENDORSED` entry at all**, so HR saw no action
  on an endorsed application — added `ENDORSED: ['SHORTLISTED', 'REJECTED']`
- [x] Office admin restrictions unchanged (own department, endorsed+, still limited to
  `SHORTLISTED`/`REJECTED`)
- [x] `ProcessFlow.md` Step 6 + role-permissions table updated

**Why:** only SHORTLISTED applicants can be assigned to an interview, so an office that hasn't
screened yet left applicants stranded with no way for HR to move them forward. Shortlisting was the
only office-exclusive right — HR could already reject.

---

## UI Refresh & Fixes

### Login page (`features/auth/LoginPage.tsx`)
- [x] Left panel changed from a solid `emerald-600→green-800` slab to a light
  `emerald-50 → white → teal-50` wash with green accents; all text/logo/dividers recoloured
- [x] `lg:border-r lg:border-emerald-100` added — both halves are light now, so the split needs it
- [x] The two module cards carry the tint: RSP emerald, L&D teal (gradient + icon chip + text)
- [x] **No hover effects on the module cards** — they are descriptive tiles, not controls

### Module launcher (`features/modules/ModuleLauncherPage.tsx`)
- [x] Same light wash + tinted RSP/L&D cards, via a `CARD_STYLES` map mirroring the login `pillars`
- [x] Locked cards switched from `opacity-60` to explicit **neutral grey** — dimming read as washed
  out on a light background; availability now reads as colour vs. no colour
- [x] LGU logo `rounded-2xl` → `rounded-full` (both the uploaded-logo and Shield-fallback branches)

> `CARD_STYLES` and the login page's `pillars` hold duplicate colour values kept in sync by hand.
> Lift into `lib/modules.ts` if they drift.

### Fixes
| Issue | Root cause | Fix |
|-------|-----------|-----|
| PDS requirement demanded a manual upload instead of auto-attaching | `isPdsRequirement` excluded any label containing "work experience" — but the CSC default label is *"Personal Data Sheet with Work Experience Sheet"*, so the guard fired on the very requirement it was meant to protect | Dropped the exclusion; a standalone WES label matches neither PDS keyword anyway |
| Interview scheduling returned a raw 400 | `handleCreate` validated position + date but never checked that an applicant was selected, so it posted `applicationIds: []` | Client-side guard + **Schedule** button disabled while nothing is selected, with a selected count on the label |
| Toasts appeared top-right and could not be dismissed | `<Toaster position="top-right" richColors />` | `position="bottom-right"` + `closeButton` (single mount in `App.tsx`, covers every toast) |
| Applicant landed on the dashboard after submitting | `ApplyPage` navigated to `/applicant/dashboard` | Navigates to `/applicant/applications`; the existing `invalidateQueries(['my-applications'])` fires first so the new row is present on arrival |

---

## Phase 13: Dynamic Comparative Assessment — COMPLETED

The assessment was 7 hardcoded `Decimal` columns. It is now a **user-defined factor template** with
grouped factors, per-group subtotals, and auto-adjusting totals — modelled on the CSC Comparative
Assessment Form workbook.

### The computation (taken from the reference workbook's formulas)
```
factor equivalent % = maxWeight x rating%       (G13 = $G$11 * 0%)
group subtotal      = sum of equivalents        (H14 = SUM(G13:I13))
group points        = subtotal x group points   (G15 = H14 * 40)
TOTAL               = sum of group points       (L15 = SUM(F15:K15))
```
One uniform rule covers everything: a single-factor group is the degenerate case where
`maxWeight = 1`, so **"subtotal on the header" falls out for any group with >1 factor** — no
special-casing. Lives in `server/src/config/assessmentDefaults.ts` (`computeAssessment`), mirrored
for live display only in `client/src/lib/assessment.ts`.

### Default template (CSC), 100 points
| Group | Points | Factors (max weight) |
|-------|-------:|----------------------|
| I | 25 | PERFORMANCE (1) |
| II — ETE | 40 | EDUCATION (0.35), Relevant TRAINING (0.30), Relevant EXPERIENCE (0.35) |
| III | 30 | PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL (1) |
| IV | 5 | OUTSTANDING ACCOMPLISHMENTS (1) |

### Database
- [x] `assessment_groups` — `code`, `label`, `points`, `sortOrder`. **`positionId` NULL = the LGU's
  reusable default; set = the snapshot frozen onto that position**
- [x] `assessment_factors` — `label`, `maxWeight`, cascade-deleted with the group
- [x] `assessment_scores` — the 7 fixed columns **dropped**; replaced by `factorScores Json`
  (`{ "<factorId>": ratingPercent }`). `totalScore` retained
- [x] `db push` + `prisma generate`

> **Why `totalScore` was kept:** Selection, ranking (`orderBy: { totalScore: 'desc' }`), and the
> qualify-gating all read it. Keeping it meant those paths needed **no changes at all**.

### Server
- [x] `config/assessmentDefaults.ts` — `DEFAULT_ASSESSMENT_TEMPLATE` + `computeAssessment`
- [x] `controllers/assessmentTemplate.controller.ts` — LGU template get/save, position template
  get/save. `GET` seeds (LGU) or snapshots (position) on first read
- [x] `saveAssessmentScore` rewritten — takes `factorScores`, ignores ids not on the position,
  rejects ratings outside 0–100, and **always computes the total server-side**
- [x] Routes under `/api/assessments/template/*`, registered **before** the score routes

### Client
- [x] `AssessmentPage` rebuilt — two-row grouped header (group code/label/points spanning its
  factors), per-factor percentage inputs, **subtotal column on multi-factor groups** showing both
  the subtotal and its points, live TOTAL, ranking by live total
- [x] `FactorEditor` — add/remove groups and factors, edit code/label/points/weights, with warnings
  when group points ≠ 100 or a group's weights ≠ 1
- [x] `ApplicationDetailPage` assessment grid now renders factors from the position's template
  instead of 7 hardcoded labels
- [x] Types: `AssessmentGroup`, `AssessmentFactor`; `AssessmentScore.factorScores`

#### Phase 13 refinements (post-review)
- [x] **Weights display as percentages** — `100%` / `35%` instead of `w 1` / `w 0.35`, and the
  editor field is now "Max weight %" taking `35` rather than `0.35`. Stored values are unchanged:
  `toPercent`/`fromPercent` convert at the UI boundary only, and the API still stores fractions.
  The per-group warning threshold moved from 1 to 100 accordingly
- [x] **Ranking settles on save, not on keystroke** — the table sorts by the *saved* total from
  `['assessments']`, so rows no longer jump under the cursor while typing. Saving invalidates the
  query, the refetch lands, and the order re-settles then (no extra state needed)
- [x] **"Save All & Rank" bar** — appears once anything is edited, shows the unsaved count, saves
  rows **sequentially** with a live `Saving n of N…` progress bar (parallel writes would make the
  counter jump), then re-ranks. Per-row save button retained for single corrections
- [x] **Score bar** in the TOTAL column (total ÷ template max points) and an amber "unsaved"
  marker on edited rows

### Key design decisions
| Decision | Rationale |
|----------|-----------|
| LGU default → **snapshot per position** | Editing the LGU template must not silently rescore assessments already in progress |
| Template edits **carry ratings over by factor label** | Replacing the tree mints new factor ids, which would orphan every rating. Matching on label keeps scores intact when adding/reordering factors |
| Total **always** computed server-side | The client never asserts a total, so a stale client template can't corrupt the ranking |
| Ratings are **percentages (0–100)**, not raw points | What the workbook does. Inverts the old data entry (HR used to type points like `14.50`) |

### Seed
- [x] `makeAssessment()` + `ensureAssessmentTemplate()` helpers; all 8 seeded assessments rewritten
  as percentage ratings keyed by factor label
- [x] `assessmentGroup.deleteMany()` added to the FK-safe cleanup order

### Verification (live)
| Check | Result |
|-------|--------|
| Seeded score (Pedro) | `89.41` = hand-computed `89.41` |
| New score via API | `66.4` = expected `66.4` |
| Add factor + rebalance weights | ids `19→25`, ratings carried by label, new factor 0, total `62.0` = expected |
| `maxWeight: 5` / `rating: 150` | 400 on both |
| Client typecheck + `vite build` | Clean |

> **Not verified:** the page itself hasn't been opened in a browser — the grouped header and the
> factor editor are UI-only surfaces that the API tests don't exercise.

> **Migration note:** old totals exceeded 100 (e.g. `102.50`), which the new template cannot
> produce. Any assessment data predating this phase is not comparable to post-phase totals.

---

## Phase 14: HRMPSB Signatories & Comparative Assessment PDF — COMPLETED

### 14A — HRMPSB Signatories module (Administration)
The signature block on the assessment form is LGU-level data reused by every generated form, so it
is managed in Administration rather than hardcoded in the PDF.

- [x] `psb_members` — `name`, `designation` (government post), `psbRole` (board role),
  `type`, `sortOrder`, `isActive`, scoped by `lguId`
- [x] `SignatoryType` enum: **`PSB_MEMBER`** (the board signature row) and **`PREPARED_BY`**
  (the "Prepared by:" block at the foot) — the form has these as two separate blocks
- [x] `sortOrder` fixes the left-to-right print order, so the Chairperson lands first
- [x] `psbMember.controller.ts` + `/api/psb-members` CRUD; super admins may target any LGU via
  `?lguId=`, everyone else is pinned to their own
- [x] Client `features/psb/PsbMemberPage.tsx` at `/admin/psb-members` — two tables (members /
  prepared by), quick-pick buttons for the four standard roles, LGU filter + selector for super
  admin, `isActive` to retire a member without deleting history
- [x] Sidebar: "HRMPSB Signatories" before Audit Logs (`module: 'ADMIN'`)

> **Route asymmetry (deliberate):** reads are open to any authenticated LGU admin, writes require
> `requireLguAdmin`. The assessment PDF needs the signatory block and generates from **RSP**, so
> gating reads behind Administration would have broken it.

**Verified live:** 6 signatories added (201 ×6, correct order/grouping); cross-LGU edit → 403;
office admin create → 403; empty name → 400.

### 14B — Comparative Assessment Form PDF
- [x] `lib/generateComparativeAssessment.ts` — landscape folio (936×612), laid out from the
  reference workbook. Split into `buildComparativeAssessmentDoc()` (pure) and
  `generateComparativeAssessment()` (saves), so the layout can be rendered headlessly
- [x] Header block: Position & SG, Level, Education, Experience, Training, Eligibility on the left;
  Item No, Monthly Rate, Date of Publication, Office on the right
- [x] Table: CANDIDATE/S · GENDER · ELIGIBILITY · grouped factor columns · TOTAL POINTS · REMARKS,
  with the group header spanning its factors and a Maximum Percentage Weight row
- [x] **Four rows per candidate**, mirroring the workbook: identity → Equivalent Percentage Weight
  → Total → Equivalent Points Score
- [x] **Subtotal is not a column** — it prints merged across the group's factor columns, as in the
  source (`H14 = SUM(G13:I13)` sits under the EDUCATION/TRAINING/EXPERIENCE span). Single-factor
  groups leave that row blank
- [x] Weight rows print as **percentages** (`35%`, `97.00%`, `94.75%`); points stay plain numbers
  (`24.25`, `95.25`). Two formatters: fixed 2dp for computed values so columns align, trimmed for
  max weights so `35%` doesn't read as `35.00%`
- [x] HRMPSB signature block (3 across) + "Prepared by:", both from the signatories module
- [x] **Export PDF** button on the assessment page — pulls signatories and each applicant's PDS
  (for gender + eligibility, which the assessment endpoint doesn't carry), exports in ranked order

#### Fixed during review
| Issue | Fix |
|-------|-----|
| Long eligibility text spilled past its cell border | `cell()` gained `maxLines` — clips by the caller's limit **and** by what physically fits, with an ellipsis; identity row heightened |

**Verified:** rendered headlessly against real seeded data and visually inspected across three
iterations. Arithmetic reads correctly off the page — Juan: `24.25 + 37.90 + 28.50 + 4.60 = 95.25`
with the ETE subtotal `94.75%` merged under its group.

#### Judgment calls worth revisiting
| Call | Note |
|------|------|
| **Level is derived**, not stored | SG ≥ 11 → "Second", below → "First". A heuristic — needs a real field if your LGU classifies differently |
| Export uses **on-screen** ratings | Includes unsaved edits. Could instead refuse to export while dirty, or export only saved values |
| Max weights print as `%` | Deviates from the workbook's literal `0.35`, for consistency with the UI |

### 14C — Interviews list
- [x] Actions column with an `Eye` view button (`/rsp/interviews/:id`), matching the Training list.
  `stopPropagation()` on the button — the row already navigates, so without it the click fires
  twice and back needs two presses. Loading/empty `colSpan` 5 → 6

### Seed
- [x] 7 Lapu-Lapu HRMPSB signatories (6 members + 1 prepared by); `psbMember.deleteMany()` added to
  the FK-safe cleanup order

> **Names are invented.** The designations are genuine city-level posts, but the names are
> placeholders — not actual serving Lapu-Lapu officials. Only Lapu-Lapu has signatories; the other
> three LGUs would print an empty signature block.

> **Not verified:** the Export button in a live browser, and multi-page behaviour when candidates
> overflow a page.

---

## Phase 15: HRMPSB Certification of Qualified Applicants — COMPLETED

**PSB Certification** button on each position card in Selection (`/rsp/selection`), generating the
board's certification PDF. Closes the Phase 5 deferred item "Generate Certificate of Qualified
Applicants".

### Layout (from the reference certification)
LGU seal + `Republic of the Philippines` / LGU name / `HUMAN RESOURCE MERIT PROMOTION & SELECTION
BOARD` → spaced `C E R T I F I C A T I O N` → the R.A. No. 7160 paragraph naming the **position**
and **item number in bold** → numbered applicants in rank order → `x – x – x – x – x` →
place-and-date line → signature block: chairperson centred, remaining members two-up.

### Client
- [x] `lib/generatePsbCertification.ts` — portrait letter (612×792), Times. Split into
  `buildPsbCertificationDoc()` (pure) and `generatePsbCertification()` (saves) for headless render
- [x] Ranking comes free: `/assessments/qualified` already sorts by `totalScore` desc
- [x] Signatories from the Phase 14 module; chairperson detected by `/chair/i` on `psbRole`, and
  `psbRole` is shortened at the comma (`Chairperson, HRMPSB` → `Chairperson`) to match the form
- [x] `absentIds` renders the `***ABSENT***` marker above a member — **supported by the generator
  but not yet exposed in the UI** (no picker; generates with everyone present)
- [x] Middle initials pulled from each applicant's PDS; failure is swallowed (cosmetic only)
- [x] `lib/imageToPng.ts` — fetches the LGU seal and returns a **PNG data URI**

### Two rules that are enforced twice, on purpose
| Rule | Where |
|------|-------|
| **Top 5 applicants only** | `MAX_CERTIFIED` in `SelectionPage` **and** `MAX_APPLICANTS` in the generator — the cap is a property of the document, so any future caller inherits it |
| Seal failure must not block the document | `fetchImageAsPngDataUrl` returns null on any error, **and** `addImage` is wrapped in try/catch |

### Why the logo needs converting
LGU logos are stored as **WebP** (Sharp, 200×200) and jsPDF's `addImage` supports PNG/JPEG only, so
passing the stored file directly fails. `imageToPng` draws it through a canvas — via an **object
URL** rather than a remote `<img>` src, which keeps the canvas untainted so `toDataURL()` doesn't
throw a security error.

### Fixed during review
| Issue | Fix |
|-------|-----|
| `Civil Engineer III , Item No.` — stray space before the comma | The paragraph mixes bold/normal mid-sentence, which `splitTextToSize` can't do, so it is composed word by word; a token beginning with punctuation now pulls back one space width |
| Seal overlapped the "H" of the board title | Logo reduced to 50pt at `MARGIN - 22` |

### Verification
- Rendered headlessly and visually inspected across three iterations
- **Top-5 cap proven**: 7 applicants in → 5 listed, correct order by score
- **Seal proven** with a synthetic PNG

> **Not verified:** no seeded LGU has a logo uploaded, so the real WebP → fetch → canvas → PNG path
> has never run in a browser. Upload a logo in LGU Management and generate once to confirm.
> The button itself is also unverified in a live browser.

### Placeholders worth revisiting
| Field | Current | Note |
|-------|---------|------|
| Place line | LGU name | The reference reads "Cebu Capitol, Cebu City" — a venue, probably belongs on the LGU record |
| Board date | blank (`________________`) | The date the board convened; not stored anywhere |
| Signature block overflow | members past the page are dropped | No pagination; fine at 6–7 members, breaks beyond that |

---

## Phase 16: Vacancy Guard & CSC Appointment Forms — COMPLETED

### 16A — Vacancy slot guard (bug fix)
Appointments could exceed a position's vacancy slots. Two independent causes:

| Cause | Detail |
|-------|--------|
| Client miscounted | `getSelectedCount` counted only `SELECTED`. **APPOINTED applicants weren't counted at all**, so a position with 2 slots and 1 already appointed still read as having room |
| Server never checked | `createAppointment` counted appointed applicants *after* inserting, purely to flip the position to FILLED. Nothing rejected an overfill |

- [x] Server: vacancy check **inside the `$transaction`** before insert — outside it, two concurrent
  requests could both pass and overfill. Throws `SLOTS_FULL` → 400 with an actionable message
- [x] Client: `getAppointedCount`, `slotsFilled` / `slotsRemaining` / `isPositionFull`. Header now
  reads `2 / 2` + "All slots filled"; the warning compares against *remaining* slots; the Appoint
  button is disabled with a tooltip when full
- [x] `selectApplicant` left unguarded on purpose — selecting alternates beyond the slots is
  legitimate; **appointment is the binding act**

**Verified live** (Cebu City, Administrative Officer V, 2 slots): appoint #2 → 201; select a third
→ 200; appoint the third → **400**; position auto-flipped to FILLED. Before the fix that last call
returned 201.

> **Pre-existing overfill remains**: Lapu-Lapu's Civil Engineer III has **3 appointments on 2
> slots**. The guard prevents new overfills but does not repair existing data, and there is no
> revoke-appointment endpoint.

### 16B — CS Form No. 1: Appointment Transmittal and Action Form
Built from appointments with status **COMPLETED** — which is precisely "requirements completed",
since an appointment only reaches COMPLETED when every final requirement is verified.

- [x] `lib/generateAppointmentTransmittal.ts` — landscape folio, 2 pages. Page 1: 17-column table
  with three-tier header (NAME OF THE APPOINTEE/S over Last/First/Ext/Middle; PUBLICATION over
  Date/Mode; CSC ACTION over four), **all 15 numbered rows incl. blanks**, HRMO certification,
  remarks box. Page 2: Checklist of Common Requirements (7 items) + both certifications
- [x] `lib/generateAppointmentTransmittalExcel.ts` — the same form as a workbook (ExcelJS +
  file-saver, matching the CSC Batch export convention). **Every blank cell is bordered and
  typeable** — the point of the Excel version is that much of this form is filled in by hand
- [x] Both formats share one data-assembly path in `AppointmentsPage`; the mutation takes a
  `'pdf' | 'excel'` argument
- [x] Server: `openDate`/`closeDate` added to the appointments `position` select (and to the
  `Appointment` client type) for the publication-period column
- [x] Names come from the **PDS** (surname, middle name, extension), falling back to the account name

#### Fixed during review
| Issue | Fix |
|-------|-----|
| Publication period printed `02/01/2026 to` — clipped | Column widened (borrowed from Position Title), row height 14 → 16, that column dropped to 4.8pt so the range wraps |
| Typecheck error "No constituent of type 'pdf' \| 'excel' is callable" | The mutation's `format` parameter **shadowed date-fns's `format`** used in the same closure — renamed to `fileFormat`. In plain JS this would have shipped as a runtime crash |

**Verified:** PDF rendered and visually inspected; the workbook was generated and **read back** —
2 sheets, data in the right cells, blank rows keeping their borders.

### 16C — CS Form No. 4: Certification of Assumption to Duty
- [x] `AssumptionToDutyTemplate` on the appointment detail page, following the page's existing
  pattern (hidden JSX template + `useRef` + shared `handlePrint`), so it inherits the same print CSS
- [x] Fills appointee name (PDS), position, office, effective date, and today's date across the
  "Done this __ day of ____ ____" blanks; signature lines and issue date left blank
- [x] Reproduces the footer routing block (201 file / Admin — CSC FO within 30 days / COA / CSC)

> **Judgment call:** "effective" uses the **appointment date**, not the oath date. Assumption to
> duty is legally the date the appointee reported, which is neither — but of the two we store, the
> appointment date is the closer proxy. The CSC's 30-day deadline is counted from it, so this
> arguably wants its own field.

### 16D — CS Form 33-A replaces CS Form 33-B
- [x] `AppointmentFormTemplate` rebuilt as **CS Form No. 33-A (Revised 2025), Regulated** — a
  letter-style appointment instrument, not the numbered table 33-B used
- [x] Stamp-of-receipt box, the italic form captions, compensation/status/nature-vice/Plantilla
  lines, Appointing Officer + Date of Signing, Authorized Official with DRY SEAL, **two
  certifications** (HRMO; Chairperson HRMPSB/Placement Committee), R.A. 7041 publication paragraph,
  CSC Notation, Acknowledgement, copy distribution, erasure warning
- [x] An `F` helper renders each value on a ruled line — **bold when known, blank and writable when
  not** — so the form prints usefully either way
- [x] Renamed across the app: button label, `ProcessFlowPage` step text, seed descriptions, and
  `DEFAULT_FINAL_REQUIREMENTS` (new appointments get "Appointment Form (CS Form No. 33-A)";
  existing rows keep their stored label)

> **Assumption carried over from 33-B:** employment status prints a hardcoded **"Permanent"**. The
> form offers *(Permanent, Temporary, etc.)*, so this is wrong for temporary or casual appointments
> — it wants to be a real field on the appointment.

### Data gaps these forms exposed
None of the following exist in the model, so they print blank for manual completion:
**Employment Status**, **Nature of Appointment** (Original/Promotion/Transfer…), the **vice** clause,
**Publication Mode**, **three-conspicuous-places posting dates**, **HRMPSB deliberation date**, and
every CSC Field Office column (Appointment Identification No., A/D, Date of Action, Date of Release).

> **Not verified:** none of the four form buttons has been clicked in a live browser; print-preview
> layout and Excel's own print pagination are unchecked. The transmittal prints only the first 15
> completed appointments with no pagination.

---

## Phase 17: Appointment Forms as Exact-Match PDFs — COMPLETED

The three appointment documents were printable HTML rendered through a print window. They are now
jsPDF generators reproducing the CSC forms' actual appearance.

- [x] `lib/generateAppointmentForms.ts` — `buildAppointmentFormDoc` (33-A), `buildOathOfOfficeDoc`
  (CS 32), `buildAssumptionToDutyDoc` (CS 4), each split from a `generate*` save wrapper so the
  layout can be rendered headlessly
- [x] Shared helpers: `ruled()` (value centred on the form's ruled line — **bold when known, blank
  and writable when not**), `boldCaption()`, `agencyHeader()`, `card()`, `greyPage()`
- [x] Page size **612 × 936pt = 8.5 × 13in** (folio), verified from the PDF MediaBox
- [x] The three HTML templates, their refs, and `handlePrint` were deleted — no dead code left to drift

### CS Form 33-A visual structure
The form is **a grey field inset from the page edge, with white bordered cards floating on it** —
not a white page with grey headers.

| Element | Detail |
|---------|--------|
| Grey field | `#A6A6A6`, inset `GREY_X = 30` / `GREY_Y = 22`, bordered; white page margin around it |
| Page 1 | "For Regulated Agencies" boxed above the field; main card (form no., stamp caption, ruled agency lines, appointment body with bold captions, signature block); separate **CSC ACTION:** card |
| Page 2 | Certification card (**requirements + publication paragraph + HRMO share one card**); HRMPSB Certification card; **CSC Notation grey block containing the white ruled write-in box *and* the erasure-warning card nested inside it**; copy distribution + Acknowledgement as **one white box split by a vertical divider** |

CS Form 32 and CS Form 4 stay plain white — their source documents contain **no fills at all**, so
shading them would move them away from the real forms.

### How the layout was established
The docx has **no tables** (`<w:tbl>` count = 0) — it is built from Word shapes, so `w:shd` shading
was empty and the fills live on the shapes. Extracting shape geometry revealed the `#A5A5A5` shape
is **577.9 × 867.9pt — the whole page**, which is what identified the grey-field-with-cards
structure. `qlmanage -t` renders a docx to PNG, but its output was unreliable here (overlapping
text); the user's screenshots settled the layout.

> **Lesson for future CSC forms:** render the source document to an image *first*. Two rounds of
> XML archaeology produced a layout that was structurally wrong; one screenshot corrected it.

### Fixed during review (each caught by rendering and looking)
| Issue | Fix |
|-------|-----|
| Plantilla Item No. printed `LLC-CE3-0` | Line was 62pt wide and `ruled()` keeps only the first wrapped line — silently truncating. Row rebalanced to 102pt at 10pt type |
| Publication blanks ran past the card border | Flowed text replaced with hand-placed segments, each bounded by the card's inner edge |
| Grey was full-bleed to the page edge | Inset to a bordered field with white margin; cards derive from it |
| Page-2 stack overflowed the grey field by 14pt | CSC Notation box 150 → 118pt, 7 rules → 6. Verified arithmetically: **stack ends 896pt, field bottom 914pt, 18pt clearance** |
| `Certified True Copy - for the Civil Service Commission` crossed the divider | Copy block dropped to 9pt |
| `setLineDashPattern` not in jsPDF's public types | Dashed DRY SEAL box → solid grey |

> **Known remaining:** on page 1, `with Plantilla Item No.` and the appointment-effect sentence
> nudge a few points past the card's right edge after the cards narrowed. Hand-positioned lines
> that still want reflowing.

> **Not verified:** the three buttons in a live browser. The generators are pure and were rendered
> headlessly across ~8 iterations, so risk is low.



---

## Phase 18: Lapu-Lapu-Only Seed, Logout Destination, WES Crash Fix — COMPLETED

### 18A — Seed reduced to a single LGU
- [x] Removed **Cebu City, Mandaue, Cebu Province** and Cebu City's entire pipeline;
  `seed.ts` 3,290 → ~2,460 lines
- [x] Lapu-Lapu keeps the full journey: applicant → application → endorse → shortlist → interview →
  assessment → qualify → select → appoint → final requirements, with the audit trail
- [x] Added **3 SUBMITTED applications** — the entry state was missing entirely, so the Applications
  screen had nothing awaiting HR review

**Result (verified live):** 1 LGU; 12 applications covering **every status**; 13 positions across 4
publications; 3 interviews, 4 assessments, 2 appointments, 7 signatories, 3 trainings, 86 audit logs.
`cebucityhr` / `mandauehr` / `cebuprovhr` all return **401**.

Trail depth scales with pipeline position — 2 entries at ENDORSED, 9 at APPOINTED (SUBMIT → ENDORSE
→ SHORTLIST → CREATE_INTERVIEW → COMPLETE_INTERVIEW → SAVE_ASSESSMENT_SCORE → QUALIFY → SELECT →
CREATE_APPOINTMENT), correctly attributed to applicant / office admin / HR.

> **Lost with the other LGUs:** the per-LGU module licensing demo (Mandaue was the RSP-only
> example) and the multi-LGU login demo. Both features still work — nothing seeded exercises them.

> **Two helpers had to be restored** after the cut: `applicantPassword` (defined in the Cebu
> Province block) and `makeAssessment`/`ensureAssessmentTemplate` (defined in the Cebu City
> pipeline). Neither is a compile error — both surfaced only at seed runtime.

### 18B — Sign-out returns to the LGU's branded login
An LGU user signing out landed on the generic `/` instead of `/{slug}/login`.

- [x] `logoutDestination(user, lastLguSlug)` in `lib/modules.ts`
- [x] **`lastLguSlug` persisted in the auth store** — set on `setAuth`, deliberately *not* cleared on
  logout, same as `moduleMemory`
- [x] Applied to all four paths: Header sign-out, launcher sign-out, axios session-expiry, and
  `ProtectedRoute`

> **The first attempt didn't work, and the reason matters.** `logout()` flips `isAuthenticated`,
> React re-renders, and **`ProtectedRoute` returns `<Navigate to="/" replace />` in the same tick**,
> overriding the caller's `navigate()`. `ProtectedRoute` — not the caller — decides where a
> signed-out user lands, and by then `user` is null. Hence the persisted slug.

Side benefit: opening a protected URL in a fresh tab now lands on the LGU's branded login too.

### 18C — WES page crashed on legacy data
- [x] `normaliseEntry()` in `WESFormPage` coerces any stored entry onto a complete empty entry and
  guarantees `accomplishments` is a non-empty array; `?? []` guards at both render sites
- [x] Seed rewritten to the current WES shape (old duty lists folded into `summaryOfDuties`)

> **Converting the seed took three attempts.** A naive `'([^']*)'` regex over the source split on
> the escaped apostrophes in `Mayor\'s Office` and `Provincial Treasurer\'s Office`, producing
> truncated strings and an unparseable file. Fixed by pulling the original text from
> `git show HEAD:` and re-parsing with `'((?:[^'\\]|\\.)*)'`, re-emitting as double-quoted
> literals. Naive quote-matching over source code breaks on real-world names.

### 18D — LGU logo rounded on the branded login
- [x] `rounded-2xl` → `rounded-full` on both the uploaded-logo `<img>` and the Shield fallback,
  matching the module launcher

---

## Phase 19: Production Deployment — COMPLETED (2026-07-21)

**Live at https://apps.cebu.gov.ph/llcprime.** Full runbook + as-built record in
`_Claude_To_Read/Deployment.md`; deploy artifacts in `deploy/`.

- [x] Sub-path support driven by `VITE_BASE_PATH` (Vite base, router basename, axios baseURL,
  `lib/basePath.ts` for `/uploads` assets + real anchors) — local dev unchanged at `/`
- [x] Server: `trust proxy`; env-driven `COOKIE_PATH=/llcprime` + `COOKIE_SECURE`
- [x] Deployed on shared Ubuntu 25.04 box (Apache 2.4.63, MySQL 8.4) alongside two **live** PHP
  apps (`/access` CodeIgniter, `/prime` Laravel) — fully isolated: own dir, `/llcprime` URL,
  `llcprime` DB, port 5010, additive `conf-available/llcprime.conf` (no edit to live vhosts)
- [x] First Node-runtime app on the box — installed Node 20.18.1 (distro); `systemd` service
  `llcprime-api` as `www-data`
- [x] HTTPS via the existing Let's Encrypt cert; secure cookies working

### Fixes surfaced by the real build/deploy (committed)
- **`suggestion-input.tsx` ref types** — `tsc -b && vite build` (the real script) aborted on two
  read-only-ref errors that `vite build` alone had hidden. **Lesson: build with `npm run build`.**
- `*.tsbuildinfo` untracked + gitignored (a `tsc -b` artifact broke `git pull`)
- systemd unit drops `EnvironmentFile` (dotenv parses the quoted `DATABASE_URL`)
- Discovery lesson: `grep -R` (not `-r`) for `sites-enabled` symlinks — `-r` first hid the HTTPS vhost

### Open items
- **`brylle` access not locked down** — user is in `sudo` **and** `www-data`; with sudo, file perms
  are deterrence only, not isolation. Deferred (operator changed brylle's password). See Deployment.md.
- Redeploy runs as root → re-apply `.env`/`uploads` perms after `git pull`.
- Deployed from branch `feat/rsp-appointment-forms-and-single-lgu-seed`; merge to `main` when ready.

