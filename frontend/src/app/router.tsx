import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute, StaffRoute } from '../features/auth/ProtectedRoute';
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';
import { NotFoundPage } from '../features/feedback/NotFoundPage';
import { StudentDashboard } from '../features/student/StudentDashboard';
import { StudentTicketList } from '../features/student/StudentTicketList';
import { StudentTicketDetail } from '../features/student/StudentTicketDetail';
import { ComplaintReportingWizard } from '../features/complaints/ComplaintReportingWizard';
import { StaffQueue } from '../features/staff/StaffQueue';
import { StaffTicketDetail } from '../features/staff/StaffTicketDetail';
import { useAuth } from '../features/auth/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

// Root redirect component
const RootRedirect: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Skeleton height="36px" width="280px" />
        <Skeleton height="200px" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'staff' || role === 'admin') {
    return <Navigate to="/staff" replace />;
  }

  return <Navigate to="/student" replace />;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Student Portal Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/report"
          element={
            <ProtectedRoute>
              <ComplaintReportingWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/tickets"
          element={
            <ProtectedRoute>
              <StudentTicketList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/tickets/:ticketId"
          element={
            <ProtectedRoute>
              <StudentTicketDetail />
            </ProtectedRoute>
          }
        />

        {/* Staff Operations Routes */}
        <Route
          path="/staff"
          element={
            <StaffRoute>
              <StaffQueue />
            </StaffRoute>
          }
        />
        <Route
          path="/staff/tickets/:ticketId"
          element={
            <StaffRoute>
              <StaffTicketDetail />
            </StaffRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
