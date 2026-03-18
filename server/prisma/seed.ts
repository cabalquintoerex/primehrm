import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean all data in correct order
  console.log('Cleaning existing data...');
  await prisma.trainingParticipant.deleteMany();
  await prisma.training.deleteMany();
  await prisma.finalRequirement.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.assessmentScore.deleteMany();
  await prisma.interviewScheduleApplicant.deleteMany();
  await prisma.interviewSchedule.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.personalDataSheet.deleteMany();
  await prisma.workExperienceSheet.deleteMany();
  await prisma.positionDocumentRequirement.deleteMany();
  await prisma.position.deleteMany();
  await prisma.cscPublicationBatch.deleteMany();
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

  // Create sample LGU
  const lgu = await prisma.lgu.upsert({
    where: { slug: 'cebu-city' },
    update: {},
    create: {
      name: 'City of Cebu',
      slug: 'cebu-city',
      address: 'Cebu City Hall, Osmena Blvd, Cebu City',
      contactNumber: '(032) 255-3611',
      email: 'hr@cebucity.gov.ph',
    },
  });
  console.log('Created LGU:', lgu.name);

  // Create sample departments
  const departments = ['Human Resource Office', 'Engineering Office', 'Treasury Office', 'Health Department', 'Social Welfare Office'];
  for (const deptName of departments) {
    await prisma.department.upsert({
      where: { lguId_name: { lguId: lgu.id, name: deptName } },
      update: {},
      create: { name: deptName, lguId: lgu.id },
    });
  }
  console.log('Created departments');

  // Create LGU HR Admin
  const hrPassword = await bcrypt.hash('hradmin123', 12);
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'hr@cebucity.gov.ph' },
    update: {},
    create: {
      email: 'hr@cebucity.gov.ph',
      username: 'cebucityhr',
      password: hrPassword,
      firstName: 'HR',
      lastName: 'Admin',
      role: 'LGU_HR_ADMIN',
      lguId: lgu.id,
    },
  });
  console.log('Created HR Admin:', hrAdmin.email);

  // Create LGU Office Admin
  const hrDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Engineering Office' } });
  const officePassword = await bcrypt.hash('office123', 12);
  const officeAdmin = await prisma.user.upsert({
    where: { email: 'engineering@cebucity.gov.ph' },
    update: {},
    create: {
      email: 'engineering@cebucity.gov.ph',
      username: 'cebucityeng',
      password: officePassword,
      firstName: 'Engineering',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      lguId: lgu.id,
      departmentId: hrDept?.id,
    },
  });
  console.log('Created Office Admin:', officeAdmin.email);

  // Create Mandaue LGU
  const mandaue = await prisma.lgu.upsert({
    where: { slug: 'mandaue-city' },
    update: {},
    create: {
      name: 'City of Mandaue',
      slug: 'mandaue-city',
      address: 'Mandaue City Hall, A.C. Cortes Ave, Mandaue City',
      contactNumber: '(032) 346-2214',
      email: 'hr@mandauecity.gov.ph',
    },
  });
  console.log('Created LGU:', mandaue.name);

  const mandaueDepts = ['Human Resource Office', 'Engineering Office', 'Treasury Office'];
  for (const deptName of mandaueDepts) {
    await prisma.department.upsert({
      where: { lguId_name: { lguId: mandaue.id, name: deptName } },
      update: {},
      create: { name: deptName, lguId: mandaue.id },
    });
  }

  const mandaueHrPassword = await bcrypt.hash('hradmin123', 12);
  await prisma.user.upsert({
    where: { email: 'hr@mandauecity.gov.ph' },
    update: {},
    create: {
      email: 'hr@mandauecity.gov.ph',
      username: 'mandauehr',
      password: mandaueHrPassword,
      firstName: 'HR',
      lastName: 'Admin',
      role: 'LGU_HR_ADMIN',
      lguId: mandaue.id,
    },
  });
  console.log('Created Mandaue HR Admin');

  // Create Lapu-Lapu LGU
  const lapulapu = await prisma.lgu.upsert({
    where: { slug: 'lapu-lapu-city' },
    update: {},
    create: {
      name: 'City of Lapu-Lapu',
      slug: 'lapu-lapu-city',
      address: 'Lapu-Lapu City Hall, M.L. Quezon National Highway, Lapu-Lapu City',
      contactNumber: '(032) 340-5456',
      email: 'hr@lapulapucity.gov.ph',
    },
  });
  console.log('Created LGU:', lapulapu.name);

  const lapulapuDepts = ['Human Resource Office', 'Engineering Office', 'Treasury Office'];
  for (const deptName of lapulapuDepts) {
    await prisma.department.upsert({
      where: { lguId_name: { lguId: lapulapu.id, name: deptName } },
      update: {},
      create: { name: deptName, lguId: lapulapu.id },
    });
  }

  const lapulapuHrPassword = await bcrypt.hash('hradmin123', 12);
  await prisma.user.upsert({
    where: { email: 'hr@lapulapucity.gov.ph' },
    update: {},
    create: {
      email: 'hr@lapulapucity.gov.ph',
      username: 'lapulapuhr',
      password: lapulapuHrPassword,
      firstName: 'HR',
      lastName: 'Admin',
      role: 'LGU_HR_ADMIN',
      lguId: lapulapu.id,
    },
  });
  console.log('Created Lapu-Lapu HR Admin');

  // Create Lapu-Lapu Office Admin
  const lapulapuEngDept = await prisma.department.findFirst({ where: { lguId: lapulapu.id, name: 'Engineering Office' } });
  const lapulapuOfficePassword = await bcrypt.hash('office123', 12);
  await prisma.user.upsert({
    where: { email: 'engineering@lapulapucity.gov.ph' },
    update: {},
    create: {
      email: 'engineering@lapulapucity.gov.ph',
      username: 'lapulapueng',
      password: lapulapuOfficePassword,
      firstName: 'Engineering',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      lguId: lapulapu.id,
      departmentId: lapulapuEngDept?.id,
    },
  });
  console.log('Created Lapu-Lapu Office Admin');

  // Create Cebu Province LGU
  const cebuProvince = await prisma.lgu.upsert({
    where: { slug: 'cebu-province' },
    update: {},
    create: {
      name: 'Province of Cebu',
      slug: 'cebu-province',
      address: 'Cebu Provincial Capitol, Escario St, Cebu City',
      contactNumber: '(032) 253-6333',
      email: 'hr@cebu.gov.ph',
    },
  });
  console.log('Created LGU:', cebuProvince.name);

  const cebuProvDepts = ['Human Resource Office', 'Engineering Office', 'Treasury Office'];
  for (const deptName of cebuProvDepts) {
    await prisma.department.upsert({
      where: { lguId_name: { lguId: cebuProvince.id, name: deptName } },
      update: {},
      create: { name: deptName, lguId: cebuProvince.id },
    });
  }

  const cebuProvHrPassword = await bcrypt.hash('hradmin123', 12);
  await prisma.user.upsert({
    where: { email: 'hr@cebu.gov.ph' },
    update: {},
    create: {
      email: 'hr@cebu.gov.ph',
      username: 'cebuprovhr',
      password: cebuProvHrPassword,
      firstName: 'HR',
      lastName: 'Admin',
      role: 'LGU_HR_ADMIN',
      lguId: cebuProvince.id,
    },
  });
  console.log('Created Cebu Province HR Admin');

  // Create sample Applicant
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
            period: { from: '2020-03-01', to: '2025-12-31' },
            positionTitle: 'Administrative Aide VI',
            department: 'City of Mandaue - Treasury Office',
            monthlySalary: '18957',
            salaryGrade: 'SG-6 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Process financial documents and vouchers',
              'Maintain records of collections and disbursements',
              'Assist in payroll computation and processing',
              'Prepare monthly financial reports',
            ],
          },
          {
            period: { from: '2016-07-01', to: '2020-02-28' },
            positionTitle: 'IT Support Staff',
            department: 'TechVentures Inc.',
            monthlySalary: '18000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
            dutiesAndResponsibilities: [
              'Provide technical support for hardware and software issues',
              'Maintain network infrastructure and servers',
              'Manage user accounts and access permissions',
            ],
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
            period: { from: '2018-06-01', to: '2025-12-31' },
            positionTitle: 'Nurse I',
            department: 'City of Cebu - City Health Office',
            monthlySalary: '30024',
            salaryGrade: 'SG-11 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Provide nursing care to patients in barangay health stations',
              'Conduct health assessments and screenings',
              'Implement immunization programs',
              'Prepare and submit monthly health reports',
            ],
          },
          {
            period: { from: '2014-03-01', to: '2018-05-31' },
            positionTitle: 'Staff Nurse',
            department: 'Cebu Doctors University Hospital',
            monthlySalary: '22000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
            dutiesAndResponsibilities: [
              'Provide direct patient care in the medical-surgical ward',
              'Administer medications and IV therapy',
              'Monitor patient vital signs and document observations',
            ],
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
            period: { from: '2015-09-01', to: '2025-12-31' },
            positionTitle: 'Engineer I',
            department: 'City of Mandaue - Engineering Office',
            monthlySalary: '32245',
            salaryGrade: 'SG-12 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Design and prepare engineering plans for infrastructure projects',
              'Conduct site inspections and construction supervision',
              'Prepare detailed cost estimates and bill of materials',
              'Review building permit applications for structural compliance',
              'Coordinate with contractors and project stakeholders',
            ],
          },
          {
            period: { from: '2012-04-01', to: '2015-08-31' },
            positionTitle: 'Junior Civil Engineer',
            department: 'DPWH Region VII - District Engineering Office',
            monthlySalary: '25586',
            salaryGrade: 'SG-10 Step 1',
            statusOfAppointment: 'Contractual',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Assist in the design and planning of national road projects',
              'Conduct field surveys and soil investigations',
              'Monitor construction progress and quality control',
            ],
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
            period: { from: '2021-01-04', to: '2025-12-31' },
            positionTitle: 'Accountant I',
            department: 'Province of Cebu - Provincial Treasurer\'s Office',
            monthlySalary: '32245',
            salaryGrade: 'SG-12 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Prepare journal entries and financial statements',
              'Process obligation requests and disbursement vouchers',
              'Reconcile subsidiary ledgers with general ledger',
              'Assist in year-end closing and COA audit preparation',
            ],
          },
          {
            period: { from: '2019-01-07', to: '2020-12-30' },
            positionTitle: 'Junior Accountant',
            department: 'SGV & Co. (Ernst & Young Philippines)',
            monthlySalary: '25000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
            dutiesAndResponsibilities: [
              'Perform audit procedures for financial statement audits',
              'Prepare audit working papers and documentation',
              'Conduct substantive testing and analytical review',
            ],
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
            period: { from: '2019-06-01', to: '2025-12-31' },
            positionTitle: 'Administrative Aide IV',
            department: 'City of Cebu - Engineering Office',
            monthlySalary: '16543',
            salaryGrade: 'SG-4 Step 1',
            statusOfAppointment: 'Permanent',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Process incoming and outgoing correspondence',
              'Maintain office filing system and records',
              'Assist in preparation of office reports',
              'Coordinate with other departments for document routing',
            ],
          },
          {
            period: { from: '2015-08-01', to: '2019-05-31' },
            positionTitle: 'Clerk',
            department: 'SM City Cebu - Admin Office',
            monthlySalary: '14000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
            dutiesAndResponsibilities: [
              'Handle administrative paperwork and correspondence',
              'Manage office supplies inventory',
              'Assist in scheduling and calendar management',
            ],
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
            period: { from: '2020-02-01', to: '2025-12-31' },
            positionTitle: 'Administrative Assistant II',
            department: 'Municipality of Minglanilla - Mayor\'s Office',
            monthlySalary: '18018',
            salaryGrade: 'SG-8 Step 1',
            statusOfAppointment: 'Contractual',
            isGovernmentService: true,
            dutiesAndResponsibilities: [
              'Draft official correspondence and memoranda',
              'Manage the Mayor\'s calendar and appointments',
              'Coordinate with department heads on administrative matters',
              'Prepare reports and presentations for meetings',
            ],
          },
          {
            period: { from: '2019-03-01', to: '2020-01-31' },
            positionTitle: 'Office Staff',
            department: 'BPO Solutions Inc.',
            monthlySalary: '16000',
            salaryGrade: '',
            statusOfAppointment: 'Regular',
            isGovernmentService: false,
            dutiesAndResponsibilities: [
              'Handle customer inquiries and complaints',
              'Process documentation and data entry',
              'Coordinate with team leads on daily operations',
            ],
          },
        ],
      },
    },
  });
  console.log('Created Applicant with PDS: Elena Marcos');

  // =============================================
  // CEBU CITY — FULL RSP PIPELINE SEED DATA
  // =============================================
  console.log('\n--- Seeding Cebu City Full Pipeline Data ---');

  // Fetch Cebu City departments
  const engDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Engineering Office' } });
  const healthDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Health Department' } });
  const treasuryDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Treasury Office' } });
  const hrOfficeDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Human Resource Office' } });
  const swDept = await prisma.department.findFirst({ where: { lguId: lgu.id, name: 'Social Welfare Office' } });

  // --- Additional Office Admins for Cebu City ---
  const officeAdminPw = await bcrypt.hash('office123', 12);

  const healthAdmin = await prisma.user.create({
    data: {
      email: 'health@cebucity.gov.ph',
      username: 'cebucityhealth',
      password: officeAdminPw,
      firstName: 'Health',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      lguId: lgu.id,
      departmentId: healthDept?.id,
    },
  });
  console.log('Created Health Office Admin:', healthAdmin.email);

  const treasuryAdminUser = await prisma.user.create({
    data: {
      email: 'treasury@cebucity.gov.ph',
      username: 'cebucitytreasury',
      password: officeAdminPw,
      firstName: 'Treasury',
      lastName: 'Admin',
      role: 'LGU_OFFICE_ADMIN',
      lguId: lgu.id,
      departmentId: treasuryDept?.id,
    },
  });
  console.log('Created Treasury Office Admin:', treasuryAdminUser.email);

  // --- CSC Publication Batches ---
  const batch1 = await prisma.cscPublicationBatch.create({
    data: {
      batchNumber: '2026-001',
      description: 'First quarter regular publication — 5 positions across Engineering, Health, and Treasury offices',
      openDate: new Date('2026-01-15'),
      closeDate: new Date('2026-01-30'),
      isPublished: true,
      publishedAt: new Date('2026-01-15'),
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });

  const batch2 = await prisma.cscPublicationBatch.create({
    data: {
      batchNumber: '2026-002',
      description: 'Second quarter publication — IT and Social Welfare positions',
      openDate: new Date('2026-03-01'),
      closeDate: new Date('2026-03-16'),
      isPublished: false,
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });
  console.log('Created 2 CSC Publication Batches');

  // --- Default Document Requirements Template ---
  const defaultDocReqs = [
    { label: 'Letter of Intent', description: 'Addressed to the City Mayor, indicating Position Title and Plantilla Item No.', isRequired: true, sortOrder: 1 },
    { label: 'Personal Data Sheet (CS Form 212, Revised 2025)', description: 'Fully accomplished PDS with Work Experience Sheet and recent passport-sized photo — single PDF', isRequired: true, sortOrder: 2 },
    { label: 'Performance Rating', description: 'Performance rating in the last rating period (if applicable)', isRequired: false, sortOrder: 3 },
    { label: 'Certificate of Eligibility/Rating/License', description: 'Authenticated copy of civil service eligibility or professional license', isRequired: true, sortOrder: 4 },
    { label: 'Transcript of Records', description: 'Official transcript of records from the school last attended', isRequired: true, sortOrder: 5 },
    { label: 'Training Certificates', description: 'All training certificates compiled in a single PDF (for positions with training requirements)', isRequired: false, sortOrder: 6 },
    { label: 'Designation Orders', description: 'Designation orders (if applicable)', isRequired: false, sortOrder: 7 },
  ];

  // --- Positions ---

  // Position 1: Administrative Officer V (Engineering, 2 slots, OPEN — Batch 1)
  const pos1 = await prisma.position.create({
    data: {
      title: 'Administrative Officer V',
      itemNumber: 'OSEC-ADOF5-12-2026',
      salaryGrade: 18,
      monthlySalary: 51357,
      education: "Bachelor's degree relevant to the job",
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'Administrative management, records management, personnel management, office operations',
      placeOfAssignment: 'Engineering Office, Cebu City Hall',
      description: 'Responsible for administrative support and management of office operations in the Engineering Office. Oversees records management, personnel coordination, and administrative processes.',
      status: 'OPEN',
      openDate: new Date('2026-01-15'),
      closeDate: new Date('2026-01-30'),
      slots: 2,
      lguId: lgu.id,
      departmentId: engDept?.id,
      createdBy: hrAdmin.id,
      cscBatchId: batch1.id,
    },
  });
  for (const req of defaultDocReqs) {
    await prisma.positionDocumentRequirement.create({ data: { positionId: pos1.id, ...req } });
  }

  // Position 2: Nurse III (Health Dept, 1 slot, FILLED — Batch 1)
  const pos2 = await prisma.position.create({
    data: {
      title: 'Nurse III',
      itemNumber: 'OSEC-NRS3-05-2026',
      salaryGrade: 17,
      monthlySalary: 48313,
      education: 'Bachelor of Science in Nursing',
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'RA 1080 (Registered Nurse)',
      competency: 'Patient care, health assessment, community health nursing, immunization program management',
      placeOfAssignment: 'City Health Office, Cebu City',
      description: 'Provides nursing care services at the City Health Office and supervises barangay health workers. Implements immunization and community health programs.',
      status: 'FILLED',
      openDate: new Date('2026-01-15'),
      closeDate: new Date('2026-01-30'),
      slots: 1,
      lguId: lgu.id,
      departmentId: healthDept?.id,
      createdBy: hrAdmin.id,
      cscBatchId: batch1.id,
    },
  });
  for (const req of defaultDocReqs) {
    await prisma.positionDocumentRequirement.create({ data: { positionId: pos2.id, ...req } });
  }

  // Position 3: Accountant II (Treasury, 1 slot, OPEN — Batch 1)
  const pos3 = await prisma.position.create({
    data: {
      title: 'Accountant II',
      itemNumber: 'OSEC-ACNT2-08-2026',
      salaryGrade: 15,
      monthlySalary: 42159,
      education: 'Bachelor of Science in Accountancy',
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'RA 1080 (CPA)',
      competency: 'Government accounting, financial reporting, budget management, audit preparation',
      placeOfAssignment: 'City Treasury Office, Cebu City',
      description: 'Performs accounting and financial management functions for the City Treasury Office including journal entries, financial statements, and COA audit coordination.',
      status: 'OPEN',
      openDate: new Date('2026-01-15'),
      closeDate: new Date('2026-01-30'),
      slots: 1,
      lguId: lgu.id,
      departmentId: treasuryDept?.id,
      createdBy: hrAdmin.id,
      cscBatchId: batch1.id,
    },
  });
  for (const req of defaultDocReqs) {
    await prisma.positionDocumentRequirement.create({ data: { positionId: pos3.id, ...req } });
  }

  // Position 4: IT Officer I (HR Office, 1 slot, DRAFT — Batch 2)
  const pos4 = await prisma.position.create({
    data: {
      title: 'Information Technology Officer I',
      itemNumber: 'OSEC-ITO1-03-2026',
      salaryGrade: 19,
      monthlySalary: 54461,
      education: 'Bachelor of Science in Information Technology, Computer Science, or related field',
      training: '8 hours of relevant training',
      experience: '2 years of relevant experience',
      eligibility: 'Career Service Professional / Second Level Eligibility',
      competency: 'IT infrastructure management, systems administration, cybersecurity, network management',
      placeOfAssignment: 'Human Resource Office, Cebu City Hall',
      description: 'Manages the IT infrastructure and information systems of the LGU. Responsible for network administration, cybersecurity, and technical support across all departments.',
      status: 'DRAFT',
      openDate: new Date('2026-03-01'),
      closeDate: new Date('2026-03-16'),
      slots: 1,
      lguId: lgu.id,
      departmentId: hrOfficeDept?.id,
      createdBy: hrAdmin.id,
      cscBatchId: batch2.id,
    },
  });
  for (const req of defaultDocReqs) {
    await prisma.positionDocumentRequirement.create({ data: { positionId: pos4.id, ...req } });
  }

  // Position 5: Social Welfare Officer II (SW Office, 1 slot, DRAFT — Batch 2)
  const pos5 = await prisma.position.create({
    data: {
      title: 'Social Welfare Officer II',
      itemNumber: 'OSEC-SWO2-06-2026',
      salaryGrade: 15,
      monthlySalary: 42159,
      education: 'Bachelor of Science in Social Work',
      training: '4 hours of relevant training',
      experience: '1 year of relevant experience',
      eligibility: 'RA 1080 (Registered Social Worker)',
      competency: 'Social case management, community development, counseling, program implementation',
      placeOfAssignment: 'Social Welfare Office, Cebu City',
      description: 'Provides social welfare services and case management for the city. Implements community-based programs for vulnerable populations.',
      status: 'DRAFT',
      openDate: new Date('2026-03-01'),
      closeDate: new Date('2026-03-16'),
      slots: 1,
      lguId: lgu.id,
      departmentId: swDept?.id,
      createdBy: hrAdmin.id,
      cscBatchId: batch2.id,
    },
  });
  for (const req of defaultDocReqs) {
    await prisma.positionDocumentRequirement.create({ data: { positionId: pos5.id, ...req } });
  }

  console.log('Created 5 positions for Cebu City (3 open/filled + 2 draft)');

  // =============================================
  // APPLICATIONS — Full Pipeline Demo
  // =============================================
  //
  // Position 1 (Admin Officer V, Engineering, 2 slots):
  //   Juan → APPOINTED | Roberto → SELECTED | Pedro → QUALIFIED
  //   Anna → SHORTLISTED | Elena → ENDORSED
  //
  // Position 2 (Nurse III, Health, 1 slot):
  //   Maria → APPOINTED (position FILLED)
  //
  // Position 3 (Accountant II, Treasury, 1 slot):
  //   Anna → SUBMITTED | Pedro → SUBMITTED
  //

  // --- Position 1 Applications ---
  const app1Juan = await prisma.application.create({
    data: {
      positionId: pos1.id,
      applicantId: applicant.id,
      status: 'APPOINTED',
      submittedAt: new Date('2026-01-16T09:00:00'),
      notes: 'Highest assessment score — appointed to 1st vacancy slot',
    },
  });

  const app1Roberto = await prisma.application.create({
    data: {
      positionId: pos1.id,
      applicantId: applicant3.id,
      status: 'SELECTED',
      submittedAt: new Date('2026-01-17T10:30:00'),
      notes: 'Second highest score — selected for 2nd vacancy slot, pending appointment',
    },
  });

  const app1Pedro = await prisma.application.create({
    data: {
      positionId: pos1.id,
      applicantId: applicant5.id,
      status: 'QUALIFIED',
      submittedAt: new Date('2026-01-18T14:00:00'),
      notes: 'Qualified but not selected — vacancy slots exceeded',
    },
  });

  const app1Anna = await prisma.application.create({
    data: {
      positionId: pos1.id,
      applicantId: applicant4.id,
      status: 'SHORTLISTED',
      submittedAt: new Date('2026-01-19T11:00:00'),
    },
  });

  const app1Elena = await prisma.application.create({
    data: {
      positionId: pos1.id,
      applicantId: applicant6.id,
      status: 'ENDORSED',
      submittedAt: new Date('2026-01-20T08:30:00'),
    },
  });

  // --- Position 2 Application ---
  const app2Maria = await prisma.application.create({
    data: {
      positionId: pos2.id,
      applicantId: applicant2.id,
      status: 'APPOINTED',
      submittedAt: new Date('2026-01-16T10:00:00'),
      notes: 'Sole qualified candidate — position filled',
    },
  });

  // --- Position 3 Applications ---
  const app3Anna = await prisma.application.create({
    data: {
      positionId: pos3.id,
      applicantId: applicant4.id,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-01-20T09:00:00'),
    },
  });

  const app3Pedro = await prisma.application.create({
    data: {
      positionId: pos3.id,
      applicantId: applicant5.id,
      status: 'SUBMITTED',
      submittedAt: new Date('2026-01-21T10:00:00'),
    },
  });

  console.log('Created 8 applications across 3 positions');

  // =============================================
  // INTERVIEW SCHEDULES
  // =============================================

  // Interview for Position 1 — COMPLETED (Juan, Roberto, Pedro all attended)
  const interview1 = await prisma.interviewSchedule.create({
    data: {
      positionId: pos1.id,
      scheduleDate: new Date('2026-02-15T09:00:00'),
      venue: 'Cebu City Hall — Conference Room A, 3rd Floor',
      notes: 'Panel interview for Administrative Officer V candidates. Panel: HR Admin, Engineering Head, HRMPSB Member.',
      status: 'COMPLETED',
      createdBy: hrAdmin.id,
    },
  });

  await prisma.interviewScheduleApplicant.createMany({
    data: [
      { interviewScheduleId: interview1.id, applicationId: app1Juan.id, notified: true, attended: true },
      { interviewScheduleId: interview1.id, applicationId: app1Roberto.id, notified: true, attended: true },
      { interviewScheduleId: interview1.id, applicationId: app1Pedro.id, notified: true, attended: true },
    ],
  });

  // Interview for Position 2 — COMPLETED (Maria attended)
  const interview2 = await prisma.interviewSchedule.create({
    data: {
      positionId: pos2.id,
      scheduleDate: new Date('2026-02-10T09:00:00'),
      venue: 'Cebu City Hall — Conference Room B, 2nd Floor',
      notes: 'Panel interview for Nurse III candidate. Panel: HR Admin, City Health Officer, HRMPSB Member.',
      status: 'COMPLETED',
      createdBy: hrAdmin.id,
    },
  });

  await prisma.interviewScheduleApplicant.create({
    data: {
      interviewScheduleId: interview2.id,
      applicationId: app2Maria.id,
      notified: true,
      attended: true,
    },
  });

  console.log('Created 2 completed interview schedules');

  // =============================================
  // ASSESSMENT SCORES
  // =============================================

  // Position 1 — 3 scored applicants
  await prisma.assessmentScore.create({
    data: {
      applicationId: app1Juan.id,
      positionId: pos1.id,
      educationScore: 14.50,
      trainingScore: 12.00,
      experienceScore: 16.50,
      performanceScore: 15.00,
      psychosocialScore: 13.50,
      potentialScore: 12.50,
      interviewScore: 13.00,
      totalScore: 97.00,
      remarks: 'Strong candidate — excellent government experience and leadership qualities',
      scoredBy: hrAdmin.id,
    },
  });

  await prisma.assessmentScore.create({
    data: {
      applicationId: app1Roberto.id,
      positionId: pos1.id,
      educationScore: 13.00,
      trainingScore: 11.50,
      experienceScore: 15.00,
      performanceScore: 14.50,
      psychosocialScore: 13.00,
      potentialScore: 12.00,
      interviewScore: 12.50,
      totalScore: 91.50,
      remarks: 'Solid engineering background with good administrative potential',
      scoredBy: hrAdmin.id,
    },
  });

  await prisma.assessmentScore.create({
    data: {
      applicationId: app1Pedro.id,
      positionId: pos1.id,
      educationScore: 12.50,
      trainingScore: 10.00,
      experienceScore: 12.00,
      performanceScore: 13.00,
      psychosocialScore: 12.50,
      potentialScore: 11.00,
      interviewScore: 11.50,
      totalScore: 82.50,
      remarks: 'Qualified — good potential, recommended for future administrative openings',
      scoredBy: hrAdmin.id,
    },
  });

  // Position 2 — Maria
  await prisma.assessmentScore.create({
    data: {
      applicationId: app2Maria.id,
      positionId: pos2.id,
      educationScore: 15.00,
      trainingScore: 13.00,
      experienceScore: 17.00,
      performanceScore: 16.00,
      psychosocialScore: 14.50,
      potentialScore: 13.00,
      interviewScore: 14.00,
      totalScore: 102.50,
      remarks: 'Excellent nursing background with extensive government and clinical experience',
      scoredBy: hrAdmin.id,
    },
  });

  console.log('Created 4 assessment scores');

  // =============================================
  // APPOINTMENTS
  // =============================================

  // Appointment 1: Juan — Position 1 (Admin Officer V) — PENDING (3/8 requirements verified)
  const appointment1 = await prisma.appointment.create({
    data: {
      applicationId: app1Juan.id,
      positionId: pos1.id,
      appointmentDate: new Date('2026-03-01'),
      oathDate: new Date('2026-03-05'),
      status: 'PENDING',
      createdBy: hrAdmin.id,
    },
  });

  const juanFinalReqs = [
    { requirementName: 'Oath of Office', description: 'Signed oath of office form (CS Form 32)', isSubmitted: true, isVerified: true, verifiedBy: hrAdmin.id, verifiedAt: new Date('2026-03-06T10:00:00') },
    { requirementName: 'Appointment Form', description: 'Signed appointment form (CS Form 33-B)', isSubmitted: true, isVerified: true, verifiedBy: hrAdmin.id, verifiedAt: new Date('2026-03-06T10:05:00') },
    { requirementName: 'Certificate of Assumption to Duty', description: 'Signed certificate of assumption to duty', isSubmitted: true, isVerified: true, verifiedBy: hrAdmin.id, verifiedAt: new Date('2026-03-07T09:00:00') },
    { requirementName: 'Birth Certificate', description: 'PSA-authenticated birth certificate', isSubmitted: false, isVerified: false },
    { requirementName: 'Marriage Certificate', description: 'PSA-authenticated marriage certificate (if applicable)', isSubmitted: false, isVerified: false },
    { requirementName: 'NBI Clearance', description: 'Valid NBI clearance (issued within the last 6 months)', isSubmitted: false, isVerified: false },
    { requirementName: 'Medical Certificate', description: 'Medical certificate from a government physician', isSubmitted: false, isVerified: false },
    { requirementName: 'Barangay Clearance', description: 'Barangay clearance from place of residence', isSubmitted: false, isVerified: false },
  ];
  for (const req of juanFinalReqs) {
    await prisma.finalRequirement.create({ data: { appointmentId: appointment1.id, ...req } });
  }

  // Appointment 2: Maria — Position 2 (Nurse III) — COMPLETED (all 8/8 verified)
  const appointment2 = await prisma.appointment.create({
    data: {
      applicationId: app2Maria.id,
      positionId: pos2.id,
      appointmentDate: new Date('2026-02-15'),
      oathDate: new Date('2026-02-20'),
      status: 'COMPLETED',
      createdBy: hrAdmin.id,
    },
  });

  const mariaFinalReqNames = [
    'Oath of Office',
    'Appointment Form',
    'Certificate of Assumption to Duty',
    'Birth Certificate',
    'Marriage Certificate',
    'NBI Clearance',
    'Medical Certificate',
    'Barangay Clearance',
  ];
  for (const reqName of mariaFinalReqNames) {
    await prisma.finalRequirement.create({
      data: {
        appointmentId: appointment2.id,
        requirementName: reqName,
        isSubmitted: true,
        isVerified: true,
        verifiedBy: hrAdmin.id,
        verifiedAt: new Date('2026-02-25T10:00:00'),
      },
    });
  }

  console.log('Created 2 appointments (1 pending, 1 completed) with final requirements');

  // =============================================
  // TRAINING — Cebu City L&D Programs
  // =============================================

  const training1 = await prisma.training.create({
    data: {
      title: 'Public Service Values and Ethics',
      description: 'Foundation course on government ethics, public accountability, and the Code of Conduct and Ethical Standards for Public Officials and Employees (RA 6713). Covers anti-graft laws, conflict of interest, and ethical decision-making.',
      type: 'FOUNDATION',
      venue: 'Cebu City Hall — Function Hall, Ground Floor',
      conductedBy: 'Civil Service Commission — Region VII',
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-01-22'),
      numberOfHours: 24,
      status: 'COMPLETED',
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });

  await prisma.trainingParticipant.createMany({
    data: [
      { trainingId: training1.id, firstName: 'Jose', lastName: 'Rizal', department: 'Engineering Office', attended: true, completedAt: new Date('2026-01-22') },
      { trainingId: training1.id, firstName: 'Andres', lastName: 'Bonifacio', department: 'Treasury Office', attended: true, completedAt: new Date('2026-01-22') },
      { trainingId: training1.id, firstName: 'Gabriela', lastName: 'Silang', department: 'Human Resource Office', attended: true, completedAt: new Date('2026-01-22') },
      { trainingId: training1.id, firstName: 'Apolinario', lastName: 'Mabini', department: 'Engineering Office', attended: true, completedAt: new Date('2026-01-22') },
      { trainingId: training1.id, firstName: 'Emilio', lastName: 'Aguinaldo', department: 'Health Department', attended: false, remarks: 'On approved leave — reschedule to next batch' },
    ],
  });

  const training2 = await prisma.training.create({
    data: {
      title: 'Records Management and Digital Archiving',
      description: 'Technical training on proper records management, document classification, retention schedules, and transition to digital archiving for government offices. Includes hands-on exercises with the Electronic Records Management System (ERMS).',
      type: 'TECHNICAL',
      venue: 'Cebu City Hall — Training Room 2, 2nd Floor',
      conductedBy: 'National Archives of the Philippines',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-14'),
      numberOfHours: 40,
      status: 'ONGOING',
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });

  await prisma.trainingParticipant.createMany({
    data: [
      { trainingId: training2.id, firstName: 'Gabriela', lastName: 'Silang', department: 'Human Resource Office', attended: null },
      { trainingId: training2.id, firstName: 'Melchora', lastName: 'Aquino', department: 'Social Welfare Office', attended: null },
      { trainingId: training2.id, firstName: 'Teresa', lastName: 'Magbanua', department: 'Treasury Office', attended: null },
      { trainingId: training2.id, firstName: 'Diego', lastName: 'Silang', department: 'Engineering Office', attended: null },
    ],
  });

  const training3 = await prisma.training.create({
    data: {
      title: 'Leadership and Supervisory Development Program',
      description: 'Supervisory course covering leadership styles, team management, conflict resolution, performance coaching, and strategic planning for newly promoted supervisors and division heads.',
      type: 'SUPERVISORY',
      venue: 'Cebu City Marriott Hotel — Ballroom C',
      conductedBy: 'Development Academy of the Philippines',
      startDate: new Date('2026-04-07'),
      endDate: new Date('2026-04-11'),
      numberOfHours: 40,
      status: 'UPCOMING',
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });

  const training4 = await prisma.training.create({
    data: {
      title: 'Gender and Development (GAD) Sensitivity Training',
      description: 'Managerial training on gender mainstreaming, GAD planning and budgeting, anti-VAWC laws, and creating gender-responsive programs in local government.',
      type: 'MANAGERIAL',
      venue: 'Cebu City Hall — Function Hall, Ground Floor',
      conductedBy: 'Philippine Commission on Women',
      startDate: new Date('2026-02-24'),
      endDate: new Date('2026-02-26'),
      numberOfHours: 24,
      status: 'COMPLETED',
      lguId: lgu.id,
      createdBy: hrAdmin.id,
    },
  });

  await prisma.trainingParticipant.createMany({
    data: [
      { trainingId: training4.id, firstName: 'Josefa', lastName: 'Llanes Escoda', department: 'Social Welfare Office', attended: true, completedAt: new Date('2026-02-26') },
      { trainingId: training4.id, firstName: 'Melchora', lastName: 'Aquino', department: 'Social Welfare Office', attended: true, completedAt: new Date('2026-02-26') },
      { trainingId: training4.id, firstName: 'Gabriela', lastName: 'Silang', department: 'Human Resource Office', attended: true, completedAt: new Date('2026-02-26') },
    ],
  });

  console.log('Created 4 trainings for Cebu City (2 completed, 1 ongoing, 1 upcoming)');

  // =============================================
  // AUDIT LOGS — Application Status Transitions
  // =============================================

  const auditLogs: Array<{
    userId: number;
    action: string;
    entity: string;
    entityId: number;
    oldValues: any;
    newValues: any;
    ipAddress: string;
    createdAt: Date;
  }> = [];

  const addLog = (userId: number, action: string, entity: string, entityId: number, oldValues: any, newValues: any, createdAt: Date) => {
    auditLogs.push({ userId, action, entity, entityId, oldValues, newValues, ipAddress: '192.168.1.100', createdAt });
  };

  // --- Juan (Position 1): SUBMITTED → ENDORSED → SHORTLISTED → FOR_INTERVIEW → INTERVIEWED → QUALIFIED → SELECTED → APPOINTED ---
  addLog(applicant.id, 'SUBMIT_APPLICATION', 'application', app1Juan.id, null, { status: 'SUBMITTED', positionId: pos1.id, applicantId: applicant.id }, new Date('2026-01-16T09:00:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app1Juan.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-25T10:00:00'));
  addLog(officeAdmin.id, 'SHORTLIST_APPLICATION', 'application', app1Juan.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-01-30T14:00:00'));
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'application', app1Juan.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-10T09:00:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'application', app1Juan.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-02-15T16:00:00'));
  addLog(hrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', app1Juan.id, null, { totalScore: 97.00 }, new Date('2026-02-18T09:00:00'));
  addLog(hrAdmin.id, 'QUALIFY_APPLICANTS', 'application', app1Juan.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-02-20T10:00:00'));
  addLog(hrAdmin.id, 'SELECT_APPLICANTS', 'application', app1Juan.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-02-25T10:00:00'));
  addLog(hrAdmin.id, 'CREATE_APPOINTMENT', 'application', app1Juan.id, { status: 'SELECTED' }, { status: 'APPOINTED' }, new Date('2026-03-01T09:00:00'));

  // --- Roberto (Position 1): SUBMITTED → ... → SELECTED ---
  addLog(applicant3.id, 'SUBMIT_APPLICATION', 'application', app1Roberto.id, null, { status: 'SUBMITTED', positionId: pos1.id, applicantId: applicant3.id }, new Date('2026-01-17T10:30:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app1Roberto.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-25T10:15:00'));
  addLog(officeAdmin.id, 'SHORTLIST_APPLICATION', 'application', app1Roberto.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-01-30T14:30:00'));
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'application', app1Roberto.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-10T09:05:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'application', app1Roberto.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-02-15T16:05:00'));
  addLog(hrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', app1Roberto.id, null, { totalScore: 91.50 }, new Date('2026-02-18T09:15:00'));
  addLog(hrAdmin.id, 'QUALIFY_APPLICANTS', 'application', app1Roberto.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-02-20T10:05:00'));
  addLog(hrAdmin.id, 'SELECT_APPLICANTS', 'application', app1Roberto.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-02-25T10:05:00'));

  // --- Pedro (Position 1): SUBMITTED → ... → QUALIFIED ---
  addLog(applicant5.id, 'SUBMIT_APPLICATION', 'application', app1Pedro.id, null, { status: 'SUBMITTED', positionId: pos1.id, applicantId: applicant5.id }, new Date('2026-01-18T14:00:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app1Pedro.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-25T10:30:00'));
  addLog(officeAdmin.id, 'SHORTLIST_APPLICATION', 'application', app1Pedro.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-01-30T15:00:00'));
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'application', app1Pedro.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-10T09:10:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'application', app1Pedro.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-02-15T16:10:00'));
  addLog(hrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', app1Pedro.id, null, { totalScore: 82.50 }, new Date('2026-02-18T09:30:00'));
  addLog(hrAdmin.id, 'QUALIFY_APPLICANTS', 'application', app1Pedro.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-02-20T10:10:00'));

  // --- Anna (Position 1): SUBMITTED → ENDORSED → SHORTLISTED ---
  addLog(applicant4.id, 'SUBMIT_APPLICATION', 'application', app1Anna.id, null, { status: 'SUBMITTED', positionId: pos1.id, applicantId: applicant4.id }, new Date('2026-01-19T11:00:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app1Anna.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-26T09:00:00'));
  addLog(officeAdmin.id, 'SHORTLIST_APPLICATION', 'application', app1Anna.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-01-31T10:00:00'));

  // --- Elena (Position 1): SUBMITTED → ENDORSED ---
  addLog(applicant6.id, 'SUBMIT_APPLICATION', 'application', app1Elena.id, null, { status: 'SUBMITTED', positionId: pos1.id, applicantId: applicant6.id }, new Date('2026-01-20T08:30:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app1Elena.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-26T09:30:00'));

  // --- Maria (Position 2): SUBMITTED → ... → APPOINTED ---
  addLog(applicant2.id, 'SUBMIT_APPLICATION', 'application', app2Maria.id, null, { status: 'SUBMITTED', positionId: pos2.id, applicantId: applicant2.id }, new Date('2026-01-16T10:00:00'));
  addLog(hrAdmin.id, 'ENDORSE_APPLICATION', 'application', app2Maria.id, { status: 'SUBMITTED' }, { status: 'ENDORSED' }, new Date('2026-01-24T11:00:00'));
  addLog(healthAdmin.id, 'SHORTLIST_APPLICATION', 'application', app2Maria.id, { status: 'ENDORSED' }, { status: 'SHORTLISTED' }, new Date('2026-01-28T10:00:00'));
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'application', app2Maria.id, { status: 'SHORTLISTED' }, { status: 'FOR_INTERVIEW' }, new Date('2026-02-05T09:00:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'application', app2Maria.id, { status: 'FOR_INTERVIEW' }, { status: 'INTERVIEWED' }, new Date('2026-02-10T16:00:00'));
  addLog(hrAdmin.id, 'SAVE_ASSESSMENT_SCORE', 'application', app2Maria.id, null, { totalScore: 102.50 }, new Date('2026-02-11T09:00:00'));
  addLog(hrAdmin.id, 'QUALIFY_APPLICANTS', 'application', app2Maria.id, { status: 'INTERVIEWED' }, { status: 'QUALIFIED' }, new Date('2026-02-12T10:00:00'));
  addLog(hrAdmin.id, 'SELECT_APPLICANTS', 'application', app2Maria.id, { status: 'QUALIFIED' }, { status: 'SELECTED' }, new Date('2026-02-13T10:00:00'));
  addLog(hrAdmin.id, 'CREATE_APPOINTMENT', 'application', app2Maria.id, { status: 'SELECTED' }, { status: 'APPOINTED' }, new Date('2026-02-15T09:00:00'));

  // --- Anna & Pedro (Position 3): SUBMITTED ---
  addLog(applicant4.id, 'SUBMIT_APPLICATION', 'application', app3Anna.id, null, { status: 'SUBMITTED', positionId: pos3.id, applicantId: applicant4.id }, new Date('2026-01-20T09:00:00'));
  addLog(applicant5.id, 'SUBMIT_APPLICATION', 'application', app3Pedro.id, null, { status: 'SUBMITTED', positionId: pos3.id, applicantId: applicant5.id }, new Date('2026-01-21T10:00:00'));

  // --- Appointment Audit Logs ---
  addLog(hrAdmin.id, 'CREATE_APPOINTMENT', 'appointment', appointment1.id, null, { applicationId: app1Juan.id, positionId: pos1.id, appointmentDate: '2026-03-01', oathDate: '2026-03-05', status: 'PENDING' }, new Date('2026-03-01T09:00:00'));
  addLog(hrAdmin.id, 'CREATE_APPOINTMENT', 'appointment', appointment2.id, null, { applicationId: app2Maria.id, positionId: pos2.id, appointmentDate: '2026-02-15', oathDate: '2026-02-20', status: 'PENDING' }, new Date('2026-02-15T09:00:00'));
  addLog(hrAdmin.id, 'UPDATE_APPOINTMENT', 'appointment', appointment2.id, { status: 'PENDING' }, { status: 'COMPLETED' }, new Date('2026-02-25T10:30:00'));

  // --- Final Requirement Verification Logs ---
  addLog(hrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', appointment1.id, null, { requirementName: 'Oath of Office', verified: true }, new Date('2026-03-06T10:00:00'));
  addLog(hrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', appointment1.id, null, { requirementName: 'Appointment Form', verified: true }, new Date('2026-03-06T10:05:00'));
  addLog(hrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', appointment1.id, null, { requirementName: 'Certificate of Assumption to Duty', verified: true }, new Date('2026-03-07T09:00:00'));

  // Maria's 8 requirements all verified at once
  for (const reqName of mariaFinalReqNames) {
    addLog(hrAdmin.id, 'VERIFY_REQUIREMENT', 'appointment', appointment2.id, null, { requirementName: reqName, verified: true }, new Date('2026-02-25T10:00:00'));
  }

  // --- Interview Audit Logs ---
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'interview_schedule', interview1.id, null, { positionId: pos1.id, scheduleDate: '2026-02-15', venue: 'Conference Room A' }, new Date('2026-02-08T09:00:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'interview_schedule', interview1.id, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('2026-02-15T16:30:00'));
  addLog(hrAdmin.id, 'CREATE_INTERVIEW', 'interview_schedule', interview2.id, null, { positionId: pos2.id, scheduleDate: '2026-02-10', venue: 'Conference Room B' }, new Date('2026-02-03T09:00:00'));
  addLog(hrAdmin.id, 'COMPLETE_INTERVIEW', 'interview_schedule', interview2.id, { status: 'SCHEDULED' }, { status: 'COMPLETED' }, new Date('2026-02-10T16:30:00'));

  // --- CSC Batch Audit Logs ---
  addLog(hrAdmin.id, 'CREATE', 'csc_publication_batch', batch1.id, null, { batchNumber: '2026-001', description: 'First quarter regular publication' }, new Date('2026-01-10T09:00:00'));
  addLog(hrAdmin.id, 'UPDATE', 'csc_publication_batch', batch1.id, { isPublished: false }, { isPublished: true }, new Date('2026-01-15T08:00:00'));
  addLog(hrAdmin.id, 'CREATE', 'csc_publication_batch', batch2.id, null, { batchNumber: '2026-002', description: 'Second quarter publication' }, new Date('2026-02-28T09:00:00'));

  // --- Training Audit Logs ---
  addLog(hrAdmin.id, 'CREATE', 'training', training1.id, null, { title: 'Public Service Values and Ethics', type: 'FOUNDATION' }, new Date('2026-01-08T09:00:00'));
  addLog(hrAdmin.id, 'UPDATE', 'training', training1.id, { status: 'UPCOMING' }, { status: 'COMPLETED' }, new Date('2026-01-22T17:00:00'));
  addLog(hrAdmin.id, 'CREATE', 'training', training2.id, null, { title: 'Records Management and Digital Archiving', type: 'TECHNICAL' }, new Date('2026-03-01T09:00:00'));
  addLog(hrAdmin.id, 'UPDATE', 'training', training2.id, { status: 'UPCOMING' }, { status: 'ONGOING' }, new Date('2026-03-10T08:00:00'));
  addLog(hrAdmin.id, 'CREATE', 'training', training3.id, null, { title: 'Leadership and Supervisory Development Program', type: 'SUPERVISORY' }, new Date('2026-03-15T09:00:00'));
  addLog(hrAdmin.id, 'CREATE', 'training', training4.id, null, { title: 'Gender and Development Sensitivity Training', type: 'MANAGERIAL' }, new Date('2026-02-10T09:00:00'));
  addLog(hrAdmin.id, 'UPDATE', 'training', training4.id, { status: 'UPCOMING' }, { status: 'COMPLETED' }, new Date('2026-02-26T17:00:00'));

  // Bulk insert all audit logs
  await prisma.auditLog.createMany({ data: auditLogs });
  console.log(`Created ${auditLogs.length} audit logs for Cebu City pipeline`);

  console.log('\n--- Cebu City Full Pipeline Seed Complete ---');
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
