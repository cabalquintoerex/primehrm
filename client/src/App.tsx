import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
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
const CscBatchPage = lazy(() => import('@/features/csc-batches/CscBatchPage').then(m => ({ default: m.CscBatchPage })));
const CscBatchDetailPage = lazy(() => import('@/features/csc-batches/CscBatchDetailPage').then(m => ({ default: m.CscBatchDetailPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ProcessFlowPage = lazy(() => import('@/features/process-flow/ProcessFlowPage').then(m => ({ default: m.ProcessFlowPage })));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
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

            {/* Protected admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="process-flow" element={<ProcessFlowPage />} />
              <Route
                path="lgus"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <LguPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="departments"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <DepartmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="positions"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <PositionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="csc-batches"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <CscBatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="csc-batches/:id"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <CscBatchDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <UserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="applications"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN']}>
                    <ApplicationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="applications/:id"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN', 'LGU_OFFICE_ADMIN']}>
                    <ApplicationDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="interviews"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <InterviewsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="interviews/:id"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <InterviewDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="assessments/:positionId"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <AssessmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="selection"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <SelectionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appointments"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <AppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appointments/:id"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <AppointmentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <TrainingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/:id"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <TrainingDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LGU_HR_ADMIN']}>
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
