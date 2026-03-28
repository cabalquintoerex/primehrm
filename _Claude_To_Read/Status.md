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
| Role | Username | Password | LGU |
|------|----------|----------|-----|
| Super Admin | superadmin | admin123 | — |
| HR Admin | lapulapuhr | hradmin123 | Lapu-Lapu |
| HR Admin | cebucityhr | hradmin123 | Cebu City |
| HR Admin | mandauehr | hradmin123 | Mandaue |
| HR Admin | cebuprovhr | hradmin123 | Cebu Province |
| Office Admin | lapulapueng | office123 | Lapu-Lapu |
| Office Admin | cebucityeng | office123 | Cebu City (Engineering) |
| Office Admin | cebucityhealth | office123 | Cebu City (Health) |
| Office Admin | cebucitytreasury | office123 | Cebu City (Treasury) |
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
- http://localhost:5000/api/health — Server health check

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
- [x] Routes: /admin/applications (list) and /admin/applications/:id (detail)

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

---

## Phase 5: RSP — Interview & Assessment — COMPLETED

- [x] Interview scheduling — HR creates interview schedules with date, venue, notes
- [x] Applicant assignment — select shortlisted/for-interview applicants to assign to interview
- [x] Auto status update — assigned applicants automatically set to FOR_INTERVIEW
- [x] Interview completion — mark attendance per applicant, auto-update attended to INTERVIEWED
- [x] Per-applicant "No Show" action on interview detail (mark before completing)
- [x] Interview cancellation
- [x] Prominent "Encode Assessment Scores" card shown after interview completion
- [x] Comparative assessment scoring — 7 criteria (Education, Training, Experience, Performance, Psychosocial, Potential, Interview)
- [x] Auto-computed total score and ranking by total desc
- [x] Qualify applicants — bulk action to mark INTERVIEWED → QUALIFIED (requires assessment score)
- [x] Cache invalidation — interview mutations (complete, cancel, no-show) invalidate applications query
- [x] Database models: InterviewSchedule, InterviewScheduleApplicant, AssessmentScore
- [x] Sidebar nav: "Interviews" for SUPER_ADMIN, LGU_HR_ADMIN
- [x] Routes: /admin/interviews, /admin/interviews/:id, /admin/assessments/:positionId
- [ ] Email notifications (Nodemailer) — deferred
- [ ] Generate Certificate of Qualified Applicants (PDF) — deferred

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
- [x] Route: /admin/selection

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
- [x] Generate Appointment Form (CS Form 33-B) — printable HTML with LGU header, appointee details, position info, salary, signatures
- [x] Generate Oath of Office (CS Form 32) — printable HTML with oath text, affiant signature, administering officer
- [x] Final requirements management — add custom requirements, delete unverified ones
- [x] Verify/unverify individual requirements with verifier tracking and timestamp
- [x] Progress bar showing verification completion
- [x] Auto-complete appointment when all requirements are verified
- [x] Auto-revert appointment to PENDING when a requirement is unverified
- [x] Edit appointment/oath dates
- [x] Sidebar nav: "Appointments" with FileCheck icon for SUPER_ADMIN, LGU_HR_ADMIN
- [x] Routes: /admin/appointments (list) and /admin/appointments/:id (detail)
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
- [x] TrainingPage (/admin/training) — list with stats cards (Total, Upcoming, Ongoing, Completed), search, status/type filters, paginated table, create/edit dialog with SuggestionInput quick-fill, delete confirmation
- [x] TrainingDetailPage (/admin/training/:id) — training info card, participants table (Name, Department, Attended, Completed), add participants form dialog (multi-row with first name, last name, department dropdown), attendance marking, complete/cancel actions
- [x] Sidebar nav: "Training" with GraduationCap icon after Appointments (SUPER_ADMIN, LGU_HR_ADMIN)
- [x] App.tsx routes: /admin/training and /admin/training/:id
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
- [x] Routes: /admin/csc-batches and /admin/csc-batches/:id

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
- [x] Routes: /admin/process-flow and /applicant/process-flow (all logged-in users)
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
- [x] Route: /admin/reports
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

## Upcoming Work (To Do)

### Appointment Document Annexes
- [ ] ANNEX A — DBM-CSC Form No. 1, Position Description Form (Revised 2017) — Fillable
- [ ] ANNEX B — SS Porma Blg. 32, Narebisa 2025 — Panunumpa sa Katungkulan — Generate
- [ ] ANNEX C — CS Form No. 33-A, Revised 2025 — Appointment Form (Regulated) — Generate
- [ ] ANNEX I — CS Form No. 1, Revised 2025 — Appointment Transmittal and Action Form — Generate
- [ ] ANNEX L — CS Form No. 4, Revised 2025 — Certification of Assumption to Duty — Generate

### L&D Module Overhaul
- [ ] Module switcher after login (RSP / L&D) + toggle in sidebar/header
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
