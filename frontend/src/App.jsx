import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UniversityListPage from './pages/universities/UniversityListPage';
import UniversityFormPage from './pages/universities/UniversityFormPage';
import UniversityCalendarPage from './pages/universities/UniversityCalendarPage';
import SectionListPage from './pages/sections/SectionListPage';
import SectionFormPage from './pages/sections/SectionFormPage';
import CoachListPage from './pages/coaches/CoachListPage';
import CoachFormPage from './pages/coaches/CoachFormPage';
import StudentListPage from './pages/students/StudentListPage';
import StudentFormPage from './pages/students/StudentFormPage';
import StudentAttendanceDetailPage from './pages/students/StudentAttendanceDetailPage';
import DailyAttendancePage from './pages/attendance/DailyAttendancePage';
import ReportsPage from './pages/reports/ReportsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes wrapped in MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* University Management (Super Admin only) */}
            <Route
              path="/universities"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <UniversityListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/universities/create"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <UniversityFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/universities/:id/edit"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <UniversityFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/universities/calendar"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <UniversityCalendarPage />
                </ProtectedRoute>
              }
            />

            {/* Section Management (Super Admin & Coaches) */}
            <Route path="/sections" element={<SectionListPage />} />
            <Route
              path="/sections/create"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SectionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sections/:id/edit"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SectionFormPage />
                </ProtectedRoute>
              }
            />

            {/* Success Coach Management (Super Admin only) */}
            <Route
              path="/coaches"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CoachListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coaches/create"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CoachFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coaches/:id/edit"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CoachFormPage />
                </ProtectedRoute>
              }
            />

            {/* Student Directory (Super Admin & Coaches) */}
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/create" element={<StudentFormPage />} />
            <Route path="/students/:id/edit" element={<StudentFormPage />} />
            <Route path="/students/:id/attendance" element={<StudentAttendanceDetailPage />} />

            {/* Daily Attendance Management (Super Admin & Coaches) */}
            <Route path="/attendance" element={<DailyAttendancePage />} />

            {/* Attendance Excel Reports (Super Admin & Permitted Coaches) */}
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
