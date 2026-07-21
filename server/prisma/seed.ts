import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Create a catalog master position and a snapshotted Position instance inside a publication.
 * `arg.data` is the existing position payload (definition + status/slots/dates + cscBatchId, which
 * is treated as the publicationId). The definition and document requirements are copied into both
 * the reusable catalog entry and the frozen instance.
 */
async function makePosition(arg: { data: any }, docReqs: any[]) {
  const { status, slots, openDate, closeDate, cscBatchId, requirements, ...def } = arg.data;
  const catalog = await prisma.positionCatalog.create({
    data: { ...def, isActive: true, documentRequirements: { create: docReqs } },
  });
  return prisma.position.create({
    data: {
      ...def,
      status,
      slots,
      openDate,
      closeDate,
      requirements,
      catalogId: catalog.id,
      publicationId: cscBatchId,
      documentRequirements: { create: docReqs },
    },
  });
}

async function main() {
  console.log('Seeding database...');

  // Clean all data in correct order
  console.log('Cleaning existing data...');
  await prisma.trainingParticipant.deleteMany();
  await prisma.training.deleteMany();
  await prisma.finalRequirement.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.assessmentScore.deleteMany();
  // Factors cascade from groups; groups must go before positions and lgus.
  await prisma.assessmentGroup.deleteMany();
  await prisma.psbMember.deleteMany();
  await prisma.interviewScheduleApplicant.deleteMany();
  await prisma.interviewSchedule.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.personalDataSheet.deleteMany();
  await prisma.workExperienceSheet.deleteMany();
  await prisma.positionDocumentRequirement.deleteMany();
  await prisma.position.deleteMany();
  await prisma.positionCatalogRequirement.deleteMany();
  await prisma.positionCatalog.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.lgu.deleteMany();
  console.log('All data cleared.');

  // Create super admin
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@primehrm.gov.ph' },
    update: {},
    create: {
      email: 'admin@primehrm.gov.ph',
      username: 'superadmin',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created super admin:', superAdmin.email);

  const lapulapu = await prisma.lgu.upsert({
    where: { slug: 'lapu-lapu-city' },
    update: {},
    create: {
      name: 'City of Lapu-Lapu',
      slug: 'lapu-lapu-city',
      address: 'Lapu-Lapu City Hall, M.L. Quezon National Highway, Lapu-Lapu City',
      contactNumber: '(032) 340-5456',
      email: 'hr@lapulapucity.gov.ph',
      enabledModules: ['RSP', 'LND'],
    },
  });
  console.log('Created LGU:', lapulapu.name);

  const lapulapuDepts = ['Human Resource Office', 'Engineering Office', 'Treasury Office', 'Tourism Office', 'Health Office'];
  for (const deptName of lapulapuDepts) {
    await prisma.department.upsert({
      where: { lguId_name: { lguId: lapulapu.id, name: deptName } },
      update: {},
      create: { name: deptName, lguId: lapulapu.id },
    });
  }

  const lapulapuHrPassword = await bcrypt.hash('hradmin123', 12);
  const llHrAdmin = await prisma.user.upsert({
    where: { email: 'hr@lapulapucity.gov.ph' },
    update: {},
    create: {
      email: 'hr@lapulapucity.gov.ph',
      username: 'lapulapuhr',
      password: lapulapuHrPassword,
      firstName: 'HR',
      lastName: 'Admin',
      role: 'LGU_HR_ADMIN',
      moduleAccess: ['RSP', 'LND', 'ADMIN'],
      lguId: lapulapu.id,
    },
  });
  console.log('Created Lapu-Lapu HR Admin');

  // Create Lapu-Lapu Office Admin
  const lapulapuEngDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Engineering Office' } });
  const lapulapuOfficePassword = await bcrypt.hash('office123', 12);
  const llOfficeAdmin = await prisma.user.upsert({
    where: { email: 'engineering@lapulapucity.gov.ph' },
    update: {},
    create: {
      email: 'engineering@lapulapucity.gov.ph',
      username: 'lapulapueng',
      password: lapulapuOfficePassword,
      firstName: 'Engineering',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      moduleAccess: ['RSP'],
      lguId: lapulapu.id,
      departmentId: lapulapuEngDept?.id,
    },
  });
  console.log('Created Lapu-Lapu Office Admin');

  // Applicants are LGU-independent — they can apply to any LGU
  const applicantPassword = await bcrypt.hash('applicant123', 12);

  const applicant = await prisma.user.upsert({
    where: { email: 'juan.delacruz@gmail.com' },
    update: {},
    create: {
      email: 'juan.delacruz@gmail.com',
      username: 'juandelacruz',
      password: applicantPassword,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      role: 'APPLICANT',
    },
  });
  console.log('Created Applicant:', applicant.email);

  // Create PDS for Juan Dela Cruz
  await prisma.personalDataSheet.create({
    data: {
      userId: applicant.id,
      data: {
        surname: 'Dela Cruz',
        firstName: 'Juan',
        middleName: 'Santos',
        nameExtension: '',
        dateOfBirth: '1995-06-15',
        placeOfBirth: 'Lapu-Lapu City, Cebu',
        sex: 'Male',
        civilStatus: 'Single',
        height: '1.72',
        weight: '68',
        bloodType: 'O+',
        gsisIdNo: '',
        pagibigIdNo: '121234567890',
        philhealthNo: '0123456789012',
        sssNo: '3412345678',
        tinNo: '123456789',
        agencyEmployeeNo: '',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '123',
          street: 'Rizal Street',
          subdivision: 'Marigondon Heights',
          barangay: 'Marigondon',
          city: 'Lapu-Lapu City',
          province: 'Cebu',
          zipCode: '6015',
        },
        permanentAddress: {
          houseNo: '123',
          street: 'Rizal Street',
          subdivision: 'Marigondon Heights',
          barangay: 'Marigondon',
          city: 'Lapu-Lapu City',
          province: 'Cebu',
          zipCode: '6015',
        },
        telephoneNo: '(032) 340-1234',
        mobileNo: '09171234567',
        emailAddress: 'juan.delacruz@gmail.com',
        spouseSurname: '',
        spouseFirstName: '',
        spouseMiddleName: '',
        spouseNameExtension: '',
        spouseOccupation: '',
        spouseEmployerName: '',
        spouseEmployerAddress: '',
        spouseTelephoneNo: '',
        fatherSurname: 'Dela Cruz',
        fatherFirstName: 'Pedro',
        fatherMiddleName: 'Reyes',
        fatherNameExtension: '',
        motherMaidenSurname: 'Santos',
        motherFirstName: 'Maria',
        motherMiddleName: 'Lopez',
        children: [],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Marigondon Elementary School',
            degree: 'Elementary Education',
            period: { from: '2001', to: '2007' },
            units: '',
            yearGraduated: '2007',
            honors: '',
          },
          {
            level: 'Secondary',
            schoolName: 'Lapu-Lapu City National High School',
            degree: 'Secondary Education',
            period: { from: '2007', to: '2011' },
            units: '',
            yearGraduated: '2011',
            honors: 'With Honors',
          },
          {
            level: 'College',
            schoolName: 'University of the Philippines Cebu',
            degree: 'Bachelor of Science in Computer Science',
            period: { from: '2011', to: '2015' },
            units: '',
            yearGraduated: '2015',
            honors: 'Cum Laude',
          },
        ],
        eligibilities: [
          {
            name: 'Career Service Professional',
            rating: '83.25',
            dateOfExam: '2016-04-17',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2020-03-01', to: '2025-12-31' },
            positionTitle: 'Administrative Aide VI',
            department: 'City of Mandaue - Treasury Office',
            monthlySalary: '18957',
            salaryGrade: 'SG-6 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
          },
          {
            period: { from: '2016-07-01', to: '2020-02-28' },
            positionTitle: 'IT Support Staff',
            department: 'TechVentures Inc.',
            monthlySalary: '18000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
          },
        ],
        voluntaryWork: [
          {
            organization: 'Lapu-Lapu City Red Cross Chapter',
            period: { from: '2018-01-15', to: '2018-06-30' },
            numberOfHours: '120',
            position: 'Volunteer IT Support',
          },
        ],
        learningDevelopment: [
          {
            title: 'Basic Computer Operations and Office Applications',
            period: { from: '2016-08-01', to: '2016-08-05' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Civil Service Commission - Region VII',
          },
          {
            title: 'Public Financial Management Training',
            period: { from: '2021-03-15', to: '2021-03-19' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Department of Budget and Management',
          },
          {
            title: 'Values Orientation Workshop',
            period: { from: '2022-07-10', to: '2022-07-11' },
            numberOfHours: '16',
            type: 'Foundation',
            conductor: 'Civil Service Commission',
          },
        ],
        specialSkills: ['Computer Troubleshooting', 'MS Office Proficiency', 'Database Management', 'Network Administration'],
        nonAcademicDistinctions: ['Best Employee Award 2023 - City of Mandaue'],
        membershipInAssociations: ['Philippine Computer Society', 'CSC Alumni Association Region VII'],
        references: [
          { name: 'Engr. Roberto Flores', address: 'Mandaue City Hall, Mandaue City', telephoneNo: '09181234567' },
          { name: 'Dr. Elena Reyes', address: 'UP Cebu, Lahug, Cebu City', telephoneNo: '09191234567' },
          { name: 'Atty. Marco Villanueva', address: 'Lapu-Lapu City Hall, Lapu-Lapu City', telephoneNo: '09201234567' },
        ],
      },
    },
  });

  // Create Work Experience Sheet for Juan
  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant.id,
      data: {
        entries: [
          {
            duration: "March 1, 2020 – December 31, 2025",
            position: "Administrative Aide VI",
            officeUnit: "Treasury Office",
            immediateSupervisor: '',
            agencyAndLocation: "City of Mandaue",
            accomplishments: [],
            summaryOfDuties: "Process financial documents and vouchers; Maintain records of collections and disbursements; Assist in payroll computation and processing; Prepare monthly financial reports.",
          },
          {
            duration: "July 1, 2016 – February 28, 2020",
            position: "IT Support Staff",
            officeUnit: "TechVentures Inc.",
            immediateSupervisor: '',
            agencyAndLocation: "TechVentures Inc.",
            accomplishments: [],
            summaryOfDuties: "Provide technical support for hardware and software issues; Maintain network infrastructure and servers; Manage user accounts and access permissions.",
          },
        ],
      },
    },
  });
  console.log('Created PDS and WES for Juan Dela Cruz');

  // Create 3 more applicants with PDS
  const applicant2 = await prisma.user.create({
    data: {
      email: 'maria.garcia@gmail.com',
      username: 'mariagarcia',
      password: applicantPassword,
      firstName: 'Maria',
      lastName: 'Garcia',
      role: 'APPLICANT',
    },
  });

  await prisma.personalDataSheet.create({
    data: {
      userId: applicant2.id,
      data: {
        surname: 'Garcia',
        firstName: 'Maria',
        middleName: 'Fernandez',
        nameExtension: '',
        dateOfBirth: '1993-11-20',
        placeOfBirth: 'Cebu City, Cebu',
        sex: 'Female',
        civilStatus: 'Married',
        height: '1.60',
        weight: '55',
        bloodType: 'A+',
        gsisIdNo: '100234567890',
        pagibigIdNo: '121298765432',
        philhealthNo: '0198765432101',
        sssNo: '3498765432',
        tinNo: '987654321',
        agencyEmployeeNo: 'EMP-2018-0542',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '45-B',
          street: 'Osmeña Boulevard',
          subdivision: 'Capitol Homes',
          barangay: 'Capitol Site',
          city: 'Cebu City',
          province: 'Cebu',
          zipCode: '6000',
        },
        permanentAddress: {
          houseNo: '45-B',
          street: 'Osmeña Boulevard',
          subdivision: 'Capitol Homes',
          barangay: 'Capitol Site',
          city: 'Cebu City',
          province: 'Cebu',
          zipCode: '6000',
        },
        telephoneNo: '',
        mobileNo: '09281234567',
        emailAddress: 'maria.garcia@gmail.com',
        spouseSurname: 'Garcia',
        spouseFirstName: 'Carlos',
        spouseMiddleName: 'Tan',
        spouseNameExtension: '',
        spouseOccupation: 'Seaman',
        spouseEmployerName: 'Maersk Philippines',
        spouseEmployerAddress: 'Cebu Business Park, Cebu City',
        spouseTelephoneNo: '09171112222',
        fatherSurname: 'Fernandez',
        fatherFirstName: 'Ricardo',
        fatherMiddleName: 'Lim',
        fatherNameExtension: '',
        motherMaidenSurname: 'Torres',
        motherFirstName: 'Lourdes',
        motherMiddleName: 'Perez',
        children: [
          { name: 'Sofia Garcia', dateOfBirth: '2020-05-12' },
          { name: 'Carlos Garcia Jr.', dateOfBirth: '2022-09-03' },
        ],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Cebu City Central Elementary School',
            degree: 'Elementary Education',
            period: { from: '1999', to: '2005' },
            units: '',
            yearGraduated: '2005',
            honors: '',
          },
          {
            level: 'Secondary',
            schoolName: 'University of San Carlos - Basic Education',
            degree: 'Secondary Education',
            period: { from: '2005', to: '2009' },
            units: '',
            yearGraduated: '2009',
            honors: '',
          },
          {
            level: 'College',
            schoolName: 'University of San Carlos',
            degree: 'Bachelor of Science in Nursing',
            period: { from: '2009', to: '2013' },
            units: '',
            yearGraduated: '2013',
            honors: '',
          },
        ],
        eligibilities: [
          {
            name: 'RA 1080 (Registered Nurse)',
            rating: '82.40',
            dateOfExam: '2013-11-24',
            placeOfExam: 'Cebu City',
            licenseNo: 'RN-0456789',
            licenseValidity: '2027-07-15',
          },
          {
            name: 'Career Service Professional',
            rating: '80.15',
            dateOfExam: '2014-08-10',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2018-06-01', to: '2025-12-31' },
            positionTitle: 'Nurse I',
            department: 'City of Cebu - City Health Office',
            monthlySalary: '30024',
            salaryGrade: 'SG-11 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
          },
          {
            period: { from: '2014-03-01', to: '2018-05-31' },
            positionTitle: 'Staff Nurse',
            department: 'Cebu Doctors University Hospital',
            monthlySalary: '22000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
          },
        ],
        voluntaryWork: [
          {
            organization: 'Philippine Red Cross - Cebu Chapter',
            period: { from: '2015-06-01', to: '2015-12-31' },
            numberOfHours: '200',
            position: 'Volunteer Nurse',
          },
        ],
        learningDevelopment: [
          {
            title: 'Basic Life Support and Advanced Cardiac Life Support',
            period: { from: '2019-02-11', to: '2019-02-13' },
            numberOfHours: '24',
            type: 'Technical',
            conductor: 'Philippine Heart Association',
          },
          {
            title: 'Community Health Nursing Seminar',
            period: { from: '2020-10-05', to: '2020-10-09' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Department of Health Region VII',
          },
          {
            title: 'Gender and Development Training',
            period: { from: '2023-03-08', to: '2023-03-09' },
            numberOfHours: '16',
            type: 'Foundation',
            conductor: 'Philippine Commission on Women',
          },
        ],
        specialSkills: ['Patient Assessment', 'IV Therapy', 'Health Education', 'Community Organizing'],
        nonAcademicDistinctions: ['Outstanding Nurse Award 2022 - City of Cebu'],
        membershipInAssociations: ['Philippine Nurses Association', 'Cebu City Government Employees Association'],
        references: [
          { name: 'Dr. Rosario Tan', address: 'Cebu City Health Office, Cebu City', telephoneNo: '09171115555' },
          { name: 'Prof. Linda Velasco', address: 'USC College of Nursing, Cebu City', telephoneNo: '09181116666' },
          { name: 'Ms. Patricia Lim', address: 'Cebu Doctors University Hospital, Cebu City', telephoneNo: '09191117777' },
        ],
      },
    },
  });

  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant2.id,
      data: {
        entries: [
          {
            duration: "June 1, 2018 – December 31, 2025",
            position: "Nurse I",
            officeUnit: "City Health Office",
            immediateSupervisor: '',
            agencyAndLocation: "City of Cebu",
            accomplishments: [],
            summaryOfDuties: "Provide nursing care to patients in barangay health stations; Conduct health assessments and screenings; Implement immunization programs; Prepare and submit monthly health reports.",
          },
          {
            duration: "March 1, 2014 – May 31, 2018",
            position: "Staff Nurse",
            officeUnit: "Cebu Doctors University Hospital",
            immediateSupervisor: '',
            agencyAndLocation: "Cebu Doctors University Hospital",
            accomplishments: [],
            summaryOfDuties: "Provide direct patient care in the medical-surgical ward; Administer medications and IV therapy; Monitor patient vital signs and document observations.",
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Maria Garcia');

  const applicant3 = await prisma.user.create({
    data: {
      email: 'roberto.santos@gmail.com',
      username: 'robertosantos',
      password: applicantPassword,
      firstName: 'Roberto',
      lastName: 'Santos',
      role: 'APPLICANT',
    },
  });

  await prisma.personalDataSheet.create({
    data: {
      userId: applicant3.id,
      data: {
        surname: 'Santos',
        firstName: 'Roberto',
        middleName: 'Mendoza',
        nameExtension: 'Jr.',
        dateOfBirth: '1990-02-28',
        placeOfBirth: 'Mandaue City, Cebu',
        sex: 'Male',
        civilStatus: 'Married',
        height: '1.75',
        weight: '78',
        bloodType: 'B+',
        gsisIdNo: '100345678901',
        pagibigIdNo: '121345678901',
        philhealthNo: '0134567890123',
        sssNo: '3445678901',
        tinNo: '345678901',
        agencyEmployeeNo: 'EMP-2015-0231',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '78',
          street: 'A.C. Cortes Avenue',
          subdivision: 'North Reclamation',
          barangay: 'Subangdaku',
          city: 'Mandaue City',
          province: 'Cebu',
          zipCode: '6014',
        },
        permanentAddress: {
          houseNo: '78',
          street: 'A.C. Cortes Avenue',
          subdivision: 'North Reclamation',
          barangay: 'Subangdaku',
          city: 'Mandaue City',
          province: 'Cebu',
          zipCode: '6014',
        },
        telephoneNo: '(032) 346-5678',
        mobileNo: '09351234567',
        emailAddress: 'roberto.santos@gmail.com',
        spouseSurname: 'Santos',
        spouseFirstName: 'Ana',
        spouseMiddleName: 'Cruz',
        spouseNameExtension: '',
        spouseOccupation: 'Teacher',
        spouseEmployerName: 'Mandaue City Central School',
        spouseEmployerAddress: 'Mandaue City, Cebu',
        spouseTelephoneNo: '09171119999',
        fatherSurname: 'Santos',
        fatherFirstName: 'Roberto',
        fatherMiddleName: 'Aquino',
        fatherNameExtension: 'Sr.',
        motherMaidenSurname: 'Mendoza',
        motherFirstName: 'Carmen',
        motherMiddleName: 'Villanueva',
        children: [
          { name: 'Roberto Santos III', dateOfBirth: '2018-03-21' },
          { name: 'Angela Santos', dateOfBirth: '2020-11-15' },
          { name: 'Miguel Santos', dateOfBirth: '2023-01-08' },
        ],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Mandaue City Central School',
            degree: 'Elementary Education',
            period: { from: '1996', to: '2002' },
            units: '',
            yearGraduated: '2002',
            honors: '',
          },
          {
            level: 'Secondary',
            schoolName: 'Mandaue City Science High School',
            degree: 'Secondary Education',
            period: { from: '2002', to: '2006' },
            units: '',
            yearGraduated: '2006',
            honors: 'Salutatorian',
          },
          {
            level: 'College',
            schoolName: 'Cebu Institute of Technology - University',
            degree: 'Bachelor of Science in Civil Engineering',
            period: { from: '2006', to: '2011' },
            units: '',
            yearGraduated: '2011',
            honors: '',
          },
        ],
        eligibilities: [
          {
            name: 'RA 1080 (Registered Civil Engineer)',
            rating: '78.50',
            dateOfExam: '2011-11-26',
            placeOfExam: 'Cebu City',
            licenseNo: 'CE-0098765',
            licenseValidity: '2027-06-30',
          },
          {
            name: 'Career Service Professional',
            rating: '85.10',
            dateOfExam: '2012-04-15',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2015-09-01', to: '2025-12-31' },
            positionTitle: 'Engineer I',
            department: 'City of Mandaue - Engineering Office',
            monthlySalary: '32245',
            salaryGrade: 'SG-12 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
          },
          {
            period: { from: '2012-04-01', to: '2015-08-31' },
            positionTitle: 'Junior Civil Engineer',
            department: 'DPWH Region VII - District Engineering Office',
            monthlySalary: '25586',
            salaryGrade: 'SG-10 Step 1',
            statusOfAppointment: 'Contractual',
            isGovernmentService: true,
          },
        ],
        voluntaryWork: [
          {
            organization: 'Habitat for Humanity - Cebu Chapter',
            period: { from: '2013-11-01', to: '2014-02-28' },
            numberOfHours: '160',
            position: 'Volunteer Engineer (Yolanda Rehabilitation)',
          },
        ],
        learningDevelopment: [
          {
            title: 'Project Management for Government Engineers',
            period: { from: '2017-05-08', to: '2017-05-12' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'DPWH - Bureau of Construction',
          },
          {
            title: 'Structural Design and Analysis Training',
            period: { from: '2019-09-16', to: '2019-09-20' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Philippine Institute of Civil Engineers',
          },
          {
            title: 'Supervisory Development Course',
            period: { from: '2022-01-17', to: '2022-01-21' },
            numberOfHours: '40',
            type: 'Supervisory',
            conductor: 'Civil Service Commission - Region VII',
          },
          {
            title: 'AutoCAD and BIM Training',
            period: { from: '2023-06-12', to: '2023-06-16' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Autodesk Philippines',
          },
        ],
        specialSkills: ['AutoCAD', 'Structural Analysis (STAAD Pro)', 'Project Cost Estimation', 'GIS Mapping', 'MS Project'],
        nonAcademicDistinctions: ['Outstanding Government Engineer 2021 - PICE Cebu Chapter', 'Best Infrastructure Project 2023 - DILG Region VII'],
        membershipInAssociations: ['Philippine Institute of Civil Engineers (PICE)', 'Mandaue City Government Employees Association'],
        references: [
          { name: 'Engr. Vicente Rama', address: 'Mandaue City Engineering Office, Mandaue City', telephoneNo: '09171118888' },
          { name: 'Engr. Antonio Cruz', address: 'DPWH Region VII, Cebu City', telephoneNo: '09181119999' },
          { name: 'Dr. Jose Reyes', address: 'CIT-U College of Engineering, Cebu City', telephoneNo: '09191110000' },
        ],
      },
    },
  });

  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant3.id,
      data: {
        entries: [
          {
            duration: "September 1, 2015 – December 31, 2025",
            position: "Engineer I",
            officeUnit: "Engineering Office",
            immediateSupervisor: '',
            agencyAndLocation: "City of Mandaue",
            accomplishments: [],
            summaryOfDuties: "Design and prepare engineering plans for infrastructure projects; Conduct site inspections and construction supervision; Prepare detailed cost estimates and bill of materials; Review building permit applications for structural compliance; Coordinate with contractors and project stakeholders.",
          },
          {
            duration: "April 1, 2012 – August 31, 2015",
            position: "Junior Civil Engineer",
            officeUnit: "District Engineering Office",
            immediateSupervisor: '',
            agencyAndLocation: "DPWH Region VII",
            accomplishments: [],
            summaryOfDuties: "Assist in the design and planning of national road projects; Conduct field surveys and soil investigations; Monitor construction progress and quality control.",
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Roberto Santos Jr.');

  const applicant4 = await prisma.user.create({
    data: {
      email: 'anna.reyes@gmail.com',
      username: 'annareyes',
      password: applicantPassword,
      firstName: 'Anna',
      lastName: 'Reyes',
      role: 'APPLICANT',
    },
  });

  await prisma.personalDataSheet.create({
    data: {
      userId: applicant4.id,
      data: {
        surname: 'Reyes',
        firstName: 'Anna',
        middleName: 'Pascual',
        nameExtension: '',
        dateOfBirth: '1997-08-05',
        placeOfBirth: 'Talisay City, Cebu',
        sex: 'Female',
        civilStatus: 'Single',
        height: '1.58',
        weight: '50',
        bloodType: 'AB+',
        gsisIdNo: '',
        pagibigIdNo: '121456789012',
        philhealthNo: '0145678901234',
        sssNo: '3456789012',
        tinNo: '456789012',
        agencyEmployeeNo: '',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '210',
          street: 'Natalio Bacalso Avenue',
          subdivision: 'Talisay Heights',
          barangay: 'Tabunoc',
          city: 'Talisay City',
          province: 'Cebu',
          zipCode: '6045',
        },
        permanentAddress: {
          houseNo: '210',
          street: 'Natalio Bacalso Avenue',
          subdivision: 'Talisay Heights',
          barangay: 'Tabunoc',
          city: 'Talisay City',
          province: 'Cebu',
          zipCode: '6045',
        },
        telephoneNo: '',
        mobileNo: '09451234567',
        emailAddress: 'anna.reyes@gmail.com',
        spouseSurname: '',
        spouseFirstName: '',
        spouseMiddleName: '',
        spouseNameExtension: '',
        spouseOccupation: '',
        spouseEmployerName: '',
        spouseEmployerAddress: '',
        spouseTelephoneNo: '',
        fatherSurname: 'Reyes',
        fatherFirstName: 'Antonio',
        fatherMiddleName: 'Gomez',
        fatherNameExtension: '',
        motherMaidenSurname: 'Pascual',
        motherFirstName: 'Teresa',
        motherMiddleName: 'Ramos',
        children: [],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Talisay City Central School',
            degree: 'Elementary Education',
            period: { from: '2003', to: '2009' },
            units: '',
            yearGraduated: '2009',
            honors: 'With High Honors',
          },
          {
            level: 'Secondary',
            schoolName: 'Sacred Heart School - Ateneo de Cebu',
            degree: 'Secondary Education',
            period: { from: '2009', to: '2013' },
            units: '',
            yearGraduated: '2013',
            honors: 'First Honorable Mention',
          },
          {
            level: 'College',
            schoolName: 'University of San Jose - Recoletos',
            degree: 'Bachelor of Science in Accountancy',
            period: { from: '2013', to: '2018' },
            units: '',
            yearGraduated: '2018',
            honors: 'Magna Cum Laude',
          },
        ],
        eligibilities: [
          {
            name: 'RA 1080 (CPA)',
            rating: '85.75',
            dateOfExam: '2018-10-07',
            placeOfExam: 'Cebu City',
            licenseNo: 'CPA-0167890',
            licenseValidity: '2027-09-30',
          },
          {
            name: 'Career Service Professional',
            rating: '87.30',
            dateOfExam: '2019-03-17',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2021-01-04', to: '2025-12-31' },
            positionTitle: 'Accountant I',
            department: 'Province of Cebu - Provincial Treasurer\'s Office',
            monthlySalary: '32245',
            salaryGrade: 'SG-12 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
          },
          {
            period: { from: '2019-01-07', to: '2020-12-30' },
            positionTitle: 'Junior Accountant',
            department: 'SGV & Co. (Ernst & Young Philippines)',
            monthlySalary: '25000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
          },
        ],
        voluntaryWork: [
          {
            organization: 'Junior Philippine Institute of Accountants - Cebu Chapter',
            period: { from: '2018-06-01', to: '2018-12-31' },
            numberOfHours: '100',
            position: 'Free Tax Assistance Volunteer',
          },
        ],
        learningDevelopment: [
          {
            title: 'New Government Accounting System (NGAS) Training',
            period: { from: '2021-03-01', to: '2021-03-05' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Commission on Audit - Region VII',
          },
          {
            title: 'Budget Preparation and Execution Workshop',
            period: { from: '2022-06-20', to: '2022-06-24' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Department of Budget and Management',
          },
          {
            title: 'Philippine Financial Reporting Standards Update',
            period: { from: '2024-02-12', to: '2024-02-14' },
            numberOfHours: '24',
            type: 'Technical',
            conductor: 'Philippine Institute of Certified Public Accountants',
          },
        ],
        specialSkills: ['Government Accounting', 'Financial Statement Preparation', 'Tax Computation', 'SAP ERP', 'Advanced Excel'],
        nonAcademicDistinctions: ['Top 8 CPA Board Exam October 2018'],
        membershipInAssociations: ['Philippine Institute of Certified Public Accountants (PICPA)', 'Government Association of Certified Public Accountants (GACPA)'],
        references: [
          { name: 'Ms. Rosalinda Tan', address: 'Provincial Capitol, Cebu City', telephoneNo: '09171112233' },
          { name: 'CPA. Jose Villanueva', address: 'SGV & Co., Cebu Business Park, Cebu City', telephoneNo: '09181113344' },
          { name: 'Prof. Elena Perez', address: 'USJ-R College of Commerce, Cebu City', telephoneNo: '09191114455' },
        ],
      },
    },
  });

  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant4.id,
      data: {
        entries: [
          {
            duration: "January 4, 2021 – December 31, 2025",
            position: "Accountant I",
            officeUnit: "Provincial Treasurer's Office",
            immediateSupervisor: '',
            agencyAndLocation: "Province of Cebu",
            accomplishments: [],
            summaryOfDuties: "Prepare journal entries and financial statements; Process obligation requests and disbursement vouchers; Reconcile subsidiary ledgers with general ledger; Assist in year-end closing and COA audit preparation.",
          },
          {
            duration: "January 7, 2019 – December 30, 2020",
            position: "Junior Accountant",
            officeUnit: "SGV & Co. (Ernst & Young Philippines)",
            immediateSupervisor: '',
            agencyAndLocation: "SGV & Co. (Ernst & Young Philippines)",
            accomplishments: [],
            summaryOfDuties: "Perform audit procedures for financial statement audits; Prepare audit working papers and documentation; Conduct substantive testing and analytical review.",
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Anna Reyes');

  // =============================================
  // ADDITIONAL APPLICANTS — Pedro Villanueva & Elena Marcos
  // =============================================

  const applicant5 = await prisma.user.create({
    data: {
      email: 'pedro.villanueva@gmail.com',
      username: 'pedrovillanueva',
      password: applicantPassword,
      firstName: 'Pedro',
      lastName: 'Villanueva',
      role: 'APPLICANT',
    },
  });

  await prisma.personalDataSheet.create({
    data: {
      userId: applicant5.id,
      data: {
        surname: 'Villanueva',
        firstName: 'Pedro',
        middleName: 'Bautista',
        nameExtension: '',
        dateOfBirth: '1994-04-12',
        placeOfBirth: 'Cebu City, Cebu',
        sex: 'Male',
        civilStatus: 'Single',
        height: '1.70',
        weight: '65',
        bloodType: 'O+',
        gsisIdNo: '100456789012',
        pagibigIdNo: '121567890123',
        philhealthNo: '0156789012345',
        sssNo: '3467890123',
        tinNo: '567890123',
        agencyEmployeeNo: 'EMP-2019-0789',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '88',
          street: 'Mango Avenue',
          subdivision: 'Capitol Village',
          barangay: 'Kamputhaw',
          city: 'Cebu City',
          province: 'Cebu',
          zipCode: '6000',
        },
        permanentAddress: {
          houseNo: '88',
          street: 'Mango Avenue',
          subdivision: 'Capitol Village',
          barangay: 'Kamputhaw',
          city: 'Cebu City',
          province: 'Cebu',
          zipCode: '6000',
        },
        telephoneNo: '',
        mobileNo: '09361234567',
        emailAddress: 'pedro.villanueva@gmail.com',
        spouseSurname: '',
        spouseFirstName: '',
        spouseMiddleName: '',
        spouseNameExtension: '',
        spouseOccupation: '',
        spouseEmployerName: '',
        spouseEmployerAddress: '',
        spouseTelephoneNo: '',
        fatherSurname: 'Villanueva',
        fatherFirstName: 'Manuel',
        fatherMiddleName: 'Cruz',
        fatherNameExtension: '',
        motherMaidenSurname: 'Bautista',
        motherFirstName: 'Rosa',
        motherMiddleName: 'Santos',
        children: [],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Cebu City Central Elementary School',
            degree: 'Elementary Education',
            period: { from: '2000', to: '2006' },
            units: '',
            yearGraduated: '2006',
            honors: '',
          },
          {
            level: 'Secondary',
            schoolName: 'Abellana National School',
            degree: 'Secondary Education',
            period: { from: '2006', to: '2010' },
            units: '',
            yearGraduated: '2010',
            honors: '',
          },
          {
            level: 'College',
            schoolName: 'University of San Carlos',
            degree: 'Bachelor of Science in Public Administration',
            period: { from: '2010', to: '2014' },
            units: '',
            yearGraduated: '2014',
            honors: '',
          },
        ],
        eligibilities: [
          {
            name: 'Career Service Professional',
            rating: '81.50',
            dateOfExam: '2015-04-12',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2019-06-01', to: '2025-12-31' },
            positionTitle: 'Administrative Aide IV',
            department: 'City of Cebu - Engineering Office',
            monthlySalary: '16543',
            salaryGrade: 'SG-4 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
          },
          {
            period: { from: '2015-08-01', to: '2019-05-31' },
            positionTitle: 'Clerk',
            department: 'SM City Cebu - Admin Office',
            monthlySalary: '14000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
          },
        ],
        voluntaryWork: [],
        learningDevelopment: [
          {
            title: 'Basic Records Management',
            period: { from: '2020-02-10', to: '2020-02-14' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'National Archives of the Philippines',
          },
          {
            title: 'Customer Service Excellence',
            period: { from: '2022-09-05', to: '2022-09-07' },
            numberOfHours: '24',
            type: 'Foundation',
            conductor: 'Civil Service Commission - Region VII',
          },
        ],
        specialSkills: ['Records Management', 'MS Office', 'Data Entry', 'Filing Systems'],
        nonAcademicDistinctions: [],
        membershipInAssociations: ['Cebu City Government Employees Association'],
        references: [
          { name: 'Engr. Carlo Mendoza', address: 'Cebu City Engineering Office', telephoneNo: '09171234500' },
          { name: 'Ms. Linda Torres', address: 'SM City Cebu, Cebu City', telephoneNo: '09181234600' },
          { name: 'Prof. Ramon Cruz', address: 'USC Dept of Public Administration, Cebu City', telephoneNo: '09191234700' },
        ],
      },
    },
  });

  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant5.id,
      data: {
        entries: [
          {
            duration: "June 1, 2019 – December 31, 2025",
            position: "Administrative Aide IV",
            officeUnit: "Engineering Office",
            immediateSupervisor: '',
            agencyAndLocation: "City of Cebu",
            accomplishments: [],
            summaryOfDuties: "Process incoming and outgoing correspondence; Maintain office filing system and records; Assist in preparation of office reports; Coordinate with other departments for document routing.",
          },
          {
            duration: "August 1, 2015 – May 31, 2019",
            position: "Clerk",
            officeUnit: "Admin Office",
            immediateSupervisor: '',
            agencyAndLocation: "SM City Cebu",
            accomplishments: [],
            summaryOfDuties: "Handle administrative paperwork and correspondence; Manage office supplies inventory; Assist in scheduling and calendar management.",
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Pedro Villanueva');

  const applicant6 = await prisma.user.create({
    data: {
      email: 'elena.marcos@gmail.com',
      username: 'elenamarcos',
      password: applicantPassword,
      firstName: 'Elena',
      lastName: 'Marcos',
      role: 'APPLICANT',
    },
  });

  await prisma.personalDataSheet.create({
    data: {
      userId: applicant6.id,
      data: {
        surname: 'Marcos',
        firstName: 'Elena',
        middleName: 'Gutierrez',
        nameExtension: '',
        dateOfBirth: '1998-12-03',
        placeOfBirth: 'Minglanilla, Cebu',
        sex: 'Female',
        civilStatus: 'Single',
        height: '1.62',
        weight: '52',
        bloodType: 'B+',
        gsisIdNo: '',
        pagibigIdNo: '121678901234',
        philhealthNo: '0167890123456',
        sssNo: '3478901234',
        tinNo: '678901234',
        agencyEmployeeNo: '',
        citizenship: 'Filipino',
        citizenshipType: 'by birth',
        citizenshipCountry: 'Philippines',
        residentialAddress: {
          houseNo: '15',
          street: 'Ward IV',
          subdivision: 'Poblacion',
          barangay: 'Poblacion',
          city: 'Minglanilla',
          province: 'Cebu',
          zipCode: '6046',
        },
        permanentAddress: {
          houseNo: '15',
          street: 'Ward IV',
          subdivision: 'Poblacion',
          barangay: 'Poblacion',
          city: 'Minglanilla',
          province: 'Cebu',
          zipCode: '6046',
        },
        telephoneNo: '',
        mobileNo: '09471234567',
        emailAddress: 'elena.marcos@gmail.com',
        spouseSurname: '',
        spouseFirstName: '',
        spouseMiddleName: '',
        spouseNameExtension: '',
        spouseOccupation: '',
        spouseEmployerName: '',
        spouseEmployerAddress: '',
        spouseTelephoneNo: '',
        fatherSurname: 'Marcos',
        fatherFirstName: 'Daniel',
        fatherMiddleName: 'Ramos',
        fatherNameExtension: '',
        motherMaidenSurname: 'Gutierrez',
        motherFirstName: 'Lilia',
        motherMiddleName: 'Tan',
        children: [],
        education: [
          {
            level: 'Elementary',
            schoolName: 'Minglanilla Central Elementary School',
            degree: 'Elementary Education',
            period: { from: '2004', to: '2010' },
            units: '',
            yearGraduated: '2010',
            honors: 'With Honors',
          },
          {
            level: 'Secondary',
            schoolName: 'Minglanilla Science High School',
            degree: 'Secondary Education',
            period: { from: '2010', to: '2014' },
            units: '',
            yearGraduated: '2014',
            honors: '',
          },
          {
            level: 'College',
            schoolName: 'Cebu Normal University',
            degree: 'Bachelor of Arts in Political Science',
            period: { from: '2014', to: '2018' },
            units: '',
            yearGraduated: '2018',
            honors: '',
          },
        ],
        eligibilities: [
          {
            name: 'Career Service Professional',
            rating: '79.80',
            dateOfExam: '2019-08-11',
            placeOfExam: 'Cebu City',
            licenseNo: '',
            licenseValidity: '',
          },
        ],
        workExperience: [
          {
            period: { from: '2020-02-01', to: '2025-12-31' },
            positionTitle: 'Administrative Assistant II',
            department: 'Municipality of Minglanilla - Mayor\'s Office',
            monthlySalary: '18018',
            salaryGrade: 'SG-8 Step 1',
            statusOfAppointment: 'Contractual',
            isGovernmentService: true,
          },
          {
            period: { from: '2019-03-01', to: '2020-01-31' },
            positionTitle: 'Office Staff',
            department: 'BPO Solutions Inc.',
            monthlySalary: '16000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
          },
        ],
        voluntaryWork: [
          {
            organization: 'Sangguniang Kabataan - Minglanilla',
            period: { from: '2017-01-01', to: '2017-12-31' },
            numberOfHours: '200',
            position: 'SK Secretary',
          },
        ],
        learningDevelopment: [
          {
            title: 'Government Procurement Reform Act Training',
            period: { from: '2021-07-12', to: '2021-07-16' },
            numberOfHours: '40',
            type: 'Technical',
            conductor: 'Government Procurement Policy Board',
          },
          {
            title: 'Basic Public Speaking and Communication',
            period: { from: '2023-05-08', to: '2023-05-09' },
            numberOfHours: '16',
            type: 'Foundation',
            conductor: 'Civil Service Commission - Region VII',
          },
        ],
        specialSkills: ['Document Processing', 'Public Speaking', 'Event Organization', 'Social Media Management'],
        nonAcademicDistinctions: ['Best SK Project 2017 - Municipality of Minglanilla'],
        membershipInAssociations: ['Young Public Servants Alliance'],
        references: [
          { name: 'Hon. Elanor Reyes', address: 'Municipal Hall, Minglanilla, Cebu', telephoneNo: '09171230001' },
          { name: 'Prof. Maria Santos', address: 'Cebu Normal University, Cebu City', telephoneNo: '09181230002' },
          { name: 'Mr. James Lim', address: 'BPO Solutions Inc., IT Park, Cebu City', telephoneNo: '09191230003' },
        ],
      },
    },
  });

  await prisma.workExperienceSheet.create({
    data: {
      userId: applicant6.id,
      data: {
        entries: [
          {
            duration: "February 1, 2020 – December 31, 2025",
            position: "Administrative Assistant II",
            officeUnit: "Mayor's Office",
            immediateSupervisor: '',
            agencyAndLocation: "Municipality of Minglanilla",
            accomplishments: [],
            summaryOfDuties: "Draft official correspondence and memoranda; Manage the Mayor's calendar and appointments; Coordinate with department heads on administrative matters; Prepare reports and presentations for meetings.",
          },
          {
            duration: "March 1, 2019 – January 31, 2020",
            position: "Office Staff",
            officeUnit: "BPO Solutions Inc.",
            immediateSupervisor: '',
            agencyAndLocation: "BPO Solutions Inc.",
            accomplishments: [],
            summaryOfDuties: "Handle customer inquiries and complaints; Process documentation and data entry; Coordinate with team leads on daily operations.",
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Elena Marcos');


  // =============================================
  // LAPU-LAPU CITY — Full RSP Pipeline
  // =============================================


  // ---- Comparative assessment helper (dynamic factor template) ----
  // Mirrors server/src/config/assessmentDefaults.ts. Each position gets its own snapshot of the
  // template; ratings are percentages (0-100) keyed by factor label.
  const ASSESSMENT_TEMPLATE = [
    { code: 'I', label: null as string | null, points: 25, factors: [{ label: 'PERFORMANCE', maxWeight: 1 }] },
    {
      code: 'II', label: 'ETE' as string | null, points: 40,
      factors: [
        { label: 'EDUCATION', maxWeight: 0.35 },
        { label: 'Relevant TRAINING', maxWeight: 0.3 },
        { label: 'Relevant EXPERIENCE', maxWeight: 0.35 },
      ],
    },
    { code: 'III', label: null as string | null, points: 30, factors: [{ label: 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL', maxWeight: 1 }] },
    { code: 'IV', label: null as string | null, points: 5, factors: [{ label: 'OUTSTANDING ACCOMPLISHMENTS', maxWeight: 1 }] },
  ];

  const templateCache = new Map<number, { id: number; points: number; factors: { id: number; label: string; maxWeight: number }[] }[]>();

  async function ensureAssessmentTemplate(positionId: number, lguId: number) {
    const cached = templateCache.get(positionId);
    if (cached) return cached;
    const groups = [];
    for (const [i, g] of ASSESSMENT_TEMPLATE.entries()) {
      const created = await prisma.assessmentGroup.create({
        data: {
          lguId, positionId, code: g.code, label: g.label, points: g.points, sortOrder: i,
          factors: { create: g.factors.map((f, fi) => ({ label: f.label, maxWeight: f.maxWeight, sortOrder: fi })) },
        },
        include: { factors: true },
      });
      groups.push({
        id: created.id,
        points: Number(created.points),
        factors: created.factors.map((f) => ({ id: f.id, label: f.label, maxWeight: Number(f.maxWeight) })),
      });
    }
    templateCache.set(positionId, groups);
    return groups;
  }

  async function makeAssessment(opts: {
    applicationId: number; positionId: number; lguId: number;
    ratings: Record<string, number>; remarks: string; scoredBy: number;
  }) {
    const groups = await ensureAssessmentTemplate(opts.positionId, opts.lguId);
    const factorScores: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      let subtotal = 0;
      for (const f of g.factors) {
        const rating = opts.ratings[f.label] ?? 0;
        factorScores[String(f.id)] = rating;
        subtotal += f.maxWeight * (rating / 100);
      }
      total += subtotal * g.points;
    }
    return prisma.assessmentScore.create({
      data: {
        applicationId: opts.applicationId,
        positionId: opts.positionId,
        factorScores,
        totalScore: Number(total.toFixed(2)),
        remarks: opts.remarks,
        scoredBy: opts.scoredBy,
      },
    });
  }

  console.log('\n--- Seeding Lapu-Lapu City Pipeline ---');

  // Fetch departments
  const llEngDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Engineering Office' } });
  const llTreasuryDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Treasury Office' } });
  const llTourismDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Tourism Office' } });
  const llHealthDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Health Office' } });
  const llHrDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Human Resource Office' } });

  // Create Tourism Office Admin
  const llTourismAdmin = await prisma.user.create({
    data: {
      email: 'tourism@lapulapucity.gov.ph',
      username: 'lapulaputourism',
      password: await bcrypt.hash('office123', 12),
      firstName: 'Tourism',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      moduleAccess: ['RSP'],
      lguId: lapulapu.id,
      departmentId: llTourismDept?.id,
    },
  });
  console.log('Created Lapu-Lapu Tourism Office Admin');

  // --- CSC Publication Batches ---
  const llBatch1 = await prisma.publication.create({
    data: {
      publicationNumber: '2026-001',
      description: 'First quarter publication — Engineering, Tourism, and Treasury positions',
      openDate: new Date('2026-02-01'),
      closeDate: new Date('2026-02-16'),
      isPublished: true,
      publishedAt: new Date('2026-02-01'),
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  const llBatch2 = await prisma.publication.create({
    data: {
      publicationNumber: '2026-002',
      description: 'Second quarter publication — Health and HR positions',
      openDate: new Date('2026-03-15'),
      closeDate: new Date('2026-03-30'),
      isPublished: true,
      publishedAt: new Date('2026-03-15'),
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  const llBatch3 = await prisma.publication.create({
    data: {
      publicationNumber: '2026-003',
      description: 'Third quarter publication — Public safety, social services, and IT positions',
      openDate: new Date('2026-04-01'),
      closeDate: new Date('2026-04-16'),
      isPublished: true,
      publishedAt: new Date('2026-04-01'),
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  const llBatch4 = await prisma.publication.create({
    data: {
      publicationNumber: '2026-004',
      description: 'Fourth quarter publication — Environment and administrative support',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      isPublished: true,
      publishedAt: new Date('2026-05-01'),
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  console.log('Created 4 Lapu-Lapu CSC Batches (all published)');

  // --- Document Requirements Template ---
  const llDocReqs = [
    { label: 'Letter of Intent', description: 'Addressed to the City Mayor, indicating Position Title and Plantilla Item No.', isRequired: true, sortOrder: 1 },
    { label: 'Personal Data Sheet (CS Form 212, Revised 2025)', description: 'Fully accomplished PDS with Work Experience Sheet and recent passport-sized photo — single PDF', isRequired: true, sortOrder: 2 },
    { label: 'Performance Rating', description: 'Performance rating in the last rating period (if applicable)', isRequired: false, sortOrder: 3 },
    { label: 'Certificate of Eligibility/Rating/License', description: 'Authenticated copy of civil service eligibility or professional license', isRequired: true, sortOrder: 4 },
    { label: 'Transcript of Records', description: 'Official transcript of records from the school last attended', isRequired: true, sortOrder: 5 },
    { label: 'Training Certificates', description: 'All training certificates compiled in a single PDF (for positions with training requirements)', isRequired: false, sortOrder: 6 },
    { label: 'Designation Orders', description: 'Designation orders (if applicable)', isRequired: false, sortOrder: 7 },
  ];

  // --- Positions ---

  // Position 1: Civil Engineer III (Engineering, 2 slots, OPEN — Batch 1)
  const llPos1 = await makePosition({
    data: {
      title: 'Civil Engineer III',
      itemNumber: 'LLC-CE3-01-2026',
      salaryGrade: 19,
      monthlySalary: 54461,
      education: "Bachelor's degree in Civil Engineering",
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'RA 1080 (Registered Civil Engineer)',
      competency: 'Structural design, project management, construction supervision, AutoCAD proficiency',
      placeOfAssignment: 'Engineering Office, Lapu-Lapu City Hall',
      description: 'Responsible for the design, planning, and supervision of infrastructure projects including roads, bridges, and government buildings in the city.',
      status: 'OPEN',
      openDate: new Date('2026-02-01'),
      closeDate: new Date('2026-02-16'),
      slots: 2,
      lguId: lapulapu.id,
      departmentId: llEngDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch1.id,
    },
  }, llDocReqs);

  // Position 2: Tourism Operations Officer III (Tourism, 1 slot, OPEN — Batch 1)
  const llPos2 = await makePosition({
    data: {
      title: 'Tourism Operations Officer III',
      itemNumber: 'LLC-TOO3-02-2026',
      salaryGrade: 18,
      monthlySalary: 51357,
      education: "Bachelor's degree in Tourism Management, Hospitality, or related field",
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Tourism planning, event management, stakeholder coordination, marketing and promotions',
      placeOfAssignment: 'Tourism Office, Lapu-Lapu City Hall',
      description: 'Manages tourism programs and events for Lapu-Lapu City, coordinates with resort operators and DOT, and promotes Mactan Island as a premier tourist destination.',
      status: 'OPEN',
      openDate: new Date('2026-02-01'),
      closeDate: new Date('2026-02-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llTourismDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch1.id,
    },
  }, llDocReqs);

  // Position 3: Revenue Collection Officer II (Treasury, 1 slot, FILLED — Batch 1)
  const llPos3 = await makePosition({
    data: {
      title: 'Revenue Collection Officer II',
      itemNumber: 'LLC-RCO2-03-2026',
      salaryGrade: 15,
      monthlySalary: 42159,
      education: "Bachelor's degree in Accountancy, Business Administration, or related field",
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Revenue collection, financial reconciliation, taxpayer services, government accounting',
      placeOfAssignment: 'Treasury Office, Lapu-Lapu City Hall',
      description: 'Handles revenue collection operations, real property tax assessment verification, and taxpayer account reconciliation for the City Treasury.',
      status: 'FILLED',
      openDate: new Date('2026-02-01'),
      closeDate: new Date('2026-02-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llTreasuryDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch1.id,
    },
  }, llDocReqs);

  // Position 4: Nurse II (Health, 1 slot, OPEN — Batch 2)
  const llPos4 = await makePosition({
    data: {
      title: 'Nurse II',
      itemNumber: 'LLC-NRS2-04-2026',
      salaryGrade: 15,
      monthlySalary: 42159,
      education: 'Bachelor of Science in Nursing',
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'RA 1080 (Registered Nurse)',
      competency: 'Patient care, community health nursing, immunization, health education',
      placeOfAssignment: 'City Health Office, Lapu-Lapu City',
      description: 'Provides nursing care services at the City Health Office, implements community health programs, and supports immunization and maternal health initiatives.',
      status: 'OPEN',
      openDate: new Date('2026-03-15'),
      closeDate: new Date('2026-03-30'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llHealthDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch2.id,
    },
  }, llDocReqs);

  // Position 5: Administrative Officer III (HR, 1 slot, OPEN — Batch 2)
  const llPos5 = await makePosition({
    data: {
      title: 'Administrative Officer III',
      itemNumber: 'LLC-AO3-05-2026',
      salaryGrade: 14,
      monthlySalary: 39672,
      education: "Bachelor's degree relevant to the job",
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Office administration, records management, personnel coordination, document processing',
      placeOfAssignment: 'Human Resource Office, Lapu-Lapu City Hall',
      description: 'Provides administrative support to the HR Office including personnel records management, leave administration, and employee documentation.',
      status: 'OPEN',
      openDate: new Date('2026-03-15'),
      closeDate: new Date('2026-03-30'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llHrDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch2.id,
    },
  }, llDocReqs);

  // Position 6: Fire Marshal I (Engineering, 1 slot, OPEN — Batch 3)
  const llPos6 = await makePosition({
    data: {
      title: 'Fire Marshal I',
      itemNumber: 'LLC-FM1-06-2026',
      salaryGrade: 14,
      monthlySalary: 39672,
      education: "Bachelor's degree in Criminology, Fire Technology, or related field",
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Fire prevention, fire investigation, building code enforcement, emergency response',
      placeOfAssignment: 'City Fire Station, Lapu-Lapu City',
      description: 'Conducts fire safety inspections, issues fire safety evaluation clearances, and investigates fire incidents within the city jurisdiction.',
      status: 'OPEN',
      openDate: new Date('2026-04-01'),
      closeDate: new Date('2026-04-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llEngDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch3.id,
    },
  }, llDocReqs);

  // Position 7: Social Welfare Officer II (Tourism repurposed as social, 1 slot, OPEN — Batch 3)
  const llPos7 = await makePosition({
    data: {
      title: 'Social Welfare Officer II',
      itemNumber: 'LLC-SWO2-07-2026',
      salaryGrade: 15,
      monthlySalary: 42159,
      education: 'Bachelor of Science in Social Work',
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'RA 1080 (Registered Social Worker)',
      competency: 'Social case management, community development, counseling, disaster response coordination',
      placeOfAssignment: 'City Social Welfare Office, Lapu-Lapu City',
      description: 'Provides social welfare services for vulnerable populations including PWDs, solo parents, senior citizens, and disaster-affected families in the city.',
      status: 'OPEN',
      openDate: new Date('2026-04-01'),
      closeDate: new Date('2026-04-16'),
      slots: 2,
      lguId: lapulapu.id,
      departmentId: llTourismDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch3.id,
    },
  }, llDocReqs);

  // Position 8: Information Technology Officer I (HR/IT, 1 slot, OPEN — Batch 3)
  const llPos8 = await makePosition({
    data: {
      title: 'Information Technology Officer I',
      itemNumber: 'LLC-ITO1-08-2026',
      salaryGrade: 19,
      monthlySalary: 54461,
      education: 'Bachelor of Science in Information Technology, Computer Science, or related field',
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'IT infrastructure management, systems administration, cybersecurity, database management, web development',
      placeOfAssignment: 'Human Resource Office (IT Unit), Lapu-Lapu City Hall',
      description: 'Manages the IT infrastructure and information systems of the city government. Oversees network administration, cybersecurity, database management, and provides technical support to all departments.',
      status: 'OPEN',
      openDate: new Date('2026-04-01'),
      closeDate: new Date('2026-04-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llHrDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch3.id,
    },
  }, llDocReqs);

  // Position 9: Environmental Management Specialist II (Engineering, 1 slot, OPEN — Batch 4)
  const llPos9 = await makePosition({
    data: {
      title: 'Environmental Management Specialist II',
      itemNumber: 'LLC-EMS2-09-2026',
      salaryGrade: 16,
      monthlySalary: 45203,
      education: "Bachelor's degree in Environmental Science, Marine Biology, or related field",
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Environmental impact assessment, coastal zone management, solid waste management, regulatory compliance',
      placeOfAssignment: 'City Environment and Natural Resources Office, Lapu-Lapu City',
      description: 'Implements environmental programs including coastal resource management, solid waste reduction, environmental compliance monitoring, and marine sanctuary protection for Mactan Island.',
      status: 'OPEN',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llEngDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch4.id,
    },
  }, llDocReqs);

  // Position 10: Administrative Aide VI (Treasury, 2 slots, OPEN — Batch 4)
  const llPos10 = await makePosition({
    data: {
      title: 'Administrative Aide VI',
      itemNumber: 'LLC-AA6-10-2026',
      salaryGrade: 6,
      monthlySalary: 18957,
      education: 'Completion of two-year studies in college or high school graduate with relevant vocational/trade course',
      training: 'None required',
      experience: 'None required',
      eligibility: 'Career Service Sub-Professional / First Level Eligibility',
      competency: 'Clerical work, document filing, data encoding, basic computer operations',
      placeOfAssignment: 'Treasury Office, Lapu-Lapu City Hall',
      description: 'Performs clerical and administrative support functions in the City Treasury Office including document processing, record-keeping, and customer service at the collections window.',
      status: 'OPEN',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      slots: 2,
      lguId: lapulapu.id,
      departmentId: llTreasuryDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch4.id,
    },
  }, llDocReqs);

  // Position 11: Tourism Promotion Officer I (Tourism, 1 slot, OPEN — Batch 4)
  const llPos11 = await makePosition({
    data: {
      title: 'Tourism Promotion Officer I',
      itemNumber: 'LLC-TPO1-11-2026',
      salaryGrade: 13,
      monthlySalary: 37453,
      education: "Bachelor's degree in Tourism, Marketing, Communications, or related field",
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Destination marketing, event coordination, social media management, stakeholder relations, content creation',
      placeOfAssignment: 'Tourism Office, Lapu-Lapu City Hall',
      description: 'Promotes Lapu-Lapu City and Mactan Island as premier tourism destinations. Coordinates with resort operators, manages digital marketing campaigns, and organizes cultural and tourism events.',
      status: 'OPEN',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llTourismDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch4.id,
    },
  }, llDocReqs);

  // Position 12: Driver I (Engineering, 1 slot, OPEN — Batch 4)
  const llPos12 = await makePosition({
    data: {
      title: 'Driver I',
      itemNumber: 'LLC-DRV1-12-2026',
      salaryGrade: 4,
      monthlySalary: 17006,
      education: 'Elementary school graduate',
      training: 'None required',
      experience: 'None required',
      eligibility: 'MC 10, s. 2013 — Cat. IV (Driver)',
      competency: 'Driving (light and heavy vehicles), vehicle maintenance, defensive driving, route planning',
      placeOfAssignment: 'Engineering Office — Motor Pool, Lapu-Lapu City Hall',
      description: 'Drives light and heavy motor vehicles for official trips, delivers supplies and equipment, performs basic vehicle maintenance checks, and maintains trip logs.',
      status: 'OPEN',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      slots: 1,
      lguId: lapulapu.id,
      departmentId: llEngDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch4.id,
    },
  }, llDocReqs);

  // Position 13: Utility Worker I (Engineering, 2 slots, OPEN — Batch 4)
  const llPos13 = await makePosition({
    data: {
      title: 'Utility Worker I',
      itemNumber: 'LLC-UW1-13-2026',
      salaryGrade: 1,
      monthlySalary: 13000,
      education: 'Must be able to read and write',
      training: 'None required',
      experience: 'None required',
      eligibility: 'None required (MC 10, s. 2013 — Cat. III)',
      competency: 'General maintenance, janitorial services, grounds keeping, manual labor',
      placeOfAssignment: 'Engineering Office — General Services, Lapu-Lapu City Hall',
      description: 'Performs janitorial, maintenance, and general utility services for city government buildings and facilities. Includes grounds keeping, minor repairs, and errand services.',
      status: 'OPEN',
      openDate: new Date('2026-05-01'),
      closeDate: new Date('2026-05-16'),
      slots: 2,
      lguId: lapulapu.id,
      departmentId: llEngDept?.id,
      createdBy: llHrAdmin.id,
      cscBatchId: llBatch4.id,
    },
  }, llDocReqs);

  console.log('Created 13 positions for Lapu-Lapu');

  // =============================================
  // LAPU-LAPU APPLICATIONS — Full Pipeline Demo
  // =============================================
  //
  // Position 1 (Civil Engineer III, Engineering, 2 slots):
  //   Juan → APPOINTED | Roberto → SELECTED | Anna → QUALIFIED
  //   Pedro → SHORTLISTED | Elena → ENDORSED
  //
  // Position 2 (Tourism Ops Officer III, Tourism, 1 slot):
  //   Maria → APPOINTED (position still OPEN — 1 slot remains... but we keep it OPEN)
  //   Wait — Tourism has 1 slot, so if Maria is appointed it would be FILLED. Let's adjust.
  //   Maria → INTERVIEWED (awaiting qualification)
  //   Anna → FOR_INTERVIEW
  //
  // Position 3 (Revenue Collection Officer II, Treasury, 1 slot, FILLED):
  //   Pedro → APPOINTED
  //

  // --- Position 1 (Civil Engineer III) Applications ---
  const llApp1Juan = await prisma.application.create({
    data: {
      positionId: llPos1.id,
      applicantId: applicant.id,  // Juan
      status: 'APPOINTED',
      submittedAt: new Date('2026-02-02T09:00:00'),
      notes: 'Top scorer — appointed to 1st vacancy slot',
    },
  });

  const llApp1Roberto = await prisma.application.create({
    data: {
      positionId: llPos1.id,
      applicantId: applicant3.id,  // Roberto
      status: 'SELECTED',
      submittedAt: new Date('2026-02-03T10:30:00'),
      notes: 'Second highest score — selected for 2nd vacancy slot, pending appointment',
    },
  });

  const llApp1Anna = await prisma.application.create({
    data: {
      positionId: llPos1.id,
      applicantId: applicant4.id,  // Anna
      status: 'QUALIFIED',
      submittedAt: new Date('2026-02-04T11:00:00'),
      notes: 'Qualified but not selected — vacancy slots filled',
    },
  });

  const llApp1Pedro = await prisma.application.create({
    data: {
      positionId: llPos1.id,
      applicantId: applicant5.id,  // Pedro
      status: 'SHORTLISTED',
      submittedAt: new Date('2026-02-05T14:00:00'),
    },
  });

  const llApp1Elena = await prisma.application.create({
    data: {
      positionId: llPos1.id,
      applicantId: applicant6.id,  // Elena
      status: 'ENDORSED',
      submittedAt: new Date('2026-02-06T08:30:00'),
    },
  });

  // --- Position 2 (Tourism Ops Officer III) Applications ---
  const llApp2Maria = await prisma.application.create({
    data: {
      positionId: llPos2.id,
      applicantId: applicant2.id,  // Maria
      status: 'INTERVIEWED',
      submittedAt: new Date('2026-02-02T10:00:00'),
      notes: 'Completed interview — awaiting assessment scoring',
    },
  });

  const llApp2Anna = await prisma.application.create({
    data: {
      positionId: llPos2.id,
      applicantId: applicant4.id,  // Anna
      status: 'FOR_INTERVIEW',
      submittedAt: new Date('2026-02-03T09:00:00'),
      notes: 'Assigned to interview schedule — awaiting interview date',
    },
  });

  // --- Position 3 (Revenue Collection Officer II, FILLED) Application ---
  const llApp3Pedro = await prisma.application.create({
    data: {
      positionId: llPos3.id,
      applicantId: applicant5.id,  // Pedro
      status: 'APPOINTED',
      submittedAt: new Date('2026-02-02T11:00:00'),
      notes: 'Sole qualified candidate — position filled',
    },
  });

  const llApp3Elena = await prisma.application.create({
    data: {
      positionId: llPos3.id,
      applicantId: applicant6.id,  // Elena
      status: 'REJECTED',
      submittedAt: new Date('2026-02-04T13:00:00'),
      notes: 'Did not meet eligibility requirements',
    },
  });

  // Fresh submissions awaiting HR review — the entry state of the pipeline
  const llApp4Maria = await prisma.application.create({
    data: {
      positionId: llPos8.id,   // Information Technology Officer I
      applicantId: applicant2.id,  // Maria
      status: 'SUBMITTED',
      submittedAt: new Date('2026-05-04T09:15:00'),
    },
  });

  const llApp4Roberto = await prisma.application.create({
    data: {
      positionId: llPos8.id,   // Information Technology Officer I
      applicantId: applicant3.id,  // Roberto
      status: 'SUBMITTED',
      submittedAt: new Date('2026-05-05T14:40:00'),
    },
  });

  const llApp5Juan = await prisma.application.create({
    data: {
      positionId: llPos6.id,   // Fire Marshal I
      applicantId: applicant.id,   // Juan
      status: 'SUBMITTED',
      submittedAt: new Date('2026-05-06T10:05:00'),
    },
  });

  console.log('Created 12 Lapu-Lapu applications across 5 positions');

  // =============================================
  // LAPU-LAPU INTERVIEW SCHEDULES
  // =============================================

  // Interview for Position 1 — COMPLETED (Juan, Roberto, Anna attended)
  const llInterview1 = await prisma.interviewSchedule.create({
    data: {
      positionId: llPos1.id,
      scheduleDate: new Date('2026-03-01T09:00:00'),
      venue: 'Lapu-Lapu City Hall — Conference Room, 2nd Floor',
      notes: 'Panel interview for Civil Engineer III candidates. Panel: HR Admin, City Engineer, HRMPSB Member.',
      status: 'COMPLETED',
      createdBy: llHrAdmin.id,
    },
  });

  await prisma.interviewScheduleApplicant.createMany({
    data: [
      { interviewScheduleId: llInterview1.id, applicationId: llApp1Juan.id, notified: true, attended: true },
      { interviewScheduleId: llInterview1.id, applicationId: llApp1Roberto.id, notified: true, attended: true },
      { interviewScheduleId: llInterview1.id, applicationId: llApp1Anna.id, notified: true, attended: true },
    ],
  });

  // Interview for Position 2 — SCHEDULED (Maria attended, Anna assigned but not yet conducted)
  const llInterview2 = await prisma.interviewSchedule.create({
    data: {
      positionId: llPos2.id,
      scheduleDate: new Date('2026-03-05T09:00:00'),
      venue: 'Lapu-Lapu City Hall — Mayor\'s Conference Room, 3rd Floor',
      notes: 'Panel interview for Tourism Operations Officer III candidates.',
      status: 'COMPLETED',
      createdBy: llHrAdmin.id,
    },
  });

  await prisma.interviewScheduleApplicant.createMany({
    data: [
      { interviewScheduleId: llInterview2.id, applicationId: llApp2Maria.id, notified: true, attended: true },
      { interviewScheduleId: llInterview2.id, applicationId: llApp2Anna.id, notified: true, attended: false },
    ],
  });

  // Interview for Position 3 — COMPLETED (Pedro attended)
  const llInterview3 = await prisma.interviewSchedule.create({
    data: {
      positionId: llPos3.id,
      scheduleDate: new Date('2026-02-25T09:00:00'),
      venue: 'Lapu-Lapu City Hall — Conference Room, 2nd Floor',
      notes: 'Panel interview for Revenue Collection Officer II candidates.',
      status: 'COMPLETED',
      createdBy: llHrAdmin.id,
    },
  });

  await prisma.interviewScheduleApplicant.create({
    data: {
      interviewScheduleId: llInterview3.id,
      applicationId: llApp3Pedro.id,
      notified: true,
      attended: true,
    },
  });

  console.log('Created 3 Lapu-Lapu interview schedules');

  // =============================================
  // LAPU-LAPU ASSESSMENT SCORES
  // =============================================

  // Position 1 — 3 scored applicants (Juan, Roberto, Anna)
  await makeAssessment({
    applicationId: llApp1Juan.id,
    positionId: llPos1.id,
    lguId: lapulapu.id,
    ratings: { 'PERFORMANCE': 97, 'EDUCATION': 95, 'Relevant TRAINING': 93, 'Relevant EXPERIENCE': 96, 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL': 95, 'OUTSTANDING ACCOMPLISHMENTS': 92 },
    remarks: 'Outstanding candidate — strong technical background with government engineering experience',
    scoredBy: llHrAdmin.id,
  });

  await makeAssessment({
    applicationId: llApp1Roberto.id,
    positionId: llPos1.id,
    lguId: lapulapu.id,
    ratings: { 'PERFORMANCE': 90, 'EDUCATION': 88, 'Relevant TRAINING': 85, 'Relevant EXPERIENCE': 90, 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL': 88, 'OUTSTANDING ACCOMPLISHMENTS': 70 },
    remarks: 'Solid engineering credentials with good leadership potential',
    scoredBy: llHrAdmin.id,
  });

  await makeAssessment({
    applicationId: llApp1Anna.id,
    positionId: llPos1.id,
    lguId: lapulapu.id,
    ratings: { 'PERFORMANCE': 83, 'EDUCATION': 82, 'Relevant TRAINING': 78, 'Relevant EXPERIENCE': 80, 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL': 82, 'OUTSTANDING ACCOMPLISHMENTS': 50 },
    remarks: 'Qualified — recommended for future technical openings',
    scoredBy: llHrAdmin.id,
  });

  // Position 3 — Pedro
  await makeAssessment({
    applicationId: llApp3Pedro.id,
    positionId: llPos3.id,
    lguId: lapulapu.id,
    ratings: { 'PERFORMANCE': 92, 'EDUCATION': 90, 'Relevant TRAINING': 86, 'Relevant EXPERIENCE': 91, 'PSYCHO-SOCIAL ATTRIBUTES & POTENTIAL': 90, 'OUTSTANDING ACCOMPLISHMENTS': 75 },
    remarks: 'Well-qualified for revenue collection role — solid accounting background',
    scoredBy: llHrAdmin.id,
  });

  console.log('Created 4 Lapu-Lapu assessment scores');

  // =============================================
  // LAPU-LAPU APPOINTMENTS
  // =============================================

  // Appointment 1: Juan — Civil Engineer III — PENDING (4/8 requirements verified)
  const llAppointment1 = await prisma.appointment.create({
    data: {
      applicationId: llApp1Juan.id,
      positionId: llPos1.id,
      appointmentDate: new Date('2026-03-15'),
      oathDate: new Date('2026-03-20'),
      status: 'PENDING',
      createdBy: llHrAdmin.id,
    },
  });

  const juanLLFinalReqs = [
    { requirementName: 'Oath of Office', description: 'Signed oath of office form (CS Form 32)', isSubmitted: true, isVerified: true, verifiedBy: llHrAdmin.id, verifiedAt: new Date('2026-03-21T10:00:00') },
    { requirementName: 'Appointment Form', description: 'Signed appointment form (CS Form 33-A)', isSubmitted: true, isVerified: true, verifiedBy: llHrAdmin.id, verifiedAt: new Date('2026-03-21T10:05:00') },
    { requirementName: 'Certificate of Assumption to Duty', description: 'Signed certificate of assumption to duty', isSubmitted: true, isVerified: true, verifiedBy: llHrAdmin.id, verifiedAt: new Date('2026-03-22T09:00:00') },
    { requirementName: 'Birth Certificate', description: 'PSA-authenticated birth certificate', isSubmitted: true, isVerified: true, verifiedBy: llHrAdmin.id, verifiedAt: new Date('2026-03-22T09:30:00') },
    { requirementName: 'Marriage Certificate', description: 'PSA-authenticated marriage certificate (if applicable)', isSubmitted: false, isVerified: false },
    { requirementName: 'NBI Clearance', description: 'Valid NBI clearance (issued within the last 6 months)', isSubmitted: false, isVerified: false },
    { requirementName: 'Medical Certificate', description: 'Medical certificate from a government physician', isSubmitted: false, isVerified: false },
    { requirementName: 'Barangay Clearance', description: 'Barangay clearance from place of residence', isSubmitted: false, isVerified: false },
  ];
  for (const req of juanLLFinalReqs) {
    await prisma.finalRequirement.create({ data: { appointmentId: llAppointment1.id, ...req } });
  }

  // Appointment 2: Pedro — Revenue Collection Officer II — COMPLETED (8/8 verified)
  const llAppointment2 = await prisma.appointment.create({
    data: {
      applicationId: llApp3Pedro.id,
      positionId: llPos3.id,
      appointmentDate: new Date('2026-03-01'),
      oathDate: new Date('2026-03-05'),
      status: 'COMPLETED',
      createdBy: llHrAdmin.id,
    },
  });

  const pedroFinalReqNames = [
    'Oath of Office',
    'Appointment Form',
    'Certificate of Assumption to Duty',
    'Birth Certificate',
    'Marriage Certificate',
    'NBI Clearance',
    'Medical Certificate',
    'Barangay Clearance',
  ];
  for (const reqName of pedroFinalReqNames) {
    await prisma.finalRequirement.create({
      data: {
        appointmentId: llAppointment2.id,
        requirementName: reqName,
        isSubmitted: true,
        isVerified: true,
        verifiedBy: llHrAdmin.id,
        verifiedAt: new Date('2026-03-10T10:00:00'),
      },
    });
  }

  console.log('Created 2 Lapu-Lapu appointments (1 pending, 1 completed)');

  // =============================================
  // LAPU-LAPU TRAINING
  // =============================================

  const llTraining1 = await prisma.training.create({
    data: {
      title: 'Coastal Resource Management Training',
      description: 'Technical training on coastal zone management, marine biodiversity protection, and sustainable tourism practices for island communities.',
      type: 'TECHNICAL',
      venue: 'Lapu-Lapu City Hall — Function Hall',
      conductedBy: 'Department of Environment and Natural Resources — Region VII',
      startDate: new Date('2026-02-17'),
      endDate: new Date('2026-02-19'),
      numberOfHours: 24,
      status: 'COMPLETED',
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  await prisma.trainingParticipant.createMany({
    data: [
      { trainingId: llTraining1.id, firstName: 'Lapu', lastName: 'Lapu', department: 'Tourism Office', attended: true, completedAt: new Date('2026-02-19') },
      { trainingId: llTraining1.id, firstName: 'Datu', lastName: 'Zula', department: 'Engineering Office', attended: true, completedAt: new Date('2026-02-19') },
      { trainingId: llTraining1.id, firstName: 'Rajah', lastName: 'Humabon', department: 'Treasury Office', attended: true, completedAt: new Date('2026-02-19') },
      { trainingId: llTraining1.id, firstName: 'Teresa', lastName: 'Magellan', department: 'Health Office', attended: false, remarks: 'On official travel — to be rescheduled' },
    ],
  });

  const llTraining2 = await prisma.training.create({
    data: {
      title: 'Tourism Promotion and Digital Marketing',
      description: 'Foundation course on destination marketing, social media strategy for tourism promotion, and digital content creation for local government tourism offices.',
      type: 'FOUNDATION',
      venue: 'Shangri-La Mactan Resort — Coral Ballroom',
      conductedBy: 'Department of Tourism — Region VII',
      startDate: new Date('2026-03-24'),
      endDate: new Date('2026-03-28'),
      numberOfHours: 40,
      status: 'ONGOING',
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  await prisma.trainingParticipant.createMany({
    data: [
      { trainingId: llTraining2.id, firstName: 'Lapu', lastName: 'Lapu', department: 'Tourism Office', attended: null },
      { trainingId: llTraining2.id, firstName: 'Urduja', lastName: 'Pangasinan', department: 'Tourism Office', attended: null },
      { trainingId: llTraining2.id, firstName: 'Rajah', lastName: 'Humabon', department: 'Treasury Office', attended: null },
    ],
  });

  const llTraining3 = await prisma.training.create({
    data: {
      title: 'Local Government Executive Leadership Program',
      description: 'Managerial training for department heads on strategic planning, performance management, governance innovation, and policy development.',
      type: 'MANAGERIAL',
      venue: 'Lapu-Lapu City Hall — Function Hall',
      conductedBy: 'Development Academy of the Philippines',
      startDate: new Date('2026-05-05'),
      endDate: new Date('2026-05-09'),
      numberOfHours: 40,
      status: 'UPCOMING',
      lguId: lapulapu.id,
      createdBy: llHrAdmin.id,
    },
  });

  console.log('Created 3 Lapu-Lapu trainings (1 completed, 1 ongoing, 1 upcoming)');

  // =============================================
  // LAPU-LAPU AUDIT LOGS — Full Status Transitions
  // =============================================

  const llAuditLogs: Array<{
    userId: number;
    action: string;
    entity: string;
    entityId: number;
    oldValues: any;
    newValues: any;
    ipAddress: string;
    createdAt: Date;
  }> = [];

  const llAddLog = (userId: number, action: string, entity: string, entityId: number, oldValues: any, newValues: any, createdAt: Date) => {
    llAuditLogs.push({ userId, action, entity, entityId, oldValues, newValues, ipAddress: '192.168.2.100', createdAt });
  };

  // --- Juan (Position 1: Civil Engineer III): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED ---
  llAddLog(applicant.id, 'SUBMIT_APPLICATION', 'application', llApp1Juan.id, null, { status: 'SUBMITTED', positionId: llPos1.id, applicantId: applicant.id }, new Date('2026-02-02T09:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp1Juan.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-10T10:00:00'));
  llAddLog(llOfficeAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp1Juan.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-14T14:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp1Juan.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-20T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'application', llApp1Juan.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-03-01T16:00:00'));
  llAddLog(llHrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', llApp1Juan.id, null, { totalScore: 102.00 }, new Date('2026-03-03T09:00:00'));
  llAddLog(llHrAdmin.id, 'QUALIFY_APPLICANTS', 'application', llApp1Juan.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-03-05T10:00:00'));
  llAddLog(llHrAdmin.id, 'SELECT_APPLICANTS', 'application', llApp1Juan.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-03-08T10:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_APPOINTMENT', 'application', llApp1Juan.id, { status: 'SELECTED' }, { status: 'APPOINTED' }, new Date('2026-03-15T09:00:00'));

  // --- Roberto (Position 1): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED ---
  llAddLog(applicant3.id, 'SUBMIT_APPLICATION', 'application', llApp1Roberto.id, null, { status: 'SUBMITTED', positionId: llPos1.id, applicantId: applicant3.id }, new Date('2026-02-03T10:30:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp1Roberto.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-10T10:15:00'));
  llAddLog(llOfficeAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp1Roberto.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-14T14:30:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp1Roberto.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-20T09:05:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'application', llApp1Roberto.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-03-01T16:05:00'));
  llAddLog(llHrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', llApp1Roberto.id, null, { totalScore: 95.00 }, new Date('2026-03-03T09:15:00'));
  llAddLog(llHrAdmin.id, 'QUALIFY_APPLICANTS', 'application', llApp1Roberto.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-03-05T10:05:00'));
  llAddLog(llHrAdmin.id, 'SELECT_APPLICANTS', 'application', llApp1Roberto.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-03-08T10:05:00'));

  // --- Anna (Position 1): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED ---
  llAddLog(applicant4.id, 'SUBMIT_APPLICATION', 'application', llApp1Anna.id, null, { status: 'SUBMITTED', positionId: llPos1.id, applicantId: applicant4.id }, new Date('2026-02-04T11:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp1Anna.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-10T10:30:00'));
  llAddLog(llOfficeAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp1Anna.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-14T15:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp1Anna.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-20T09:10:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'application', llApp1Anna.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-03-01T16:10:00'));
  llAddLog(llHrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', llApp1Anna.id, null, { totalScore: 86.50 }, new Date('2026-03-03T09:30:00'));
  llAddLog(llHrAdmin.id, 'QUALIFY_APPLICANTS', 'application', llApp1Anna.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-03-05T10:10:00'));

  // --- Pedro (Position 1): SUBMITTED → ENDORSED → SHORTLISTED ---
  llAddLog(applicant5.id, 'SUBMIT_APPLICATION', 'application', llApp1Pedro.id, null, { status: 'SUBMITTED', positionId: llPos1.id, applicantId: applicant5.id }, new Date('2026-02-05T14:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp1Pedro.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-11T09:00:00'));
  llAddLog(llOfficeAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp1Pedro.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-15T10:00:00'));

  // --- Elena (Position 1): SUBMITTED → ENDORSED ---
  llAddLog(applicant6.id, 'SUBMIT_APPLICATION', 'application', llApp1Elena.id, null, { status: 'SUBMITTED', positionId: llPos1.id, applicantId: applicant6.id }, new Date('2026-02-06T08:30:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp1Elena.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-11T09:30:00'));

  // --- Maria (Position 2: Tourism Ops Officer III): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED ---
  llAddLog(applicant2.id, 'SUBMIT_APPLICATION', 'application', llApp2Maria.id, null, { status: 'SUBMITTED', positionId: llPos2.id, applicantId: applicant2.id }, new Date('2026-02-02T10:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp2Maria.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-10T11:00:00'));
  llAddLog(llTourismAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp2Maria.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-13T10:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp2Maria.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-22T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'application', llApp2Maria.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-03-05T16:00:00'));

  // --- Anna (Position 2): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW ---
  llAddLog(applicant4.id, 'SUBMIT_APPLICATION', 'application', llApp2Anna.id, null, { status: 'SUBMITTED', positionId: llPos2.id, applicantId: applicant4.id }, new Date('2026-02-03T09:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp2Anna.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-10T11:15:00'));
  llAddLog(llTourismAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp2Anna.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-13T10:30:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp2Anna.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-22T09:05:00'));

  // --- Pedro (Position 3: Revenue Collection Officer II): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED ---
  llAddLog(applicant5.id, 'SUBMIT_APPLICATION', 'application', llApp3Pedro.id, null, { status: 'SUBMITTED', positionId: llPos3.id, applicantId: applicant5.id }, new Date('2026-02-02T11:00:00'));
  llAddLog(llHrAdmin.id, 'ENDORSE_APPLICATION', 'application', llApp3Pedro.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-02-08T10:00:00'));
  llAddLog(llOfficeAdmin.id, 'SHORTLIST_APPLICATION', 'application', llApp3Pedro.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-02-12T14:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'application', llApp3Pedro.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-18T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'application', llApp3Pedro.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-02-25T16:00:00'));
  llAddLog(llHrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', llApp3Pedro.id, null, { totalScore: 94.00 }, new Date('2026-02-26T09:00:00'));
  llAddLog(llHrAdmin.id, 'QUALIFY_APPLICANTS', 'application', llApp3Pedro.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-02-27T10:00:00'));
  llAddLog(llHrAdmin.id, 'SELECT_APPLICANTS', 'application', llApp3Pedro.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-02-28T10:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_APPOINTMENT', 'application', llApp3Pedro.id, { status: 'SELECTED' }, { status: 'APPOINTED' }, new Date('2026-03-01T09:00:00'));

  // --- Elena (Position 3): SUBMITTED → REJECTED ---
  llAddLog(applicant6.id, 'SUBMIT_APPLICATION', 'application', llApp3Elena.id, null, { status: 'SUBMITTED', positionId: llPos3.id, applicantId: applicant6.id }, new Date('2026-02-04T13:00:00'));
  llAddLog(llHrAdmin.id, 'REJECT_APPLICATION', 'application', llApp3Elena.id, { status: 'SUBMITTED' }, { status: 'REJECTED' }, new Date('2026-02-09T10:00:00'));

  // --- Appointment Audit Logs ---
  llAddLog(llHrAdmin.id, 'CREATE_APPOINTMENT', 'appointment', llAppointment1.id, null, { applicationId: llApp1Juan.id, positionId: llPos1.id, appointmentDate: '2026-03-15', oathDate: '2026-03-20', status: 'PENDING' }, new Date('2026-03-15T09:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE_APPOINTMENT', 'appointment', llAppointment2.id, null, { applicationId: llApp3Pedro.id, positionId: llPos3.id, appointmentDate: '2026-03-01', oathDate: '2026-03-05', status: 'PENDING' }, new Date('2026-03-01T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE_APPOINTMENT', 'appointment', llAppointment2.id, { status: 'PENDING' }, { status: 'COMPLETED' }, new Date('2026-03-10T10:30:00'));

  // --- Final Requirement Verification Logs ---
  llAddLog(llHrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', llAppointment1.id, null, { requirementName: 'Oath of Office', verified: true }, new Date('2026-03-21T10:00:00'));
  llAddLog(llHrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', llAppointment1.id, null, { requirementName: 'Appointment Form', verified: true }, new Date('2026-03-21T10:05:00'));
  llAddLog(llHrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', llAppointment1.id, null, { requirementName: 'Certificate of Assumption to Duty', verified: true }, new Date('2026-03-22T09:00:00'));
  llAddLog(llHrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', llAppointment1.id, null, { requirementName: 'Birth Certificate', verified: true }, new Date('2026-03-22T09:30:00'));

  for (const reqName of pedroFinalReqNames) {
    llAddLog(llHrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', llAppointment2.id, null, { requirementName: reqName, verified: true }, new Date('2026-03-10T10:00:00'));
  }

  // --- Interview Audit Logs ---
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'interview_schedule', llInterview1.id, null, { positionId: llPos1.id, scheduleDate: '2026-03-01', venue: 'Conference Room, 2nd Floor' }, new Date('2026-02-20T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'interview_schedule', llInterview1.id, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('2026-03-01T16:30:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'interview_schedule', llInterview2.id, null, { positionId: llPos2.id, scheduleDate: '2026-03-05', venue: "Mayor's Conference Room" }, new Date('2026-02-22T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'interview_schedule', llInterview2.id, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('2026-03-05T16:30:00'));
  llAddLog(llHrAdmin.id, 'CREATE_INTERVIEW', 'interview_schedule', llInterview3.id, null, { positionId: llPos3.id, scheduleDate: '2026-02-25', venue: 'Conference Room, 2nd Floor' }, new Date('2026-02-18T09:00:00'));
  llAddLog(llHrAdmin.id, 'COMPLETE_INTERVIEW', 'interview_schedule', llInterview3.id, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('2026-02-25T16:30:00'));

  // --- CSC Batch Audit Logs ---
  llAddLog(llHrAdmin.id, 'CREATE', 'csc_publication_batch', llBatch1.id, null, { publicationNumber: '2026-001', description: 'First quarter publication' }, new Date('2026-01-25T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'csc_publication_batch', llBatch1.id, { isPublished: false }, { isPublished: true }, new Date('2026-02-01T08:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE', 'csc_publication_batch', llBatch2.id, null, { publicationNumber: '2026-002', description: 'Second quarter publication' }, new Date('2026-03-10T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'csc_publication_batch', llBatch2.id, { isPublished: false }, { isPublished: true }, new Date('2026-03-15T08:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE', 'csc_publication_batch', llBatch3.id, null, { publicationNumber: '2026-003', description: 'Third quarter publication' }, new Date('2026-03-25T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'csc_publication_batch', llBatch3.id, { isPublished: false }, { isPublished: true }, new Date('2026-04-01T08:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE', 'csc_publication_batch', llBatch4.id, null, { publicationNumber: '2026-004', description: 'Fourth quarter publication' }, new Date('2026-04-20T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'csc_publication_batch', llBatch4.id, { isPublished: false }, { isPublished: true }, new Date('2026-05-01T08:00:00'));

  // --- Training Audit Logs ---
  llAddLog(llHrAdmin.id, 'CREATE', 'training', llTraining1.id, null, { title: 'Coastal Resource Management Training', type: 'TECHNICAL' }, new Date('2026-02-05T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'training', llTraining1.id, { status: 'UPCOMING' }, { status: 'COMPLETED' }, new Date('2026-02-19T17:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE', 'training', llTraining2.id, null, { title: 'Tourism Promotion and Digital Marketing', type: 'FOUNDATION' }, new Date('2026-03-10T09:00:00'));
  llAddLog(llHrAdmin.id, 'UPDATE', 'training', llTraining2.id, { status: 'UPCOMING' }, { status: 'ONGOING' }, new Date('2026-03-24T08:00:00'));
  llAddLog(llHrAdmin.id, 'CREATE', 'training', llTraining3.id, null, { title: 'Local Government Executive Leadership Program', type: 'MANAGERIAL' }, new Date('2026-03-20T09:00:00'));

  // Status trail for the three fresh submissions
  llAddLog(applicant2.id, 'SUBMIT_APPLICATION', 'application', llApp4Maria.id, null, { status: 'SUBMITTED', positionId: llPos8.id, applicantId: applicant2.id }, new Date('2026-05-04T09:15:00'));
  llAddLog(applicant3.id, 'SUBMIT_APPLICATION', 'application', llApp4Roberto.id, null, { status: 'SUBMITTED', positionId: llPos8.id, applicantId: applicant3.id }, new Date('2026-05-05T14:40:00'));
  llAddLog(applicant.id, 'SUBMIT_APPLICATION', 'application', llApp5Juan.id, null, { status: 'SUBMITTED', positionId: llPos6.id, applicantId: applicant.id }, new Date('2026-05-06T10:05:00'));

  // Bulk insert all Lapu-Lapu audit logs
  await prisma.auditLog.createMany({ data: llAuditLogs });
  console.log(`Created ${llAuditLogs.length} audit logs for Lapu-Lapu pipeline`);

  // ---- HRMPSB signatories (Comparative Assessment Form signature block) ----
  // Placeholder names with realistic city-level designations — NOT actual Lapu-Lapu officials.
  // The composition mirrors a standard LGU HRMPSB: appointing authority's rep as chair, admin
  // as vice chair, legal + HRMO as members, the requesting department head, and the accredited
  // employee association (PEACE) representative.
  await prisma.psbMember.createMany({
    data: [
      { lguId: lapulapu.id, name: 'ROSALINDA M. ABELLANA', designation: 'City Mayor', psbRole: 'Chairperson, HRMPSB', type: 'PSB_MEMBER', sortOrder: 1 },
      { lguId: lapulapu.id, name: 'ATTY. FERDINAND L. YBAÑEZ', designation: 'City Administrator', psbRole: 'Vice Chairperson, HRMPSB', type: 'PSB_MEMBER', sortOrder: 2 },
      { lguId: lapulapu.id, name: 'ATTY. MARICEL P. CUIZON', designation: 'City Legal Officer', psbRole: 'Member, HRMPSB', type: 'PSB_MEMBER', sortOrder: 3 },
      { lguId: lapulapu.id, name: 'ENGR. ROGELIO T. SUMALINOG', designation: 'City Engineer', psbRole: 'Member, HRMPSB', type: 'PSB_MEMBER', sortOrder: 4 },
      { lguId: lapulapu.id, name: 'DR. CARMELITA V. LOZADA', designation: 'City Health Officer', psbRole: 'Member, HRMPSB', type: 'PSB_MEMBER', sortOrder: 5 },
      { lguId: lapulapu.id, name: 'BENJAMIN R. PATALINGHUG', designation: 'Administrative Officer IV', psbRole: 'Member, HRMPSB-PEACE Representative', type: 'PSB_MEMBER', sortOrder: 6 },
      { lguId: lapulapu.id, name: 'GLORIA S. MENDOZA', designation: 'Human Resource Management Officer IV', psbRole: 'Secretariat, HRMPSB', type: 'PREPARED_BY', sortOrder: 1 },
    ],
  });
  console.log('Created 7 Lapu-Lapu HRMPSB signatories (6 members + 1 prepared by)');

  console.log('\n--- Lapu-Lapu City Full Pipeline Seed Complete ---');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
