import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/Dashboard';
import StudentTimetable from './pages/student/Timetable';
import MarkAttendance from './pages/student/MarkAttendance';
import AttendanceHistory from './pages/student/AttendanceHistory';
import RegisterFace from './pages/student/RegisterFace';
import Notifications from './pages/Notifications';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherTimetable from './pages/teacher/Timetable';
import ClassAttendance from './pages/teacher/ClassAttendance';
import Reports from './pages/teacher/Reports';
import ManageStudents from './pages/teacher/ManageStudents';
import LeaveRequests from './pages/teacher/LeaveRequests';
import SubjectTrends from './pages/teacher/SubjectTrends';
import StudentLeave from './pages/student/LeaveRequest';
import HeatmapPage from './pages/student/AttendanceHeatmap';
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import Layout from './components/Layout';

const PrivateRoute = ({ children, role }) => {
  const { user, userType, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && userType !== role) return <Navigate to="/" />;
  return children;
};

const HomeRedirect = () => {
  const { userType } = useAuth();
  if (userType === 'admin') return <Navigate to="/admin/dashboard" />;
  return <Navigate to={userType === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<HomeRedirect />} />
                <Route path="student/dashboard" element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>} />
                <Route path="student/timetable" element={<PrivateRoute role="student"><StudentTimetable /></PrivateRoute>} />
                <Route path="student/attendance" element={<PrivateRoute role="student"><MarkAttendance /></PrivateRoute>} />
                <Route path="student/history" element={<PrivateRoute role="student"><AttendanceHistory /></PrivateRoute>} />
                <Route path="student/heatmap" element={<PrivateRoute role="student"><HeatmapPage /></PrivateRoute>} />
                <Route path="student/leave" element={<PrivateRoute role="student"><StudentLeave /></PrivateRoute>} />
                <Route path="student/register-face" element={<PrivateRoute role="student"><RegisterFace /></PrivateRoute>} />
                <Route path="teacher/dashboard" element={<PrivateRoute role="teacher"><TeacherDashboard /></PrivateRoute>} />
                <Route path="teacher/timetable" element={<PrivateRoute role="teacher"><TeacherTimetable /></PrivateRoute>} />
                <Route path="teacher/class/:id" element={<PrivateRoute role="teacher"><ClassAttendance /></PrivateRoute>} />
                <Route path="teacher/reports" element={<PrivateRoute role="teacher"><Reports /></PrivateRoute>} />
                <Route path="teacher/students" element={<PrivateRoute role="teacher"><ManageStudents /></PrivateRoute>} />
                <Route path="teacher/leave" element={<PrivateRoute role="teacher"><LeaveRequests /></PrivateRoute>} />
                <Route path="teacher/trends" element={<PrivateRoute role="teacher"><SubjectTrends /></PrivateRoute>} />
                <Route path="admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
                <Route path="notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
