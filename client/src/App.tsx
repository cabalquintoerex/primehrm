import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { useAuthStore } from '@/stores/authStore';

// Lazy-loaded pages
const ModuleLauncherPage = lazy(() => import('@/features/modules/ModuleLauncherPage').then(m => ({ default: m.ModuleLauncherPage })));
const AdminDashboardPage = lazy(() => import('@/features/dashboard/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const RspDashboardPage = lazy(() => import('@/features/dashboard/RspDashboardPage').then(m => ({ default: m.RspDashboardPage })));
const LndDashboardPage = lazy(() => import('@/features/dashboard/LndDashboardPage').then(m => ({ default: m.LndDashboardPage })));
const LguPage = lazy(() => import('@/features/lgu/LguPage').then(m => ({ default: m.LguPage })));
const DepartmentPage = lazy(() => import('@/features/departments/DepartmentPage').then(m => ({ default: m.DepartmentPage })));
const UserPage = lazy(() => import('@/features/users/UserPage').then(m => ({ default: m.UserPage })));
const PositionPage = lazy(() => import('@/features/positions/PositionPage').then(m => ({ default: m.PositionPage })));
const CareersPage = lazy(() => import('@/features/careers/CareersPage').then(m => ({ default: m.CareersPage })));
const PositionDetailPage = lazy(() => import('@/features/careers/PositionDetailPage').then(m => ({ default: m.PositionDetailPage })));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ApplicantDashboard = lazy(() => import('@/features/apply/ApplicantDashboard').then(m => ({ default: m.ApplicantDashboard })));
const MyApplicationsPage = lazy(() => import('@/features/apply/MyApplicationsPage').then(m => ({ default: m.MyApplicationsPage })));
const PDSFormPage = lazy(() => import('@/features/pds/PDSFormPage').then(m => ({ default: m.PDSFormPage })));
const PsbMemberPage = lazy(() => import('@/features/psb/PsbMemberPage').then(m => ({ default: m.PsbMemberPage })));
const WESFormPage = lazy(() => import('@/features/wes/WESFormPage').then(m => ({ default: m.WESFormPage })));
const ApplyPage = lazy(() => import('@/features/apply/ApplyPage').then(m => ({ default: m.ApplyPage })));
const ApplicationsPage = lazy(() => import('@/features/applications/ApplicationsPage').then(m => ({ default: m.ApplicationsPage })));
const ApplicationDetailPage = lazy(() => import('@/features/applications/ApplicationDetailPage').then(m => ({ default: m.ApplicationDetailPage })));
const InterviewsPage = lazy(() => import('@/features/interviews/InterviewsPage').then(m => ({ default: m.InterviewsPage })));
const InterviewDetailPage = lazy(() => import('@/features/interviews/InterviewDetailPage').then(m => ({ default: m.InterviewDetailPage })));
const AssessmentPage = lazy(() => import('@/features/interviews/AssessmentPage').then(m => ({ default: m.AssessmentPage })));
const SelectionPage = lazy(() => import('@/features/selection/SelectionPage').then(m => ({ default: m.SelectionPage })));
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage').then(m => ({ default: m.AppointmentsPage })));
const AppointmentDetailPage = lazy(() => import('@/features/appointments/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage })));
const TrainingPage = lazy(() => import('@/features/training/TrainingPage').then(m => ({ default: m.TrainingPage })));
const TrainingDetailPage = lazy(() => import('@/features/training/TrainingDetailPage').then(m => ({ default: m.TrainingDetailPage })));
const PublicationPage = lazy(() => import('@/features/publications/PublicationPage').then(m => ({ default: m.PublicationPage })));
const PublicationDetailPage = lazy(() => import('@/features/publications/PublicationDetailPage').then(m => ({ default: m.PublicationDetailPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ProcessFlowPage = lazy(() => import('@/features/process-flow/ProcessFlowPage').then(m => ({ default: m.ProcessFlowPage })));
const RspReportsPage = lazy(() => import('@/features/reports/RspReportsPage').then(m => ({ default: m.RspReportsPage })));
const LndReportsPage = lazy(() => import('@/features/reports/LndReportsPage').then(m => ({ default: m.LndReportsPage })));
const AuditLogPage = lazy(() => import('@/features/audit-logs/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}/login`} replace />;
}

/**
 * Preserves bookmarks from before the module split: `/admin/positions/3` → `/rsp/positions/3`.
 * Mounted per moved segment so the surviving `/admin/*` pages are untouched.
 */
function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  // Everything after `/admin/<segment>` — e.g. "3" in `/admin/positions/3`.
  const rest = location.pathname.split('/').slice(3).join('/');
  const target = rest ? `${to}/${rest}` : to;
  return <Navigate to={`${target}${location.search}`} replace />;
}

/** Super admins get the system-overview dashboard; HR admins land on Departments. */
function AdminIndexRedirect() {
  const { user } = useAuthStore();
  return <Navigate to={user?.role === 'SUPER_ADMIN' ? 'dashboard' : 'departments'} replace />;
}

const RSP_ADMINS = ['SUPER_ADMIN', 'LGU_HR_ADMIN'];
const RSP_ALL = ['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN'];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LoginPage />} />
            <Route path="/:slug" element={<SlugRedirect />} />
            <Route path="/:slug/login" element={<LoginPage />} />
            <Route path="/:slug/careers" element={<CareersPage />} />
            <Route path="/:slug/careers/:id" element={<PositionDetailPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Module launcher */}
            <Route
              path="/modules"
              element={
                <ProtectedRoute allowedRoles={RSP_ALL}>
                  <ModuleLauncherPage />
                </ProtectedRoute>
              }
            />

            {/* Protected applicant routes */}
            <Route
              path="/applicant"
              element={
                <ProtectedRoute allowedRoles={['APPLICANT']}>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ApplicantDashboard />} />
              <Route path="applications" element={<MyApplicationsPage />} />
              <Route path="pds" element={<PDSFormPage />} />
              <Route path="wes" element={<WESFormPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="process-flow" element={<ProcessFlowPage />} />
            </Route>

            {/* Apply page (standalone, no sidebar layout) */}
            <Route
              path="/apply/:slug/:positionId"
              element={
                <ProtectedRoute allowedRoles={['APPLICANT']}>
                  <ApplyPage />
                </ProtectedRoute>
              }
            />

            {/* ---- Module: Recruitment, Selection & Placement ---- */}
            <Route
              path="/rsp"
              element={
                <ProtectedRoute module="RSP">
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<RspDashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="process-flow" element={<ProcessFlowPage />} />
              <Route
                path="positions"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><PositionPage /></ProtectedRoute>}
              />
              <Route
                path="publications"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><PublicationPage /></ProtectedRoute>}
              />
              <Route
                path="publications/:id"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><PublicationDetailPage /></ProtectedRoute>}
              />
              <Route
                path="applications"
                element={<ProtectedRoute allowedRoles={RSP_ALL}><ApplicationsPage /></ProtectedRoute>}
              />
              <Route
                path="applications/:id"
                element={<ProtectedRoute allowedRoles={RSP_ALL}><ApplicationDetailPage /></ProtectedRoute>}
              />
              <Route
                path="interviews"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><InterviewsPage /></ProtectedRoute>}
              />
              <Route
                path="interviews/:id"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><InterviewDetailPage /></ProtectedRoute>}
              />
              <Route
                path="assessments/:positionId"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><AssessmentPage /></ProtectedRoute>}
              />
              <Route
                path="selection"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><SelectionPage /></ProtectedRoute>}
              />
              <Route
                path="appointments"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><AppointmentsPage /></ProtectedRoute>}
              />
              <Route
                path="appointments/:id"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><AppointmentDetailPage /></ProtectedRoute>}
              />
              <Route
                path="reports"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><RspReportsPage /></ProtectedRoute>}
              />
            </Route>

            {/* ---- Module: Learning & Development ---- */}
            <Route
              path="/lnd"
              element={
                <ProtectedRoute module="LND">
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<LndDashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="training"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><TrainingPage /></ProtectedRoute>}
              />
              <Route
                path="training/:id"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><TrainingDetailPage /></ProtectedRoute>}
              />
              <Route
                path="reports"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><LndReportsPage /></ProtectedRoute>}
              />
            </Route>

            {/* ---- Module: Administration ---- */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute module="ADMIN">
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminIndexRedirect />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route
                path="dashboard"
                element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboardPage /></ProtectedRoute>}
              />
              <Route
                path="lgus"
                element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><LguPage /></ProtectedRoute>}
              />
              <Route
                path="departments"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><DepartmentPage /></ProtectedRoute>}
              />
              <Route
                path="users"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><UserPage /></ProtectedRoute>}
              />
              <Route
                path="psb-members"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><PsbMemberPage /></ProtectedRoute>}
              />
              <Route
                path="audit-logs"
                element={<ProtectedRoute allowedRoles={RSP_ADMINS}><AuditLogPage /></ProtectedRoute>}
              />
            </Route>

            {/* Legacy paths from before the RSP / L&D module split */}
            <Route path="/admin/dashboard/*" element={<LegacyRedirect to="/rsp/dashboard" />} />
            <Route path="/admin/csc-batches/*" element={<LegacyRedirect to="/rsp/publications" />} />
            <Route path="/rsp/csc-batches/*" element={<LegacyRedirect to="/rsp/publications" />} />
            <Route path="/admin/positions/*" element={<LegacyRedirect to="/rsp/positions" />} />
            <Route path="/admin/applications/*" element={<LegacyRedirect to="/rsp/applications" />} />
            <Route path="/admin/interviews/*" element={<LegacyRedirect to="/rsp/interviews" />} />
            <Route path="/admin/assessments/*" element={<LegacyRedirect to="/rsp/assessments" />} />
            <Route path="/admin/selection/*" element={<LegacyRedirect to="/rsp/selection" />} />
            <Route path="/admin/appointments/*" element={<LegacyRedirect to="/rsp/appointments" />} />
            <Route path="/admin/reports/*" element={<LegacyRedirect to="/rsp/reports" />} />
            <Route path="/admin/process-flow/*" element={<LegacyRedirect to="/rsp/process-flow" />} />
            <Route path="/admin/training/*" element={<LegacyRedirect to="/lnd/training" />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}

export default App;
