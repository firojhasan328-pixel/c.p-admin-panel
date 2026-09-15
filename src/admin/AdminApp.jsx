import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminLayout from './components/AdminLayout';
import HomepageEditor from './pages/HomepageEditor';
import AdmissionDashboard from './pages/AdmissionDashboard';
import StudentApproval from './pages/StudentApproval';
import TeachersManager from './pages/TeachersManager';
import StudentsManager from './pages/StudentsManager';
import NoticeManager from './pages/NoticeManager';
import GalleryManager from './pages/GalleryManager';
import ContactManager from './pages/ContactManager';
import FooterManager from './pages/FooterManager';
import ThemeManager from './pages/ThemeManager';
import Settings from './pages/Settings';
import SEO from './pages/SEO';
import MediaLibrary from './pages/MediaLibrary';
import Users from './pages/Users';
import Permissions from './pages/Permissions';
import Backup from './pages/Backup';
import ActivityLogs from './pages/ActivityLogs';
import RecycleBin from './pages/RecycleBin';
import RegistrationCodes from './pages/RegistrationCodes';
import RegistrationRequests from './pages/RegistrationRequests';
import ResultManager from './pages/ResultManager';
import RoutineManager from './pages/RoutineManager';
import AssignmentManager from './pages/AssignmentManager';
import AttendanceManager from './pages/AttendanceManager';
import AchievementManager from './pages/AchievementManager';
import { useDarkMode } from '../hooks/useDarkMode';

// =============================================
// ✅ প্রোটেক্টেড রাউট
// =============================================
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, adminUser } = useAdmin();

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>⏳ লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const userRole = adminUser?.role;
    if (requiredRole === 'super_admin' && userRole !== 'super_admin') {
      return <Navigate to="/" replace />;
    }
    if (
      requiredRole === 'admin' &&
      !['super_admin', 'admin'].includes(userRole)
    ) {
      return <Navigate to="/" replace />;
    }
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export default function AdminApp() {
  // ✅ ডার্ক মোড অটো-ডিটেকশন
  useDarkMode();

  return (
    <AdminProvider>
      <BrowserRouter>
        {/* ✅ গ্লোবাল ডার্ক মোড CSS */}
        <style>{`
          /* ============================================
             🌙 অ্যাডমিন প্যানেল ডার্ক মোড (অটো)
             ============================================ */
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #0f172a !important;
              color: #f1f5f9 !important;
            }
            .admin-content-bg {
              background-color: #0f172a !important;
            }
            /* Dashboard কার্ড */
            [class*="card"],
            .card {
              background-color: #1e293b !important;
              border-color: #334155 !important;
            }
            /* ইনপুট ফিল্ড */
            input,
            select,
            textarea {
              background-color: #1e293b !important;
              color: #f1f5f9 !important;
              border-color: #334155 !important;
            }
            input::placeholder,
            textarea::placeholder {
              color: #64748b !important;
            }
            /* টেবিল */
            table {
              background-color: #1e293b !important;
            }
            th {
              background-color: #0f172a !important;
              color: #cbd5e1 !important;
            }
            td {
              border-color: #334155 !important;
              color: #e2e8f0 !important;
            }
            /* হেডিং */
            h1, h2, h3, h4, h5, h6 {
              color: #f1f5f9 !important;
            }
            /* প্যারাগ্রাফ */
            p, span, label, div {
              color: inherit;
            }
            /* ফর্ম লেবেল */
            label {
              color: #cbd5e1 !important;
            }
            /* পপআপ background */
            [style*="background-color: rgb(255, 255, 255)"],
            [style*="backgroundColor: white"],
            [style*="background: white"] {
              /* এই সিলেক্টর কাজ করবে না, তাই আলাদা ভাবে করতে হবে */
            }
          }
        `}</style>

        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/homepage" element={<ProtectedRoute><HomepageEditor /></ProtectedRoute>} />
          <Route path="/admissions" element={<ProtectedRoute><AdmissionDashboard /></ProtectedRoute>} />
          <Route path="/student-approval" element={<ProtectedRoute><StudentApproval /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute><TeachersManager /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><StudentsManager /></ProtectedRoute>} />
          <Route path="/notices" element={<ProtectedRoute><NoticeManager /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><GalleryManager /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><ContactManager /></ProtectedRoute>} />
          <Route path="/footer" element={<ProtectedRoute><FooterManager /></ProtectedRoute>} />
          <Route path="/theme" element={<ProtectedRoute><ThemeManager /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/seo" element={<ProtectedRoute><SEO /></ProtectedRoute>} />
          <Route path="/media" element={<ProtectedRoute><MediaLibrary /></ProtectedRoute>} />

          <Route path="/registration-codes" element={<ProtectedRoute><RegistrationCodes /></ProtectedRoute>} />
          <Route path="/registration-requests" element={<ProtectedRoute><RegistrationRequests /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ResultManager /></ProtectedRoute>} />
          <Route path="/routines" element={<ProtectedRoute><RoutineManager /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute><AssignmentManager /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendanceManager /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><AchievementManager /></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute requiredRole="super_admin"><Users /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute requiredRole="super_admin"><Permissions /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute requiredRole="super_admin"><Backup /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute requiredRole="super_admin"><ActivityLogs /></ProtectedRoute>} />
          <Route path="/recycle" element={<ProtectedRoute requiredRole="super_admin"><RecycleBin /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}

const styles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f1f5f9',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '16px',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
