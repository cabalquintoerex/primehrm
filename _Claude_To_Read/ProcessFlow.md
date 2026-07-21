# LGU PRIME-HRM — Process Flow

## Module Structure

The application is split into two business modules plus a system section. After login, users
land on the module launcher (`/modules`) and pick where to go; a switcher at the top of the
sidebar swaps modules without re-logging.

| Section | Base path | Pages | Who can enter |
|---------|-----------|-------|---------------|
| **RSP** — Recruitment, Selection & Placement | `/rsp` | Dashboard, Positions, Publications, Applications, Interviews, Selection, Appointments, Reports | SUPER_ADMIN, LGU_HR_ADMIN, LGU_OFFICE_ADMIN |
| **L&D** — Learning & Development | `/lnd` | Dashboard, Training, Reports | SUPER_ADMIN, LGU_HR_ADMIN |
| **Administration** | `/admin` | Dashboard (super admin), LGU Management, Departments, Users, HRMPSB Signatories, Audit Logs | SUPER_ADMIN, LGU_HR_ADMIN |
| Applicant portal | `/applicant` | Dashboard, PDS, My Applications | APPLICANT |

Notes:
- Administration is **not** a launcher card — it is reached via the gear icon in the header.
- A user with exactly one available module skips the launcher entirely. LGU_OFFICE_ADMIN has
  only RSP, so they land on `/rsp` directly.
- LGU_OFFICE_ADMIN is excluded from L&D until department-level training assignment ships.
- SUPER_ADMIN lands on `/admin` (Administration) by default.
- Legacy `/admin/*` paths for moved pages redirect to their new module path.
- A SUPER_ADMIN can license RSP and/or L&D per LGU (LGU Management → Enabled Modules). An LGU
  with L&D disabled hides the module from its staff (locked launcher card) and the server rejects
  its L&D API calls with 403. Administration is never licensable.
  *(Since Phase 18 the seed contains only Lapu-Lapu, which licenses both — no seeded LGU
  demonstrates a disabled module any more.)*
- **Signing out** returns an LGU user to their own branded login (`/{lgu-slug}/login`), not the
  generic one. Applicants and super admins have no LGU, so they get `/`.
- **HRMPSB Signatories** (Administration) holds the signature block printed on the Comparative
  Assessment Form: members with their designation and board role, plus a "Prepared by" signatory.
  Order is explicit, and members can be deactivated rather than deleted.
- An HR admin (or super admin) grants modules per user (User Management → Module Access). Access is
  **deny-by-default**: a user sees only the modules explicitly granted, within the LGU's licensing
  and their role. All three modules — RSP, L&D, and Administration — are grantable, so HR can e.g.
  make a recruitment-only staffer who can't manage users. You cannot remove your own Administration
  access. Effective access = role ∩ LGU licensing ∩ per-user grant.

---

## Recruitment, Selection, and Placement (RSP) Process

---

### Step 1: Define Positions in the Catalog
**Actor:** LGU HR Admin
**Module:** Positions (`/rsp/positions`)

1. HR Admin clicks "Add Position"
2. Fills in the reusable definition:
   - **Position Title**, **Plantilla Item No.**, **Salary Grade** (auto-fills monthly salary)
   - **Place of Assignment**, **Office/Department**
   - **Qualification Standards**: Education, Training, Experience, Eligibility, Competency
   - **Description / Instructions / Remarks**
   - **Document Requirements** (7 defaults pre-populated, customizable)
3. The position is saved to the **master catalog** — a reusable definition with **no status or
   vacancy count of its own**. It is not yet posted anywhere.

> The catalog is reusable: the same definition can be added to many publications over time. There is
> no re-encoding — Step 3 pulls positions straight from this catalog.

---

### Step 2: Create a Publication
**Actor:** LGU HR Admin
**Module:** Publications (`/rsp/publications`)

1. HR Admin clicks "New Publication"
2. Fills in:
   - **Publication Number** (e.g., `2026-001`) — unique per LGU
   - **Posting Date** — the date positions will be publicly posted
   - **Closing Date** — auto-calculated (Posting Date + 15 calendar days)
   - **Description** (optional)
3. System creates the publication with status **Unpublished**
4. HR Admin can edit or delete the publication while it is unpublished

---

### Step 3: Add Positions and Publish
**Actor:** LGU HR Admin
**Module:** Publication Detail Page (`/rsp/publications/:id`)

1. HR Admin clicks **"Add Positions"** and selects positions from the catalog, setting the
   **number of vacancies** for each.
2. Each selection is **snapshotted** into the publication as a **DRAFT** posting — its definition and
   document requirements are copied and frozen at that moment (later catalog edits don't touch it).
3. After CSC publishes the positions on their official website, HR Admin clicks "Mark as Published":
   - Sets the publication to **Published**
   - Changes all **DRAFT** postings in it to **OPEN** status
   - OPEN positions now appear on the public careers page (`/:lgu-slug/careers`)
4. Each posting can also be individually **Published / Unpublished / Closed / Marked Filled** from this
   page. If the publication is **Unpublished**, all its **OPEN** postings revert to **DRAFT**
   (CLOSED/FILLED are unaffected).
5. While a posting is **DRAFT**, HR can **Edit** it to override its qualifications, slots, department,
   and document requirements **for this publication only** — the catalog master and other publications
   are untouched. A "Customized" badge marks overridden postings; "Reset to catalog default" restores
   the master's values. Once published (OPEN), a posting is frozen; unpublish it to edit.

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
   - PDS requirement is auto-fulfilled if PDS is on file (matched on the requirement label
     containing "PDS" / "Personal Data Sheet" — including the CSC default
     *"Personal Data Sheet with Work Experience Sheet"*)
5. Submits application → lands on **My Applications**, where the new row is already visible
6. Application status: **SUBMITTED**

> **Work Experience Sheet** (`/applicant/wes`) is a separate module, filled in independently of the
> PDS — it does not read PDS data. The applicant can save it and download the CS Form 212
> Attachment PDF at any time.

---

### Step 5: HR Reviews and Endorses to Office/Department
**Actor:** LGU HR Admin
**Module:** Applications (`/rsp/applications`)

1. HR Admin views submitted applications with filters (by position, status, search by name)
2. Opens an application to review:
   - PDS summary (collapsible sections)
   - Uploaded documents (downloadable)
   - **Status History** — the audit trail for this application: every status change with actor and
     timestamp. The applicant sees the same trail on their My Applications page.
3. HR Admin clicks **"Endorse to Office"**
   - Application status changes: **SUBMITTED → ENDORSED**
   - Application becomes visible to the Office Admin of the assigned department
4. HR Admin can also **Reject** an application at this stage

---

### Step 6: Office Admin (or HR) Screens and Shortlists
**Actor:** LGU Office Admin — or LGU HR Admin
**Module:** Applications (`/rsp/applications`)

1. Office Admin sees only endorsed applications for their department
2. Reviews applicant qualifications and documents
3. Office Admin clicks **"Shortlist"** for qualified applicants
   - Application status changes: **ENDORSED → SHORTLISTED**
4. Office Admin can **Reject** unqualified applicants
   - Application status changes: **ENDORSED → REJECTED**

> **HR can also shortlist.** Screening is normally the office's job, but HR holds the same
> ENDORSED → SHORTLISTED / REJECTED actions so the pipeline isn't blocked when an office
> hasn't screened yet — only SHORTLISTED applicants can be assigned to an interview.

---

### Step 7: HR Schedules Interviews
**Actor:** LGU HR Admin
**Module:** Interviews (`/rsp/interviews`)

1. HR Admin creates an interview schedule:
   - Selects the **Position**
   - Sets **Date**, **Venue**, and **Notes**
2. Assigns shortlisted applicants to the interview schedule
   - Application status changes: **SHORTLISTED → FOR_INTERVIEW**
3. (Email notification to applicants — planned, not yet implemented)

---

### Step 8: Conduct Interview and Mark Attendance
**Actor:** LGU HR Admin
**Module:** Interview Detail (`/rsp/interviews/:id`)

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
**Module:** Assessment (`/rsp/assessments/:positionId`)

1. After interview completion, HR Admin opens the assessment scoring page
2. The page loads the position's **factor template** — snapshotted from the LGU default the first
   time it is opened, so later template edits never disturb an assessment already in progress.
   The CSC default is four groups totalling 100 points:

   | Group | Points | Factors (max weight) |
   |-------|-------:|----------------------|
   | I | 25 | Performance (1) |
   | II — ETE | 40 | Education (0.35), Relevant Training (0.30), Relevant Experience (0.35) |
   | III | 30 | Psycho-social Attributes & Potential (1) |
   | IV | 5 | Outstanding Accomplishments (1) |

3. HR enters each factor as a **rating percentage (0–100)** per applicant, then clicks
   **"Save All & Rank"** — the ranking is recalculated on save, not while typing
4. System computes live, and recomputes authoritatively on save:
   - factor equivalent % = `maxWeight × rating%`
   - **group subtotal** = sum of its factors' equivalents — shown on the header of any group with
     more than one factor (e.g. ETE)
   - group points = `subtotal × group points`
   - **Total Score** = sum of group points; applicants ranked by total (descending)
5. **"Export PDF"** generates the **Comparative Assessment Form** — landscape folio with the
   position header, grouped factor columns, four rows per candidate (identity → Equivalent
   Percentage Weight → Total → Equivalent Points Score), the HRMPSB signature block, and
   "Prepared by:". Signatories come from Administration → HRMPSB Signatories; gender and
   eligibility come from each applicant's PDS.
6. **"Edit Factors"** adds/removes groups and factors and adjusts points and weights for this
   position. Existing ratings are carried across by factor name, and totals are recomputed. The
   editor warns when group points don't total 100 or a group's weights don't sum to 1.
7. HR Admin clicks **"Qualify"** for passing applicants
   - Application status changes: **INTERVIEWED → QUALIFIED**
   - Requires assessment score to exist (button disabled without score)

---

### Step 10: Select for Appointment
**Actor:** LGU HR Admin (on behalf of Head of Agency / HRMPSB)
**Module:** Selection (`/rsp/selection`)

1. HR Admin views all qualified applicants grouped by position
2. Each position shows:
   - Ranked applicants with assessment scores
   - Number of vacancy slots available
3. HR Admin selects applicants via checkbox (up to the number of slots)
4. Clicks **"Select for Appointment"**
   - Application status changes: **QUALIFIED → SELECTED**
   - Warning shown if selections exceed vacancy slots
5. **"PSB Certification"** on each position card generates the HRMPSB **Certification of Qualified
   Applicants** (PDF): LGU seal and board header, the R.A. 7160 certification paragraph naming the
   position and item number, the qualified applicants **in rank order (top 5 only)**, and the
   signature block from Administration → HRMPSB Signatories (chairperson centred, members in two
   columns).

---

### Step 11: Create Appointment
**Actor:** LGU HR Admin
**Module:** Selection → Appointments (`/rsp/appointments`)

1. HR Admin clicks **"Appoint"** for selected applicants
2. Enters:
   - **Appointment Date**
   - **Oath Date** (optional)
3. System creates the appointment:
   - **Vacancy guard:** rejected if the position's slots are already filled. APPOINTED is the
     binding state, so it is what counts against the slots; the Appoint button is disabled and the
     server returns 400. Selecting more candidates than there are slots is still allowed (alternates)
   - Application status changes: **SELECTED → APPOINTED**
   - 8 default final requirements auto-created (Oath, Appointment Form, Assumption to Duty, Birth Certificate, Marriage Certificate, NBI, Medical, Barangay Clearance)
   - If all vacancy slots are filled, position status auto-changes to **FILLED**

---

### Step 12: Generate Appointment Documents
**Actor:** LGU HR Admin
**Module:** Appointment Detail (`/rsp/appointments/:id`)

1. HR Admin can generate and print:
   - **Appointment Form** (CS Form No. 33-A, Revised 2025 — Regulated) — letter-style appointment
     instrument with the stamp-of-receipt box, compensation and nature-of-appointment lines, the
     HRMO and HRMPSB certifications, the R.A. 7041 publication paragraph, CSC Notation, and
     acknowledgement
   - **Oath of Office** (CS Form 32) — with oath text, affiant signature, administering officer
   - **Certification of Assumption to Duty** (CS Form No. 4, Revised 2025)
2. Documents are generated as **PDFs** matching the CSC forms' appearance (33-A reproduces the grey
   field with white bordered cards). Known values are pre-filled on ruled lines; anything
   the system does not hold (nature of appointment, the vice clause, HRMPSB deliberation date)
   prints blank for manual completion.

> **Transmittal:** the Appointments list page generates **CS Form No. 1 (Appointment Transmittal and
> Action Form)** in **PDF or Excel** for all appointments whose requirements are fully verified
> (status COMPLETED). The Excel version leaves the manually-filled fields as empty typeable cells.

---

### Step 13: Final Requirements Verification
**Actor:** LGU HR Admin
**Module:** Appointment Detail (`/rsp/appointments/:id`)

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
   (Publication Publish)
```
- **DRAFT**: Snapshotted into a publication, not yet publicly visible
- **OPEN**: Published within its publication, visible on careers page, accepting applications
- **CLOSED**: No longer accepting applications
- **FILLED**: All vacancy slots appointed

### Application Status Flow
```
SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED
                                                                                            ↘ REJECTED (at any step)
```

### Publication Status Flow
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
| Enter RSP module | Yes | Yes | Yes | - |
| Enter L&D module | Yes | Yes | - | - |
| Enter Administration | Yes | Yes | - | - |
| Manage LGUs | Yes | - | - | - |
| Manage Departments | Yes | Yes | - | - |
| Manage Users | Yes | Yes | - | - |
| Manage Publications | View Only | Yes | - | - |
| Create/Edit Positions (catalog) | View Only | Yes | - | - |
| Publish/Unpublish Publication | View Only | Yes | - | - |
| View Applications | View Only | Yes | Own Dept | Own |
| Endorse to Office | - | Yes | - | - |
| Shortlist / Reject | - | Yes | Yes | - |
| Schedule Interviews | View Only | Yes | - | - |
| Encode Assessment | View Only | Yes | - | - |
| Qualify Applicants | - | Yes | - | - |
| Select for Appointment | View Only | Yes | - | - |
| Create Appointment | - | Yes | - | - |
| Verify Requirements | View Only | Yes | - | - |
| Manage Training | View Only | Yes | - | - |
| Apply to Positions | - | - | - | Yes |
| Fill PDS / Upload Docs | - | - | - | Yes |
