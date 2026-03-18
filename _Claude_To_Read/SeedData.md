# Seed Data Reference — `server/prisma/seed.ts`

Quick reference for the seed data structure. Use this when adding new seed data to avoid re-reading the full seed file.

---

## Cleanup Order (FK-safe deletion)

```typescript
trainingParticipant → training → finalRequirement → appointment →
assessmentScore → interviewScheduleApplicant → interviewSchedule →
applicationDocument → application → personalDataSheet → workExperienceSheet →
positionDocumentRequirement → position → cscPublicationBatch →
auditLog → user → department → lgu
```

---

## Existing Seed Data

### LGUs (4)
| Variable | Name | Slug |
|----------|------|------|
| `lgu` | City of Cebu | `cebu-city` |
| `mandaue` | City of Mandaue | `mandaue-city` |
| `lapulapu` | City of Lapu-Lapu | `lapu-lapu-city` |
| `cebuProvince` | Province of Cebu | `cebu-province` |

### Departments (Cebu City — 5)
Human Resource Office, Engineering Office, Treasury Office, Health Department, Social Welfare Office

### Users
| Variable | Username | Role | LGU | Dept |
|----------|----------|------|-----|------|
| `superAdmin` | superadmin | SUPER_ADMIN | — | — |
| `hrAdmin` | cebucityhr | LGU_HR_ADMIN | Cebu City | — |
| `officeAdmin` | cebucityeng | LGU_OFFICE_ADMIN | Cebu City | Engineering |
| `healthAdmin` | cebucityhealth | LGU_OFFICE_ADMIN | Cebu City | Health |
| `treasuryAdminUser` | cebucitytreasury | LGU_OFFICE_ADMIN | Cebu City | Treasury |
| (unnamed) | mandauehr | LGU_HR_ADMIN | Mandaue | — |
| (unnamed) | lapulapuhr | LGU_HR_ADMIN | Lapu-Lapu | — |
| (unnamed) | lapulapueng | LGU_OFFICE_ADMIN | Lapu-Lapu | Engineering |
| (unnamed) | cebuprovhr | LGU_HR_ADMIN | Cebu Province | — |
| `applicant` | juandelacruz | APPLICANT | — | — |
| `applicant2` | mariagarcia | APPLICANT | — | — |
| `applicant3` | robertosantos | APPLICANT | — | — |
| `applicant4` | annareyes | APPLICANT | — | — |
| `applicant5` | pedrovillanueva | APPLICANT | — | — |
| `applicant6` | elenamarcos | APPLICANT | — | — |

### Passwords
- Super Admin: `admin123`
- HR Admins: `hradmin123`
- Office Admins: `office123`
- Applicants: `applicant123`

All hashed with bcrypt (12 rounds).

---

## Cebu City Pipeline Data

### CSC Publication Batches (2)
| Variable | Batch | Published | Open Date | Close Date |
|----------|-------|-----------|-----------|------------|
| `batch1` | 2026-001 | Yes | 2026-01-15 | 2026-01-30 |
| `batch2` | 2026-002 | No | 2026-03-01 | 2026-03-16 |

### Positions (5)
| Variable | Title | SG | Salary | Dept | Slots | Status | Batch |
|----------|-------|----|--------|------|-------|--------|-------|
| `pos1` | Administrative Officer V | 18 | 51,357 | Engineering | 2 | OPEN | batch1 |
| `pos2` | Nurse III | 17 | 48,313 | Health | 1 | FILLED | batch1 |
| `pos3` | Accountant II | 15 | 42,159 | Treasury | 1 | OPEN | batch1 |
| `pos4` | IT Officer I | 19 | 54,461 | HR Office | 1 | DRAFT | batch2 |
| `pos5` | Social Welfare Officer II | 15 | 42,159 | Social Welfare | 1 | DRAFT | batch2 |

Each position has 7 default document requirements (Letter of Intent, PDS, Performance Rating, Eligibility Certificate, Transcript, Training Certs, Designation Orders).

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
| Application | Position | Total | Rank |
|-------------|----------|-------|------|
| app1Juan | pos1 | 97.00 | 1st |
| app1Roberto | pos1 | 91.50 | 2nd |
| app1Pedro | pos1 | 82.50 | 3rd |
| app2Maria | pos2 | 102.50 | 1st |

Score breakdown per criteria: educationScore, trainingScore, experienceScore, performanceScore, psychosocialScore, potentialScore, interviewScore.

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
- **CSC Batches** (`entity: 'csc_publication_batch'`): `CREATE`, `UPDATE`
- **Training** (`entity: 'training'`): `CREATE`, `UPDATE`

All attributed to the correct actor (hrAdmin, officeAdmin, healthAdmin, or applicant).

---

## How to Add New Seed Data

### Pattern: New Position
```typescript
const posX = await prisma.position.create({
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
    status: 'OPEN', // DRAFT, OPEN, CLOSED, FILLED
    openDate: new Date('2026-01-15'),
    closeDate: new Date('2026-01-30'),
    slots: 1,
    lguId: lgu.id,
    departmentId: engDept?.id,
    createdBy: hrAdmin.id,
    cscBatchId: batch1.id,
  },
});
// Add 7 default document requirements
for (const req of defaultDocReqs) {
  await prisma.positionDocumentRequirement.create({ data: { positionId: posX.id, ...req } });
}
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

// CSC Batches (entity: 'csc_publication_batch')
addLog(hrAdminId, 'CREATE', 'csc_publication_batch', batchId, null, { batchNumber, description }, new Date('...'));

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
