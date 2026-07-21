# Seed Data Reference — `server/prisma/seed.ts`

Quick reference for the seed data structure. Use this when adding new seed data to avoid re-reading the full seed file.

---

## Cleanup Order (FK-safe deletion)

```typescript
trainingParticipant → training → finalRequirement → appointment →
assessmentScore → interviewScheduleApplicant → interviewSchedule →
applicationDocument → application → personalDataSheet → workExperienceSheet →
assessmentGroup (factors cascade) →
positionDocumentRequirement → position → positionCatalogRequirement → positionCatalog →
publication → auditLog → user → department → lgu
```

> **WES shape (fixed in Phase 18):** seeded `workExperienceSheet` rows now use the current shape —
> `{ entries: [{ duration, position, officeUnit, immediateSupervisor, agencyAndLocation,
> accomplishments[], summaryOfDuties }] }`. They previously carried the retired PDS-Section-V shape,
> which **crashed** the WES page (`accomplishments` was undefined and the render called `.map()` on
> it). The page now normalises whatever it loads, so legacy rows degrade to blank fields instead.

> **Model note (Phase 10):** Each seeded position is created by the `makePosition()` helper, which
> makes a **PositionCatalog** master (the reusable definition, the "Positions" module) **and** a
> snapshotted **Position** instance inside a **Publication**. `cscBatchId` in the seed payloads is the
> `publicationId`. Totals: 18 catalog masters, 6 publications, 18 instances.

---

## Existing Seed Data

### LGUs (1) — Phase 18
| Variable | Name | Slug | Enabled Modules |
|----------|------|------|-----------------|
| `lapulapu` | City of Lapu-Lapu | `lapu-lapu-city` | RSP, L&D |

> **Phase 18:** Cebu City, Mandaue, and Cebu Province were removed from the seed entirely, along
> with Cebu City's whole pipeline. One consequence: **the per-LGU module licensing demo is gone** —
> Mandaue was the RSP-only example. The feature still works; nothing seeded exercises it.

### Departments (Lapu-Lapu — 5)
Human Resource Office, Engineering Office, Treasury Office, Tourism Office, Health Office

### Users
| Variable | Username | Role | LGU | Dept |
|----------|----------|------|-----|------|
| `superAdmin` | superadmin | SUPER_ADMIN | — | — |
| `llHrAdmin` | lapulapuhr | LGU_HR_ADMIN | Lapu-Lapu | — |
| `llOfficeAdmin` | lapulapueng | LGU_OFFICE_ADMIN | Lapu-Lapu | Engineering |
| (unnamed) | lapulaputourism | LGU_OFFICE_ADMIN | Lapu-Lapu | Tourism |
| `applicant` | juandelacruz | APPLICANT | — | — |
| `applicant2` | mariagarcia | APPLICANT | — | — |
| `applicant3` | robertosantos | APPLICANT | — | — |
| `applicant4` | annareyes | APPLICANT | — | — |
| `applicant5` | pedrovillanueva | APPLICANT | — | — |
| `applicant6` | elenamarcos | APPLICANT | — | — |

### Per-User Module Access (`moduleAccess`)
Deny-by-default (null = no modules). Seed sets an explicit grant on every LGU staff user:
- HR admin (`lapulapuhr`): `["RSP","LND","ADMIN"]`
- Office admins: `["RSP"]` (all they can be granted — role gates the rest)
- Super admin & applicants: null (they ignore per-user grants)

Effective access = role ∩ LGU licensing ∩ per-user grant. See Status.md Phase 9F.

### Passwords
- Super Admin: `admin123`
- HR Admins: `hradmin123`
- Office Admins: `office123`
- Applicants: `applicant123`

All hashed with bcrypt (12 rounds).

---

## Cebu City Pipeline Data

### Publications (2)
| Variable | Publication | Published | Open Date | Close Date |
|----------|-------------|-----------|-----------|------------|
| `batch1` | 2026-001 | Yes | 2026-01-15 | 2026-01-30 |
| `batch2` | 2026-002 | No | 2026-03-01 | 2026-03-16 |

> Variable names still read `batchN` in the seed source; they now hold `Publication` rows. Each
> position below is a catalog master + a snapshotted instance placed in the given publication.

### Positions (5 catalog masters → 5 instances)
| Variable | Title | SG | Salary | Dept | Slots | Status | Publication |
|----------|-------|----|--------|------|-------|--------|-------------|
| `pos1` | Administrative Officer V | 18 | 51,357 | Engineering | 2 | OPEN | batch1 |
| `pos2` | Nurse III | 17 | 48,313 | Health | 1 | FILLED | batch1 |
| `pos3` | Accountant II | 15 | 42,159 | Treasury | 1 | OPEN | batch1 |
| `pos4` | IT Officer I | 19 | 54,461 | HR Office | 1 | DRAFT | batch2 |
| `pos5` | Social Welfare Officer II | 15 | 42,159 | Social Welfare | 1 | DRAFT | batch2 |

Each catalog master and each instance has 7 default document requirements (Letter of Intent, PDS, Performance Rating, Eligibility Certificate, Transcript, Training Certs, Designation Orders).

### Applications (8)
| Variable | Position | Applicant | Status |
|----------|----------|-----------|--------|
| `app1Juan` | pos1 | applicant (Juan) | APPOINTED |
| `app1Roberto` | pos1 | applicant3 (Roberto) | SELECTED |
| `app1Pedro` | pos1 | applicant5 (Pedro) | QUALIFIED |
| `app1Anna` | pos1 | applicant4 (Anna) | SHORTLISTED |
| `app1Elena` | pos1 | applicant6 (Elena) | ENDORSED |
| `app2Maria` | pos2 | applicant2 (Maria) | APPOINTED |
| `app3Anna` | pos3 | applicant4 (Anna) | SUBMITTED |
| `app3Pedro` | pos3 | applicant5 (Pedro) | SUBMITTED |

### Interview Schedules (2 — both COMPLETED)
| Variable | Position | Date | Venue | Assigned |
|----------|----------|------|-------|----------|
| `interview1` | pos1 | 2026-02-15 | Conference Room A | Juan ✓, Roberto ✓, Pedro ✓ |
| `interview2` | pos2 | 2026-02-10 | Conference Room B | Maria ✓ |

### Assessment Scores (4)
| Application | Position | Rank |
|-------------|----------|------|
| app1Juan | pos1 | 1st |
| app1Roberto | pos1 | 2nd |
| app1Pedro | pos1 | 3rd |
| app2Maria | pos2 | 1st |

> **Phase 13 change:** the fixed 7 score columns are gone. Assessments are now created with the
> `makeAssessment()` helper, which snapshots the factor template onto the position (via
> `ensureAssessmentTemplate()`), stores ratings as **percentages keyed by factor id** in
> `factorScores`, and computes `totalScore` with the group/weight formula. Totals are therefore
> capped at 100 — the old seeded totals (97.00, 102.50) no longer apply.

### Pattern: New Assessment
```typescript
await makeAssessment({
  applicationId: app1Juan.id,
  positionId: pos1.id,
  lguId: lgu.id,
  ratings: {
    'PERFORMANCE': 95,
    'EDUCATION': 92,
    'Relevant TRAINING': 88,
    'Relevant EXPERIENCE': 95,
    'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL': 90,
    'OUTSTANDING ACCOMPLISHMENTS': 80,
  },
  remarks: 'Strong candidate',
  scoredBy: hrAdmin.id,
});
```
Ratings are keyed by **factor label** and must match `ASSESSMENT_TEMPLATE` in the seed (which
mirrors `server/src/config/assessmentDefaults.ts`). A missing label scores 0.

### Appointments (2)
| Variable | Application | Position | Status | Requirements |
|----------|-------------|----------|--------|-------------|
| `appointment1` | app1Juan | pos1 | PENDING | 3/8 verified |
| `appointment2` | app2Maria | pos2 | COMPLETED | 8/8 verified |

Default 8 final requirements: Oath of Office, Appointment Form, Certificate of Assumption to Duty, Birth Certificate, Marriage Certificate, NBI Clearance, Medical Certificate, Barangay Clearance.

### Training (4)
| Variable | Title | Type | Status | Participants |
|----------|-------|------|--------|-------------|
| `training1` | Public Service Values and Ethics | FOUNDATION | COMPLETED | 5 |
| `training2` | Records Management and Digital Archiving | TECHNICAL | ONGOING | 4 |
| `training3` | Leadership and Supervisory Development | SUPERVISORY | UPCOMING | 0 |
| `training4` | Gender and Development Sensitivity Training | MANAGERIAL | COMPLETED | 3 |

### Audit Logs (68)
Uses correct controller action names and lowercase entity names matching the real server controllers:
- **Application history** (`entity: 'application'`): `SUBMIT_APPLICATION`, `ENDORSE_APPLICATION`, `SHORTLIST_APPLICATION`, `CREATE_INTERVIEW`, `COMPLETE_INTERVIEW`, `SAVE_ASSESSMENT_SCORE`, `QUALIFY_APPLICANTS`, `SELECT_APPLICANTS`, `CREATE_APPOINTMENT`
- **Appointments** (`entity: 'appointment'`): `CREATE_APPOINTMENT`, `UPDATE_APPOINTMENT`, `VERIFY_REQUIREMENT`
- **Interviews** (`entity: 'interview_schedule'`): `CREATE_INTERVIEW`, `COMPLETE_INTERVIEW`
- **Publications** (`entity: 'publication'`): `CREATE`, `UPDATE`
- **Training** (`entity: 'training'`): `CREATE`, `UPDATE`

All attributed to the correct actor (hrAdmin, officeAdmin, healthAdmin, or applicant).

---

---

## Lapu-Lapu Signatories

### HRMPSB Signatories (7)
| Type | Name | Designation | Role |
|------|------|-------------|------|
| PSB_MEMBER | ROSALINDA M. ABELLANA | City Mayor | Chairperson, HRMPSB |
| PSB_MEMBER | ATTY. FERDINAND L. YBAÑEZ | City Administrator | Vice Chairperson, HRMPSB |
| PSB_MEMBER | ATTY. MARICEL P. CUIZON | City Legal Officer | Member, HRMPSB |
| PSB_MEMBER | ENGR. ROGELIO T. SUMALINOG | City Engineer | Member, HRMPSB |
| PSB_MEMBER | DR. CARMELITA V. LOZADA | City Health Officer | Member, HRMPSB |
| PSB_MEMBER | BENJAMIN R. PATALINGHUG | Administrative Officer IV | Member, HRMPSB-PEACE Representative |
| PREPARED_BY | GLORIA S. MENDOZA | Human Resource Management Officer IV | Secretariat, HRMPSB |

> **Placeholder names** — the designations are genuine city-level posts, but the names are invented,
> not actual serving officials. Lapu-Lapu is now the only seeded LGU (Phase 18).

---

## How to Add New Seed Data

### Pattern: New Position
Use the `makePosition()` helper — it creates the catalog master **and** the snapshotted instance
(both with the given document requirements) in one call. `cscBatchId` is the publication id.
```typescript
const posX = await makePosition({
  data: {
    title: 'Position Title',
    itemNumber: 'OSEC-XXX-NN-YYYY',
    salaryGrade: 18,
    monthlySalary: 51357,
    education: "Bachelor's degree...",
    training: '8 hours...',
    experience: '2 years...',
    eligibility: 'Career Service Professional...',
    competency: '...',
    placeOfAssignment: '...',
    description: '...',
    status: 'OPEN', // DRAFT, OPEN, CLOSED, FILLED (instance only)
    openDate: new Date('2026-01-15'),
    closeDate: new Date('2026-01-30'),
    slots: 1,
    lguId: lgu.id,
    departmentId: engDept?.id,
    createdBy: hrAdmin.id,
    cscBatchId: batch1.id, // = publicationId
  },
}, defaultDocReqs);
```

### Pattern: New Application
```typescript
const appX = await prisma.application.create({
  data: {
    positionId: pos1.id,
    applicantId: applicant.id,
    status: 'SUBMITTED', // any ApplicationStatus
    submittedAt: new Date('2026-01-16T09:00:00'),
    notes: 'Optional notes',
  },
});
```

### Pattern: New Applicant with PDS
```typescript
const applicantX = await prisma.user.create({
  data: {
    email: 'name@gmail.com',
    username: 'username',
    password: applicantPassword, // reuse pre-hashed password
    firstName: 'First',
    lastName: 'Last',
    role: 'APPLICANT',
  },
});
await prisma.personalDataSheet.create({
  data: {
    userId: applicantX.id,
    data: {
      surname: 'Last', firstName: 'First', middleName: 'Middle', nameExtension: '',
      dateOfBirth: '1995-01-01', placeOfBirth: 'City, Province', sex: 'Male', civilStatus: 'Single',
      height: '1.70', weight: '65', bloodType: 'O+',
      gsisIdNo: '', pagibigIdNo: '...', philhealthNo: '...', sssNo: '...', tinNo: '...', agencyEmployeeNo: '',
      citizenship: 'Filipino', citizenshipType: 'by birth', citizenshipCountry: 'Philippines',
      residentialAddress: { houseNo: '', street: '', subdivision: '', barangay: '', city: '', province: '', zipCode: '' },
      permanentAddress: { /* same structure */ },
      telephoneNo: '', mobileNo: '09...', emailAddress: 'name@gmail.com',
      // spouse fields (all empty strings if single)
      spouseSurname: '', spouseFirstName: '', spouseMiddleName: '', spouseNameExtension: '',
      spouseOccupation: '', spouseEmployerName: '', spouseEmployerAddress: '', spouseTelephoneNo: '',
      // parent fields
      fatherSurname: '', fatherFirstName: '', fatherMiddleName: '', fatherNameExtension: '',
      motherMaidenSurname: '', motherFirstName: '', motherMiddleName: '',
      children: [], // [{ name: 'Name', dateOfBirth: 'YYYY-MM-DD' }]
      education: [], // [{ level, schoolName, degree, period: { from, to }, units, yearGraduated, honors }]
      eligibilities: [], // [{ name, rating, dateOfExam, placeOfExam, licenseNo, licenseValidity }]
      workExperience: [], // [{ period: { from, to }, positionTitle, department, monthlySalary, salaryGrade, statusOfAppointment, isGovernmentService }]
      voluntaryWork: [], // [{ organization, period: { from, to }, numberOfHours, position }]
      learningDevelopment: [], // [{ title, period: { from, to }, numberOfHours, type, conductor }]
      specialSkills: [], nonAcademicDistinctions: [], membershipInAssociations: [],
      references: [], // [{ name, address, telephoneNo }]
    },
  },
});
```

### Pattern: Audit Log

**IMPORTANT:** Use the exact action names and lowercase entity names that the real controllers use. The client `actionLabel()` function maps these to human-readable labels.

#### Application Status Audit Logs (entity: `'application'`)
```typescript
// Full pipeline for an application:
addLog(applicantId, 'SUBMIT_APPLICATION', 'application', appId, null, { status: 'SUBMITTED', positionId, applicantId }, new Date('...'));
addLog(hrAdminId, 'ENDORSE_APPLICATION', 'application', appId, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('...'));
addLog(officeAdminId, 'SHORTLIST_APPLICATION', 'application', appId, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('...'));
addLog(hrAdminId, 'CREATE_INTERVIEW', 'application', appId, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('...'));
addLog(hrAdminId, 'COMPLETE_INTERVIEW', 'application', appId, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('...'));
addLog(hrAdminId, 'SAVE_ASSESSMENT_SCORE', 'application', appId, null, { totalScore: 97.00 }, new Date('...'));
addLog(hrAdminId, 'QUALIFY_APPLICANTS', 'application', appId, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('...'));
addLog(hrAdminId, 'SELECT_APPLICANTS', 'application', appId, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('...'));
addLog(hrAdminId, 'CREATE_APPOINTMENT', 'application', appId, { status: 'SELECTED' }, { status: 'APPOINTED' }, new Date('...'));
```

#### Other Entity Audit Logs
```typescript
// Appointments (entity: 'appointment')
addLog(hrAdminId, 'CREATE_APPOINTMENT', 'appointment', appointmentId, null, { applicationId, positionId, ... }, new Date('...'));
addLog(hrAdminId, 'UPDATE_APPOINTMENT', 'appointment', appointmentId, { status: 'PENDING' }, { status: 'COMPLETED' }, new Date('...'));
addLog(hrAdminId, 'VERIFY_REQUIREMENT', 'appointment', appointmentId, null, { requirementName: '...', verified: true }, new Date('...'));

// Interviews (entity: 'interview_schedule')
addLog(hrAdminId, 'CREATE_INTERVIEW', 'interview_schedule', interviewId, null, { positionId, scheduleDate, venue }, new Date('...'));
addLog(hrAdminId, 'COMPLETE_INTERVIEW', 'interview_schedule', interviewId, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('...'));

// Publications (entity: 'publication')
addLog(hrAdminId, 'CREATE', 'publication', batchId, null, { publicationNumber, description }, new Date('...'));

// Training (entity: 'training')
addLog(hrAdminId, 'CREATE', 'training', trainingId, null, { title, type }, new Date('...'));
```

#### Bulk Insert
```typescript
await prisma.auditLog.createMany({ data: auditLogs });
```

#### Action Name Reference (maps to client `actionLabel()`)
| Action | Client Label | Entity |
|--------|-------------|--------|
| `SUBMIT_APPLICATION` | Application submitted | `application` |
| `ENDORSE_APPLICATION` | Endorsed by office | `application` |
| `SHORTLIST_APPLICATION` | Shortlisted for evaluation | `application` |
| `CREATE_INTERVIEW` | Scheduled for interview | `application` |
| `COMPLETE_INTERVIEW` | Interview completed | `application` |
| `SAVE_ASSESSMENT_SCORE` | Assessment score recorded | `application` |
| `QUALIFY_APPLICANTS` | Qualified based on assessment | `application` |
| `SELECT_APPLICANTS` | Selected for appointment | `application` |
| `CREATE_APPOINTMENT` | Appointed to position | `application` |
| `UPDATE_APPLICATION_STATUS` | Status changed to [status] | `application` |
