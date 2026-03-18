export interface Lgu {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  headerBg: string | null;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    departments: number;
    positions: number;
  };
}

export interface User {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lguId: number | null;
  departmentId: number | null;
  createdAt: string;
  lgu?: Pick<Lgu, 'id' | 'name' | 'slug' | 'logo'> | null;
  department?: Pick<Department, 'id' | 'name'> | null;
}

export type UserRole = 'SUPER_ADMIN' | 'LGU_HR_ADMIN' | 'LGU_OFFICE_ADMIN' | 'APPLICANT';

export interface Department {
  id: number;
  name: string;
  code: string | null;
  lguId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lgu?: Pick<Lgu, 'id' | 'name'>;
  _count?: {
    users: number;
  };
}

export type PositionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'FILLED';

export interface Position {
  id: number;
  title: string;
  itemNumber: string | null;
  salaryGrade: number | null;
  monthlySalary: number | string | null;
  education: string | null;
  training: string | null;
  experience: string | null;
  eligibility: string | null;
  competency: string | null;
  placeOfAssignment: string | null;
  description: string | null;
  requirements: Record<string, any> | null;
  status: PositionStatus;
  openDate: string | null;
  closeDate: string | null;
  slots: number;
  lguId: number;
  departmentId: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  cscBatchId?: number | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  cscBatch?: Pick<CscPublicationBatch, 'id' | 'batchNumber' | 'isPublished'> | null;
}

export interface CscPublicationBatch {
  id: number;
  batchNumber: string;
  description: string | null;
  openDate: string;
  closeDate: string;
  isPublished: boolean;
  publishedAt: string | null;
  lguId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  lgu?: Pick<Lgu, 'id' | 'name' | 'slug'> & { address?: string | null; contactNumber?: string | null; email?: string | null };
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  positions?: Position[];
  _count?: { positions: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PositionDocumentRequirement {
  id: number;
  positionId: number;
  label: string;
  description: string | null;
  isRequired: boolean;
  sortOrder: number;
}

export type ApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ENDORSED' | 'SHORTLISTED' | 'FOR_INTERVIEW' | 'INTERVIEWED' | 'QUALIFIED' | 'SELECTED' | 'APPOINTED' | 'REJECTED' | 'WITHDRAWN';

export interface Application {
  id: number;
  positionId: number;
  applicantId: number;
  status: ApplicationStatus;
  submittedAt: string;
  notes: string | null;
  position?: Position;
  applicant?: User;
  documents?: ApplicationDocument[];
}

export interface ApplicationDocument {
  id: number;
  applicationId: number;
  requirementId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  requirement?: PositionDocumentRequirement;
}

export interface PersonalDataSheet {
  id: number;
  userId: number;
  data: PDSData;
  version: number;
}

export interface PDSData {
  // Personal Information
  surname: string;
  firstName: string;
  middleName: string;
  nameExtension: string;
  dateOfBirth: string;
  placeOfBirth: string;
  sex: string;
  civilStatus: string;
  civilStatusOther: string;
  height: string;
  weight: string;
  bloodType: string;
  gsisIdNo: string;
  umidIdNo: string;
  pagibigIdNo: string;
  philhealthNo: string;
  sssNo: string;
  philsysNo: string;
  tinNo: string;
  agencyEmployeeNo: string;
  citizenship: string;
  citizenshipType: string;
  citizenshipCountry: string;
  residentialAddress: {
    houseNo: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
  permanentAddress: {
    houseNo: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
  telephoneNo: string;
  mobileNo: string;
  emailAddress: string;
  // Family Background
  spouseSurname: string;
  spouseFirstName: string;
  spouseMiddleName: string;
  spouseNameExtension: string;
  spouseOccupation: string;
  spouseEmployerName: string;
  spouseEmployerAddress: string;
  spouseTelephoneNo: string;
  fatherSurname: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherNameExtension: string;
  motherMaidenSurname: string;
  motherFirstName: string;
  motherMiddleName: string;
  children: Array<{ name: string; dateOfBirth: string }>;
  // Educational Background
  education: Array<{
    level: string;
    schoolName: string;
    degree: string;
    period: { from: string; to: string };
    units: string;
    yearGraduated: string;
    honors: string;
  }>;
  // Civil Service Eligibility
  eligibilities: Array<{
    name: string;
    rating: string;
    dateOfExam: string;
    placeOfExam: string;
    licenseNo: string;
    licenseValidity: string;
  }>;
  // Work Experience
  workExperience: Array<{
    period: { from: string; to: string };
    positionTitle: string;
    department: string;
    monthlySalary: string;
    salaryGrade: string;
    statusOfAppointment: string;
    isGovernmentService: boolean;
  }>;
  // Voluntary Work
  voluntaryWork: Array<{
    organization: string;
    period: { from: string; to: string };
    numberOfHours: string;
    position: string;
  }>;
  // Learning and Development
  learningDevelopment: Array<{
    title: string;
    period: { from: string; to: string };
    numberOfHours: string;
    type: string;
    conductor: string;
  }>;
  // Other Information
  specialSkills: string[];
  nonAcademicDistinctions: string[];
  membershipInAssociations: string[];
  // References
  references: Array<{
    name: string;
    address: string;
    telephoneNo: string;
    email: string;
  }>;
  // Questions (34-40) — CS Form 212 Revised 2025 Page 4
  questions: {
    q34a: string; // related within 3rd degree
    q34aDetails: string;
    q34b: string; // related within 4th degree (LGU)
    q34bDetails: string;
    q35a: string; // guilty of admin offense
    q35aDetails: string;
    q35b: string; // criminally charged
    q35bDetails: string;
    q35bDateFiled: string;
    q35bStatus: string;
    q36: string; // convicted of crime
    q36Details: string;
    q37: string; // separated from service
    q37Details: string;
    q38a: string; // candidate in election
    q38aDetails: string;
    q38b: string; // resigned before election
    q38bDetails: string;
    q39: string; // immigrant/permanent resident
    q39Details: string;
    q40a: string; // indigenous group member
    q40aDetails: string;
    q40b: string; // person with disability
    q40bDetails: string;
    q40c: string; // solo parent
    q40cDetails: string;
  };
  // Government ID & Declaration
  governmentIssuedId: string;
  governmentIdNo: string;
  governmentIdIssuance: string;
}

export interface WorkExperienceSheet {
  id: number;
  userId: number;
  data: WESData;
  version: number;
}

export interface WESData {
  entries: Array<{
    period: { from: string; to: string };
    positionTitle: string;
    department: string;
    monthlySalary: string;
    salaryGrade: string;
    statusOfAppointment: string;
    isGovernmentService: boolean;
    dutiesAndResponsibilities: string[];
  }>;
}

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface InterviewSchedule {
  id: number;
  positionId: number;
  scheduleDate: string;
  venue: string | null;
  notes: string | null;
  status: InterviewStatus;
  createdBy: number;
  createdAt: string;
  position?: Pick<Position, 'id' | 'title' | 'itemNumber'> & { department?: Pick<Department, 'id' | 'name'> | null };
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  applicants?: InterviewScheduleApplicant[];
  _count?: { applicants: number };
}

export interface InterviewScheduleApplicant {
  id: number;
  interviewScheduleId: number;
  applicationId: number;
  notified: boolean;
  attended: boolean | null;
  application?: Application;
}

export type AppointmentStatus = 'PENDING' | 'COMPLETED';

export interface Appointment {
  id: number;
  applicationId: number;
  positionId: number;
  appointmentDate: string;
  oathDate: string | null;
  status: AppointmentStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  application?: Application & {
    assessmentScore?: AssessmentScore | null;
  };
  position?: Pick<Position, 'id' | 'title' | 'itemNumber' | 'salaryGrade' | 'monthlySalary' | 'placeOfAssignment' | 'slots'> & {
    department?: Pick<Department, 'id' | 'name'> | null;
    lgu?: Pick<Lgu, 'id' | 'name' | 'slug' | 'logo' | 'address'> | null;
  };
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  finalRequirements?: FinalRequirement[];
  pds?: PersonalDataSheet | null;
  _count?: { finalRequirements: number };
}

export interface FinalRequirement {
  id: number;
  appointmentId: number;
  requirementName: string;
  description: string | null;
  isSubmitted: boolean;
  isVerified: boolean;
  verifiedBy: number | null;
  verifiedAt: string | null;
  filePath: string | null;
  verifier?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
}

export type TrainingType = 'MANAGERIAL' | 'SUPERVISORY' | 'TECHNICAL' | 'FOUNDATION';
export type TrainingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Training {
  id: number;
  title: string;
  description: string | null;
  type: TrainingType;
  venue: string | null;
  conductedBy: string | null;
  startDate: string;
  endDate: string;
  numberOfHours: number | string | null;
  status: TrainingStatus;
  lguId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  participants?: TrainingParticipant[];
  _count?: { participants: number };
}

export interface TrainingParticipant {
  id: number;
  trainingId: number;
  firstName: string;
  lastName: string;
  department: string | null;
  attended: boolean | null;
  completedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentScore {
  id: number;
  applicationId: number;
  positionId: number;
  educationScore: number | string | null;
  trainingScore: number | string | null;
  experienceScore: number | string | null;
  performanceScore: number | string | null;
  psychosocialScore: number | string | null;
  potentialScore: number | string | null;
  interviewScore: number | string | null;
  totalScore: number | string | null;
  remarks: string | null;
  scoredBy: number;
  application?: Application;
  position?: Pick<Position, 'id' | 'title' | 'itemNumber' | 'slots' | 'departmentId'> & { department?: Pick<Department, 'id' | 'name'> | null };
  scorer?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}
