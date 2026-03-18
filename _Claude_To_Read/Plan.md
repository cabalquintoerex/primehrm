# LGU PRIME-HRM — Implementation Plan

## Project Overview
The Civil Service Commission's Program to Institutionalize Meritocracy and Excellence in Human Resource Management (PRIME-HRM) — built as a multi-tenant web application serving multiple Local Government Units (LGUs).

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (UI components)
- TanStack Query (server state / data fetching)
- Zustand (client state — auth)
- React Hook Form + Zod (forms & validation)
- React Router v6 (routing)
- Sonner (toast notifications)
- date-fns (date utilities)
- Recharts (reports / charts)

### Backend
- Node.js + Express.js + TypeScript
- Prisma ORM
- MySQL 8.x
- JWT (jsonwebtoken) + bcrypt (authentication)
- Zod (server-side validation)
- Nodemailer (email notifications)

### Infrastructure
- Frontend dev: http://localhost:3000
- Backend dev: http://localhost:5000
- Vite proxy → Express API

---

## User Roles

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | Manages all LGUs, sets up LGU slugs, branding, and admin accounts |
| `LGU_HR_ADMIN` | Full HR management for their LGU — positions, applications, interviews, appointments, trainings |
| `LGU_OFFICE_ADMIN` | Department-level — screens forwarded applicants, shortlists candidates, assigns dept trainings |
| `APPLICANT` | Public user — can register, apply to any LGU's open positions |

---

## URL Structure

| URL | Purpose | Access |
|-----|---------|--------|
| `/super-admin/*` | Super admin dashboard & LGU management | SUPER_ADMIN |
| `/:lgu-slug/login` | LGU-specific login page with branding (logo, name) | Public |
| `/:lgu-slug/careers` | Public job listings for an LGU | Public |
| `/:lgu-slug/careers/:id` | Position detail + apply | Public |
| `/:lgu-slug/admin/*` | LGU admin dashboard (HR & Office) | LGU_HR_ADMIN, LGU_OFFICE_ADMIN |
| `/apply/register` | Applicant registration | Public |
| `/apply/login` | Applicant login | Public |
| `/apply/dashboard` | Applicant dashboard — track applications | APPLICANT |

---

## Project Structure

```
primehrm/
├── client/                        # React Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar, Header, MainLayout, MobileNav
│   │   │   ├── forms/             # Reusable form components
│   │   │   └── ui/                # shadcn/ui components
│   │   ├── features/
│   │   │   ├── auth/              # Login pages, ProtectedRoute, auth hooks
│   │   │   ├── dashboard/         # Role-based dashboards
│   │   │   ├── lgu/               # LGU management (super admin)
│   │   │   ├── departments/       # Department management
│   │   │   ├── positions/         # Job posting CRUD
│   │   │   ├── careers/           # Public careers portal
│   │   │   ├── applications/      # Application management (HR side)
│   │   │   ├── apply/             # Application flow (applicant side)
│   │   │   ├── pds/               # Personal Data Sheet form
│   │   │   ├── screening/         # Shortlisting & endorsement
│   │   │   ├── assessment/        # Comparative assessment scoring
│   │   │   ├── appointment/       # Appointment & oath generation
│   │   │   ├── training/          # L&D module
│   │   │   ├── users/             # User management
│   │   │   └── reports/           # Reports & analytics
│   │   ├── hooks/                 # Custom hooks
│   │   ├── lib/                   # Utilities, error handling
│   │   ├── services/              # API client (axios), interceptors
│   │   ├── stores/                # Zustand stores (auth)
│   │   └── types/                 # Shared TypeScript types
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── server/                        # Express Backend
│   ├── src/
│   │   ├── config/                # Database config, constants
│   │   ├── controllers/           # Route handlers
│   │   ├── middleware/            # Auth, roles, validation, error handling
│   │   ├── routes/                # API route definitions
│   │   ├── services/              # Business logic layer
│   │   └── utils/                 # Audit logging, helpers
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Demo data seeder
│   ├── .env
│   └── package.json
│
├── _Claude_To_Read/
│   ├── Instruction.md
│   ├── Plan.md                    # ← This file
│   └── ReferenceFolder/
└── .gitignore
```

---

## Database Schema

### Core Tables

#### lgus
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | Auto-increment |
| name | VARCHAR | LGU name |
| slug | VARCHAR UNIQUE | URL slug (e.g., `cebu-city`) |
| logo | VARCHAR NULL | Logo file path/URL |
| address | VARCHAR NULL | |
| contact_number | VARCHAR NULL | |
| email | VARCHAR NULL | |
| is_active | BOOLEAN | Default true |
| created_at | DATETIME | |
| updated_at | DATETIME | |

#### users
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| email | VARCHAR UNIQUE | |
| username | VARCHAR UNIQUE | |
| password | VARCHAR | bcrypt hashed |
| first_name | VARCHAR | |
| last_name | VARCHAR | |
| role | ENUM | SUPER_ADMIN, LGU_HR_ADMIN, LGU_OFFICE_ADMIN, APPLICANT |
| is_active | BOOLEAN | |
| lgu_id | FK NULL | NULL for super admin & applicants |
| department_id | FK NULL | For office admins |

#### departments
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| code | VARCHAR NULL | Short code |
| lgu_id | FK | |
| is_active | BOOLEAN | |
| UNIQUE | (lgu_id, name) | |

### RSP Module Tables

#### positions
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| title | VARCHAR | Position title |
| item_number | VARCHAR NULL | Plantilla item number |
| salary_grade | INT NULL | |
| monthly_salary | DECIMAL(12,2) NULL | |
| education | TEXT NULL | Education requirements |
| training | TEXT NULL | Training requirements |
| experience | TEXT NULL | Experience requirements |
| eligibility | TEXT NULL | Civil service eligibility |
| competency | TEXT NULL | Required competencies |
| place_of_assignment | VARCHAR NULL | |
| description | TEXT NULL | Full job description |
| requirements | JSON NULL | Required document attachments config |
| status | ENUM | DRAFT, OPEN, CLOSED, FILLED |
| open_date | DATETIME NULL | When posting opens |
| close_date | DATETIME NULL | When posting closes |
| slots | INT | Number of vacancies (default 1) |
| lgu_id | FK | |
| department_id | FK NULL | |
| created_by | FK NULL | |

#### position_document_requirements
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| position_id | FK | |
| label | VARCHAR | e.g., "Letter of Intent", "Transcript of Records" |
| description | TEXT NULL | Instructions for the applicant |
| is_required | BOOLEAN | Default true |
| sort_order | INT | Display order |
| created_at | DATETIME | |

#### applications
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| position_id | FK | |
| applicant_id | FK | → users (role=APPLICANT) |
| status | ENUM | SUBMITTED, UNDER_REVIEW, ENDORSED, SHORTLISTED, FOR_INTERVIEW, INTERVIEWED, QUALIFIED, SELECTED, APPOINTED, REJECTED, WITHDRAWN |
| submitted_at | DATETIME | |
| notes | TEXT NULL | HR notes |

#### personal_data_sheets
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK | → users (applicant) |
| data | JSON | Full PDS form data (CS Form 212) |
| version | INT | Allow updates |

#### work_experience_sheets
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK | |
| data | JSON | WES form data (CS Form 212) |
| version | INT | |

#### application_documents
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| application_id | FK | |
| requirement_id | FK | → position_document_requirements |
| file_name | VARCHAR | Original filename |
| file_path | VARCHAR | Server storage path |
| file_size | INT | In bytes |
| mime_type | VARCHAR | PDF, image, etc. |
| uploaded_at | DATETIME | |

#### endorsements
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| application_id | FK | |
| from_user_id | FK | HR admin who endorsed |
| to_department_id | FK | Target department |
| notes | TEXT NULL | |
| endorsed_at | DATETIME | |

#### shortlists
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| application_id | FK | |
| position_id | FK | |
| shortlisted_by | FK | Office admin |
| notes | TEXT NULL | |
| created_at | DATETIME | |

#### interview_schedules
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| position_id | FK | |
| schedule_date | DATETIME | Interview date/time |
| venue | VARCHAR NULL | |
| notes | TEXT NULL | |
| status | ENUM | SCHEDULED, COMPLETED, CANCELLED |
| created_by | FK | HR admin |

#### interview_schedule_applicants
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| interview_schedule_id | FK | |
| application_id | FK | |
| notified | BOOLEAN | Email sent? |
| attended | BOOLEAN NULL | |

#### assessment_scores
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| application_id | FK | |
| position_id | FK | |
| education_score | DECIMAL(5,2) NULL | |
| training_score | DECIMAL(5,2) NULL | |
| experience_score | DECIMAL(5,2) NULL | |
| performance_score | DECIMAL(5,2) NULL | |
| psychosocial_score | DECIMAL(5,2) NULL | |
| potential_score | DECIMAL(5,2) NULL | |
| interview_score | DECIMAL(5,2) NULL | |
| total_score | DECIMAL(5,2) NULL | Computed |
| remarks | TEXT NULL | |
| scored_by | FK | |

#### appointments
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| application_id | FK | |
| position_id | FK | |
| appointment_date | DATETIME | |
| oath_date | DATETIME NULL | |
| status | ENUM | PENDING, COMPLETED |
| created_by | FK | |

#### final_requirements
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| appointment_id | FK | |
| requirement_name | VARCHAR | |
| description | TEXT NULL | |
| is_submitted | BOOLEAN | Default false |
| is_verified | BOOLEAN | Default false |
| verified_by | FK NULL | |
| verified_at | DATETIME NULL | |
| file_path | VARCHAR NULL | |

### L&D Module Tables

#### trainings
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| title | VARCHAR | |
| description | TEXT NULL | |
| type | ENUM | INTERNAL, EXTERNAL, ONLINE |
| start_date | DATETIME | |
| end_date | DATETIME | |
| venue | VARCHAR NULL | |
| provider | VARCHAR NULL | Training provider |
| max_participants | INT NULL | |
| status | ENUM | PLANNED, ONGOING, COMPLETED, CANCELLED |
| lgu_id | FK | |
| department_id | FK NULL | NULL = LGU-wide |
| created_by | FK | |

#### training_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| training_id | FK | |
| user_id | FK | Employee assigned |
| assigned_by | FK | |
| status | ENUM | ASSIGNED, CONFIRMED, COMPLETED, EXCUSED |
| assigned_at | DATETIME | |

#### training_reports
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| training_assignment_id | FK | |
| report_text | TEXT NULL | |
| attendance_status | ENUM | PRESENT, ABSENT, LATE |
| file_path | VARCHAR NULL | Uploaded report file |
| submitted_at | DATETIME | |

### System Tables

#### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| user_id | FK NULL | |
| action | VARCHAR | CREATE, UPDATE, DELETE, LOGIN, LOGOUT |
| entity | VARCHAR | Table/resource name |
| entity_id | INT NULL | |
| old_values | JSON NULL | |
| new_values | JSON NULL | |
| ip_address | VARCHAR NULL | |
| created_at | DATETIME | Indexed |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | Login (email or username) | Public |
| POST | `/api/auth/logout` | Logout | Authenticated |
| POST | `/api/auth/refresh` | Refresh JWT token | Public (cookie) |
| GET | `/api/auth/me` | Get current user profile | Authenticated |
| POST | `/api/auth/register` | Applicant registration | Public |

### LGU Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/lgus` | List all LGUs (paginated) | Authenticated |
| GET | `/api/lgus/:id` | Get LGU details | Authenticated |
| GET | `/api/lgus/slug/:slug` | Get LGU by slug (for branding) | Public |
| POST | `/api/lgus` | Create LGU | SUPER_ADMIN |
| PUT | `/api/lgus/:id` | Update LGU | SUPER_ADMIN |
| DELETE | `/api/lgus/:id` | Delete LGU | SUPER_ADMIN |

### Departments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/departments` | List departments | LGU Admins |
| POST | `/api/departments` | Create department | LGU_HR_ADMIN |
| PUT | `/api/departments/:id` | Update department | LGU_HR_ADMIN |
| DELETE | `/api/departments/:id` | Delete department | LGU_HR_ADMIN |

### Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | List users (scoped by LGU) | LGU Admins |
| POST | `/api/users` | Create user | LGU_HR_ADMIN |
| PUT | `/api/users/:id` | Update user | LGU_HR_ADMIN |
| DELETE | `/api/users/:id` | Delete user | LGU_HR_ADMIN |

### Positions (Phase 2)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/positions` | List positions (admin) | LGU Admins |
| GET | `/api/positions/:id` | Get position detail | LGU Admins |
| POST | `/api/positions` | Create position | LGU_HR_ADMIN |
| PUT | `/api/positions/:id` | Update position | LGU_HR_ADMIN |
| DELETE | `/api/positions/:id` | Delete position | LGU_HR_ADMIN |
| GET | `/api/public/:slug/careers` | Public job listings | Public |
| GET | `/api/public/:slug/careers/:id` | Public position detail | Public |

### Applications (Phase 3–4)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/applications` | Submit application | APPLICANT |
| GET | `/api/applications` | List applications (admin) | LGU Admins |
| GET | `/api/applications/my` | My applications (applicant) | APPLICANT |
| GET | `/api/applications/:id` | Application detail | Authenticated |
| PUT | `/api/applications/:id/status` | Update status | LGU_HR_ADMIN |
| POST | `/api/applications/:id/endorse` | Endorse to department | LGU_HR_ADMIN |
| POST | `/api/applications/:id/shortlist` | Shortlist applicant | LGU_OFFICE_ADMIN |
| POST | `/api/applications/:id/documents` | Upload documents | APPLICANT |

### PDS & WES (Phase 3)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pds` | Get my PDS | APPLICANT |
| POST | `/api/pds` | Save/update PDS | APPLICANT |
| GET | `/api/wes` | Get my WES | APPLICANT |
| POST | `/api/wes` | Save/update WES | APPLICANT |

### Interview & Assessment (Phase 5)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/interviews` | Schedule interview | LGU_HR_ADMIN |
| PUT | `/api/interviews/:id` | Update schedule | LGU_HR_ADMIN |
| PUT | `/api/interviews/:id/complete` | Mark completed | LGU_HR_ADMIN |
| POST | `/api/assessments` | Input scores | LGU_HR_ADMIN |
| GET | `/api/assessments/position/:id` | Scores for position | LGU_HR_ADMIN |
| GET | `/api/certificates/position/:id` | Generate certificate | LGU_HR_ADMIN |

### Appointment (Phase 6)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/appointments` | Create appointment | LGU_HR_ADMIN |
| GET | `/api/appointments/:id/form` | Generate appointment form | LGU_HR_ADMIN |
| GET | `/api/appointments/:id/oath` | Generate oath of office | LGU_HR_ADMIN |
| POST | `/api/final-requirements/:appointmentId` | Set requirements | LGU_HR_ADMIN |
| PUT | `/api/final-requirements/:id/verify` | Verify requirement | LGU_HR_ADMIN |

### Training / L&D (Phase 7)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/trainings` | List trainings | LGU Admins |
| POST | `/api/trainings` | Create training | LGU_HR_ADMIN, LGU_OFFICE_ADMIN |
| PUT | `/api/trainings/:id` | Update training | Creator |
| DELETE | `/api/trainings/:id` | Delete training | Creator |
| POST | `/api/trainings/:id/assign` | Assign employees | LGU Admins |
| POST | `/api/trainings/:id/report` | Submit report | Assigned employee |
| GET | `/api/trainings/:id/monitoring` | Training monitoring | LGU Admins |

### Reports (Phase 8)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/reports/dashboard` | Dashboard stats | LGU Admins |
| GET | `/api/reports/positions` | Position reports | LGU_HR_ADMIN |
| GET | `/api/reports/applications` | Application reports | LGU_HR_ADMIN |
| GET | `/api/reports/trainings` | Training reports | LGU Admins |

### Audit Logs
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/audit-logs` | List audit logs | SUPER_ADMIN, LGU_HR_ADMIN |

---

## Implementation Phases

### Phase 1: Foundation & Core Setup
**Goal**: Project scaffolding, authentication, LGU management, base layout

- [ ] Project setup — Vite (client) + Express (server) + Prisma + MySQL
- [ ] Database schema creation & migrations (core tables: lgus, users, departments, audit_logs)
- [ ] Authentication system — JWT login/logout/refresh, bcrypt password hashing
- [ ] Role-based middleware (authenticate, requireRole, requireSuperAdmin, requireLguAdmin)
- [ ] Super Admin dashboard — LGU CRUD (create, list, edit, delete LGUs)
- [ ] Department management CRUD
- [ ] User management CRUD (scoped by LGU for non-super admins)
- [ ] Main layout — Sidebar, Header, responsive design
- [ ] LGU-branded login page (fetch LGU by slug, display logo & name)
- [ ] Seed data — super admin account, sample LGU, sample departments, sample users
- [ ] Health check endpoint
- [ ] Audit logging utility

**Demo Accounts**:
| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | admin123 |
| HR Admin | cebucityhr | hradmin123 |
| Office Admin | cebucityeng | office123 |

### Phase 2: RSP — Job Posting & Public Careers Portal
**Goal**: HR can post positions, public can browse them

- [ ] Position CRUD for HR admin (title, salary grade, requirements, attachments config)
- [ ] Position status workflow (DRAFT → OPEN → CLOSED → FILLED)
- [ ] Public careers page at `/:lgu-slug/careers`
- [ ] Position detail page with full requirements
- [ ] Applicant registration & login
- [ ] Search & filter on careers page

### Phase 3: RSP — Application Process
**Goal**: Applicants can apply online with PDS, WES, and document uploads

#### Position Document Requirements (HR Admin)
- [x] Default document requirements auto-populated when creating a position (HR can remove/add):
  1. Letter of Intent (addressed to appropriate director, indicating Position Title and Plantilla Item No.)
  2. Fully accomplished PDS with Work Experience Sheet and recent photo (CS Form No. 212, Revised 2025) — single PDF
  3. Performance rating in the last rating period (if applicable)
  4. Certificate of Eligibility/Rating/License
  5. Transcript of Records
  6. Training Certificates — all in a single PDF (for positions with training requirements)
  7. Designation Orders (if applicable)
- [x] HR can add custom document requirements per position
- [x] Each requirement has: label, description/instructions, required (yes/no)
- [x] Document requirements stored in `position_document_requirements` table

#### Application Flow (Applicant)
- [x] "Apply Now" button on position detail page
- [x] Check if applicant is logged in:
  - **Yes** → Proceed to application form
  - **No** → Prompt: "Do you already have an account?" → Yes: login (redirect back) / No: register + fill PDS
- [x] First-time applicant: register → fill PDS (CS Form 212) → save profile
- [x] Returning applicant: PDS already on file (editable)
- [x] Application form: upload documents per position requirements set by HR
- [x] Submit application (ties applicant profile + documents to the position)
- [x] PDS auto-detection: PDS requirement auto-fulfilled when applicant has PDS on file

#### PDS & Work Experience
- [x] Online PDS form (CS Form 212 — multi-step wizard), filled once and stored in applicant profile
- [x] Sections: Personal Info, Family Background, Educational Background, Civil Service Eligibility, Work Experience, Voluntary Work, Learning & Development, Other Information (skills, recognitions, references)
- [x] PDS form UX: numeric-only ID fields, salary formatting, tab order fixes
- [ ] Work Experience Sheet form (CS Form 212 WES) — deferred (applicants upload manually if required by HR)
- [x] PDS reusable across multiple applications, editable anytime

#### Applicant Dashboard
- [x] View submitted applications with status tracking
- [x] View/edit PDS profile
- [ ] Upload additional documents if requested — deferred to Phase 4

#### File Storage
- [x] Multer for file uploads (PDF, images), organized per applicant
- [x] File size limits and type validation (5MB, PDF/JPEG/PNG)
- [x] Uploads directory with static serving

### Phase 4: RSP — HR Application Management
**Goal**: HR can manage, endorse, and forward applications

- [x] Applications list with filters (search by name, filter by position/status)
- [x] Status summary cards with counts per status
- [x] Application detail view (PDS collapsible sections, uploaded documents with download)
- [x] Status workflow transitions with confirm dialog + optional notes
- [x] Endorse endpoint (PUT /:id/endorse) — HR only
- [x] Shortlist endpoint (PUT /:id/shortlist) — HR + Office admin
- [x] Application stats endpoint (GET /stats) — counts by status
- [x] Office admin screening view — scoped to their department, endorsed+ only
- [x] Office admin shortlisting
- [x] HR finalize shortlist — HR can advance through all status stages
- [x] Application status tracking with audit logging

### Phase 5: RSP — Interview & Assessment
**Goal**: Schedule interviews, score applicants, generate certificates

- [x] Interview scheduling (date, venue, notes) with applicant assignment
- [x] Auto status update (SHORTLISTED → FOR_INTERVIEW on assignment)
- [x] Mark interview as completed with attendance tracking
- [x] Interview cancellation
- [x] Comparative assessment form — 7 criteria scoring (Education, Training, Experience, Performance, Psychosocial, Potential, Interview)
- [x] Auto-compute total scores & ranking (sorted by total desc)
- [x] Qualify applicants (bulk INTERVIEWED → QUALIFIED)
- [x] Head of agency selection (bulk QUALIFIED → SELECTED)
- [ ] Email notifications to shortlisted applicants (Nodemailer) — deferred
- [ ] Generate Certificate of Qualified Applicants (PDF) — deferred

### Phase 6: RSP — Appointment & Onboarding
**Goal**: Generate appointment documents, manage final requirements

- [ ] Generate Appointment Form (CS Form 33-B)
- [ ] Generate Oath of Office (CS Form 32)
- [ ] Set final requirements for accepted applicants
- [ ] Email final requirements to accepted applicants
- [ ] Applicant uploads final requirement documents
- [ ] HR verifies & marks requirements as complete
- [ ] Position reports (filled, open, pipeline)

### Phase 7: Learning & Development
**Goal**: Training management, assignment, and monitoring

- [ ] Training CRUD (HR-managed and department-managed)
- [ ] Training types (internal, external, online)
- [ ] Department assigns trainings to employees
- [ ] Training scheduling & calendar view
- [ ] Training monitoring dashboard
- [ ] Employees submit post-training reports & attendance
- [ ] Training completion tracking

### Phase 8: Polish, Reports & Optimization
**Goal**: Dashboards, analytics, performance, mobile responsiveness

- [ ] Admin dashboard — stats cards, charts (positions, applications, trainings)
- [ ] Position reports with charts
- [ ] Application pipeline reports
- [ ] Training reports
- [ ] Audit log viewer with filters
- [ ] Mobile responsiveness (sidebar collapse, mobile nav)
- [ ] Lazy loading routes (React.lazy + Suspense)
- [ ] Server-side pagination across all list endpoints
- [ ] Search debouncing (500ms)
- [ ] Loading states & error boundaries

---

## UI/UX Guidelines (Matching Ambulance Tracker)

- **Color theme**: Green primary (#16a34a) — Tailwind green-600
- **Component library**: shadcn/ui (Button, Input, Dialog, Table, Card, Select, etc.)
- **Layout**: Sidebar navigation (collapsible) + top header with user info
- **Tables**: Server-side paginated with search, filters, and sort
- **Forms**: Dialog-based for CRUD operations (create/edit in modal)
- **Notifications**: Sonner toast for success/error messages
- **Typography**: Clean, minimal, monospace-free
- **Responsive**: Mobile-first with sidebar → hamburger menu on small screens
- **Loading**: Skeleton loaders for data fetching

---

## Security Considerations

- JWT tokens in HTTP-only cookies (not localStorage)
- bcrypt password hashing (12 salt rounds)
- Role-based access control at middleware level
- Input validation with Zod (client + server)
- LGU-scoped data access (users can only see their LGU's data)
- Audit logging for all mutations
- File upload validation (type, size limits)
- CORS restricted to frontend origin
- Helmet.js security headers

---

## Demo Data (Seed)

- 1 Super Admin account
- 1 Sample LGU (City of Cebu) with logo
- 5 Sample departments
- 1 HR Admin account
- 1 Office Admin account
- Sample positions (Phase 2)
- Sample applicant with PDS (Phase 3)
