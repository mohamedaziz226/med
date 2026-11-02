// src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Auth Page
import Login from '../pages/auth/Login';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import DoctorLayout from '../layouts/DoctorLayout';
import SecretaryLayout from '../layouts/SecretaryLayout';
import PatientLayout from '../layouts/PatientLayout';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import Doctors from '../pages/admin/Doctors';
import Users from '../pages/admin/Users';
import Permissions from '../pages/admin/Permissions';
import ActivityLogs from '../pages/admin/ActivityLogs';

// Doctor Pages
import DoctorDashboard from '../pages/doctor/DoctorDashboard';
import DoctorMyPatients from '../pages/doctor/MyPatients';
import DoctorMySecretaries from '../pages/doctor/MySecretaries';
import DoctorDocumentRequests from '../pages/doctor/DocumentRequests';
import DoctorAppointments from '../pages/doctor/Appointments';
import DoctorMessages from '../pages/doctor/Messages';
import DoctorAIChatbot from '../pages/doctor/AIChatbot';

// Secretary Pages
import SecretaryDashboard from '../pages/secretary/SecretaryDashboard';
import SecretaryMyPatients from '../pages/secretary/MyPatients';
import SecretaryPatientDetails from '../pages/secretary/PatientDetails';
import SecretaryAppointments from '../pages/secretary/Appointments';
import SecretaryPayments from '../pages/secretary/Payments';
import SecretaryPatientMessages from '../pages/secretary/PatientMessages';
import SecretaryDoctorMessages from '../pages/secretary/DoctorMessages';
import SecretaryAIChatbot from '../pages/secretary/AIChatbot';
import SecretaryDocumentRequests from '../pages/secretary/DocumentRequests';

// Patient Pages
import PatientDashboard from '../pages/patient/PatientDashboard';
import PatientMyDoctors from '../pages/patient/MyDoctors';
import PatientProfile from '../pages/patient/Profile';
import PatientAppointments from '../pages/patient/Appointments';
import PatientMyDocuments from '../pages/patient/MyDocuments';
import PatientAddDocument from '../pages/patient/AddDocument';
import PatientRequestDocument from '../pages/patient/RequestDocument';
import PatientMessages from '../pages/patient/Messages';
import PatientAIChatbot from '../pages/patient/AIChatbot';
import PatientNotifications from '../pages/patient/Notifications';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's default role dashboard
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return children;
};

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/login" replace />
        }
      />

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="users" element={<Users />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Doctor Routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={['doctor']}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="my-patients" element={<DoctorMyPatients />} />
        <Route path="my-secretaries" element={<DoctorMySecretaries />} />
        <Route path="document-requests" element={<DoctorDocumentRequests />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="messages" element={<DoctorMessages />} />
        <Route path="ai-chatbot" element={<DoctorAIChatbot />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Secretary Routes */}
      <Route
        path="/secretary"
        element={
          <ProtectedRoute allowedRoles={['secretary']}>
            <SecretaryLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<SecretaryDashboard />} />
        <Route path="my-patients" element={<SecretaryMyPatients />} />
        <Route path="patient-details" element={<SecretaryPatientDetails />} />
        <Route path="appointments" element={<SecretaryAppointments />} />
        <Route path="payments" element={<SecretaryPayments />} />
        <Route path="patient-messages" element={<SecretaryPatientMessages />} />
        <Route path="doctor-messages" element={<SecretaryDoctorMessages />} />
        <Route path="document-requests" element={<SecretaryDocumentRequests />} />
        <Route path="ai-chatbot" element={<SecretaryAIChatbot />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Patient Routes */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="my-doctors" element={<PatientMyDoctors />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="my-documents" element={<PatientMyDocuments />} />
        <Route path="add-document" element={<PatientAddDocument />} />
        <Route path="request-document" element={<PatientRequestDocument />} />
        <Route path="notifications" element={<PatientNotifications />} />
        <Route path="messages" element={<PatientMessages />} />
        <Route path="ai-chatbot" element={<PatientAIChatbot />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
