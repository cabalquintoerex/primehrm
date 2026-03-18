# LGU PRIME-HRM — Process Flow

## Recruitment, Selection, and Placement (RSP) Process

---

### Step 1: Create CSC Publication Batch
**Actor:** LGU HR Admin
**Module:** CSC Batches (`/admin/csc-batches`)

1. HR Admin clicks "New Batch"
2. Fills in:
   - **Batch Number** (e.g., `2026-001`) — unique per LGU
   - **Posting Date** — the date positions will be publicly posted
   - **Closing Date** — auto-calculated (Posting Date + 15 calendar days)
   - **Description** (optional)
3. System creates the batch with status **Unpublished**
4. HR Admin can edit or delete the batch while it is unpublished

---

### Step 2: Create Positions and Assign to Batch
**Actor:** LGU HR Admin
**Module:** Positions (`/admin/positions`)

1. HR Admin clicks "Add Position"
2. Fills in position details:
   - **Position Title**, **Plantilla Item No.**, **Salary Grade** (auto-fills monthly salary)
   - **Place of Assignment**, **Office/Department**, **No. of Vacancies**
   - **CSC Publication Batch** (required) — selecting a batch auto-fills Posting Date and Closing Date
   - **Qualification Standards**: Education, Training, Experience, Eligibility, Competency
   - **Description / Instructions / Remarks**
   - **Document Requirements** (7 defaults pre-populated, customizable)
3. Position is created with status **DRAFT**
4. Position is linked to the selected CSC batch

> **Alternative:** Positions can also be added to a batch from the Batch Detail page (`/admin/csc-batches/:id`) using the "Add Positions" button.

---

### Step 3: Publish the CSC Batch
**Actor:** LGU HR Admin
**Module:** CSC Batch Detail Page (`/admin/csc-batches/:id`)

1. After CSC publishes the positions on their official website, HR Admin clicks "Mark as Published"
2. System automatically:
   - Sets the batch to **Published**
   - Changes all **DRAFT** positions in the batch to **OPEN** status
   - Positions now appear on the public careers page (`/:lgu-slug/careers`)
3. If needed, HR Admin can **Unpublish** the batch:
   - All **OPEN** positions in the batch revert to **DRAFT**
   - Positions disappear from the public careers page
   - Positions already CLOSED or FILLED are not affected

---

### Step 4: Applicant Applies
**Actor:** Applicant (Public)
**Module:** Public Careers Page (`/:lgu-slug/careers`)

1. Applicant browses open positions on the LGU's careers page
2. Clicks on a position to view full details (qualifications, requirements, closing date)
3. Clicks "Apply Now"
   - **New user:** Register an account, then fill out PDS (CS Form 212, 8-step wizard)
   - **Returning user:** Log in (PDS already on file, editable)
4. Applicant uploads required documents (Letter of Intent, Transcript, Eligibility Certificate, etc.)
   - PDS requirement is auto-fulfilled if PDS is on file
5. Submits application
6. Application status: **SUBMITTED**

---

### Step 5: HR Reviews and Endorses to Office/Department
**Actor:** LGU HR Admin
**Module:** Applications (`/admin/applications`)

1. HR Admin views submitted applications with filters (by position, status, search by name)
2. Opens an application to review:
   - PDS summary (collapsible sections)
   - Uploaded documents (downloadable)
3. HR Admin clicks **"Endorse to Office"**
   - Application status changes: **SUBMITTED → ENDORSED**
   - Application becomes visible to the Office Admin of the assigned department
4. HR Admin can also **Reject** an application at this stage

---

### Step 6: Office Admin Screens and Shortlists
**Actor:** LGU Office Admin
**Module:** Applications (`/admin/applications`)

1. Office Admin sees only endorsed applications for their department
2. Reviews applicant qualifications and documents
3. Office Admin clicks **"Shortlist"** for qualified applicants
   - Application status changes: **ENDORSED → SHORTLISTED**
4. Office Admin can **Reject** unqualified applicants
   - Application status changes: **ENDORSED → REJECTED**

---

### Step 7: HR Schedules Interviews
**Actor:** LGU HR Admin
**Module:** Interviews (`/admin/interviews`)

1. HR Admin creates an interview schedule:
   - Selects the **Position**
   - Sets **Date**, **Venue**, and **Notes**
2. Assigns shortlisted applicants to the interview schedule
   - Application status changes: **SHORTLISTED → FOR_INTERVIEW**
3. (Email notification to applicants — planned, not yet implemented)

---

### Step 8: Conduct Interview and Mark Attendance
**Actor:** LGU HR Admin
**Module:** Interview Detail (`/admin/interviews/:id`)

1. On the interview date, HR Admin opens the interview detail page
2. Marks attendance for each applicant:
   - **Attended** — applicant was present
   - **No Show** — applicant did not attend
3. HR Admin clicks **"Complete Interview"**
   - Attended applicants: status changes **FOR_INTERVIEW → INTERVIEWED**
   - No-show applicants remain at FOR_INTERVIEW

---

### Step 9: Encode Assessment Scores
**Actor:** LGU HR Admin
**Module:** Assessment (`/admin/assessments/:positionId`)

1. After interview completion, HR Admin opens the assessment scoring page
2. Inputs scores for each interviewed applicant across 7 criteria:
   - Education, Training, Experience, Performance, Psychosocial Attributes, Potential, Interview
3. System auto-computes **Total Score** and ranks applicants by total (descending)
4. HR Admin clicks **"Qualify"** for passing applicants
   - Application status changes: **INTERVIEWED → QUALIFIED**
   - Requires assessment score to exist (button disabled without score)

---

### Step 10: Select for Appointment
**Actor:** LGU HR Admin (on behalf of Head of Agency / HRMPSB)
**Module:** Selection (`/admin/selection`)

1. HR Admin views all qualified applicants grouped by position
2. Each position shows:
   - Ranked applicants with assessment scores
   - Number of vacancy slots available
3. HR Admin selects applicants via checkbox (up to the number of slots)
4. Clicks **"Select for Appointment"**
   - Application status changes: **QUALIFIED → SELECTED**
   - Warning shown if selections exceed vacancy slots

---

### Step 11: Create Appointment
**Actor:** LGU HR Admin
**Module:** Selection → Appointments (`/admin/appointments`)

1. HR Admin clicks **"Appoint"** for selected applicants
2. Enters:
   - **Appointment Date**
   - **Oath Date** (optional)
3. System creates the appointment:
   - Application status changes: **SELECTED → APPOINTED**
   - 8 default final requirements auto-created (Oath, Appointment Form, Assumption to Duty, Birth Certificate, Marriage Certificate, NBI, Medical, Barangay Clearance)
   - If all vacancy slots are filled, position status auto-changes to **FILLED**

---

### Step 12: Generate Appointment Documents
**Actor:** LGU HR Admin
**Module:** Appointment Detail (`/admin/appointments/:id`)

1. HR Admin can generate and print:
   - **Appointment Form** (CS Form 33-B) — with LGU header, appointee details, position info, salary, signatures
   - **Oath of Office** (CS Form 32) — with oath text, affiant signature, administering officer
2. Documents are generated as printable HTML

---

### Step 13: Final Requirements Verification
**Actor:** LGU HR Admin
**Module:** Appointment Detail (`/admin/appointments/:id`)

1. HR Admin manages final requirements for the appointee:
   - Can add custom requirements beyond the 8 defaults
   - Can delete unverified requirements
2. As the appointee submits documents, HR Admin:
   - Clicks **"Verify"** on each requirement
   - System records the verifier and timestamp
3. Progress bar shows verification completion percentage
4. When **all requirements are verified**:
   - Appointment status auto-changes: **PENDING → COMPLETED**
5. If any requirement is later unverified:
   - Appointment status reverts: **COMPLETED → PENDING**

---

## Status Workflow Summary

### Position Status Flow
```
DRAFT → OPEN → CLOSED → FILLED
         ↑
    (CSC Batch Publish)
```
- **DRAFT**: Created, not yet publicly visible
- **OPEN**: Published via CSC batch, visible on careers page, accepting applications
- **CLOSED**: No longer accepting applications
- **FILLED**: All vacancy slots appointed

### Application Status Flow
```
SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED
                                                                                            ↘ REJECTED (at any step)
```

### CSC Batch Status Flow
```
Unpublished → Published → Unpublished (reversible)
```
- **Publish**: DRAFT positions → OPEN
- **Unpublish**: OPEN positions → DRAFT (CLOSED/FILLED unaffected)

### Appointment Status Flow
```
PENDING → COMPLETED (auto, when all requirements verified)
```

---

## Role Permissions Summary

> **Note:** SUPER_ADMIN can only manage LGUs, Departments, and Users. All other modules are view-only.

| Action | SUPER_ADMIN | LGU_HR_ADMIN | LGU_OFFICE_ADMIN | APPLICANT |
|--------|:-----------:|:------------:|:-----------------:|:---------:|
| Manage LGUs | Yes | - | - | - |
| Manage Departments | Yes | Yes | - | - |
| Manage Users | Yes | Yes | - | - |
| Manage CSC Batches | View Only | Yes | - | - |
| Create/Edit Positions | View Only | Yes | - | - |
| Publish/Unpublish Batch | View Only | Yes | - | - |
| View Applications | View Only | Yes | Own Dept | Own |
| Endorse to Office | - | Yes | - | - |
| Shortlist / Reject | - | - | Yes | - |
| Schedule Interviews | View Only | Yes | - | - |
| Encode Assessment | View Only | Yes | - | - |
| Qualify Applicants | - | Yes | - | - |
| Select for Appointment | View Only | Yes | - | - |
| Create Appointment | - | Yes | - | - |
| Verify Requirements | View Only | Yes | - | - |
| Manage Training | View Only | Yes | - | - |
| Apply to Positions | - | - | - | Yes |
| Fill PDS / Upload Docs | - | - | - | Yes |
