import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LguPage } from '@/features/lgu/LguPage';
import { DepartmentPage } from '@/features/departments/DepartmentPage';
import { UserPage } from '@/features/users/UserPage';
import { PositionPage } from '@/features/positions/PositionPage';
import { CareersPage } from '@/features/careers/CareersPage';
import { PositionDetailPage } from '@/features/careers/PositionDetailPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ApplicantDashboard } from '@/features/apply/ApplicantDashboard';
import { MyApplicationsPage } from '@/features/apply/MyApplicationsPage';
import { PDSFormPage } from '@/features/pds/PDSFormPage';
import { ApplyPage } from '@/features/apply/ApplyPage';
import { ApplicationsPage } from '@/features/applications/ApplicationsPage';
import { ApplicationDetailPage } from '@/features/applications/ApplicationDetailPage';
import { InterviewsPage } from '@/features/interviews/InterviewsPage';
import { InterviewDetailPage } from '@/features/interviews/InterviewDetailPage';
import { AssessmentPage } from '@/features/interviews/AssessmentPage';
import { SelectionPage } from '@/features/selection/SelectionPage';
import { AppointmentsPage } from '@/features/appointments/AppointmentsPage';
import { AppointmentDetailPage } from '@/features/appointments/AppointmentDetailPage';
import { TrainingPage } from '@/features/training/TrainingPage';
import { TrainingDetailPage } from '@/features/training/TrainingDetailPage';
import { CscBatchPage } from '@/features/csc-batches/CscBatchPage';
import { CscBatchDetailPage } from '@/features/csc-batches/CscBatchDetailPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ProcessFlowPage } from '@/features/process-flow/ProcessFlowPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function SlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}/login`} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
