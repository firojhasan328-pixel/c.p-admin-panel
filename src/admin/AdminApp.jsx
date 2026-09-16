import React from 'react';
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
  useDarkMode();

  return (
    <AdminProvider>
      <style>{`
        /* ============================================
           🌙 অ্যাডমিন প্যানেল — ডার্ক মোড (অটো)
           মেইন ওয়েবসাইটের মতো একই পদ্ধতি
           ============================================ */
        @media (prefers-color-scheme: dark) {

          /* ===== Base ===== */
          html {
            background-color: #0f172a !important;
          }
          body {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }
          #root {
            background-color: #0f172a !important;
          }

          /* ============================================
             🎨 White background → Dark Navy (#1e293b)
             ============================================ */
          [style*="background-color: rgb(255, 255, 255)"],
          [style*="background-color: #ffffff"],
          [style*="background-color: #fff"],
          [style*="background-color: white"],
          [style*="background: rgb(255, 255, 255)"],
          [style*="background: #ffffff"],
          [style*="background: white"] {
            background-color: #1e293b !important;
            color: #f1f5f9 !important;
          }

          /* ============================================
             🎨 Light grey → Darkest (#0f172a)
             ============================================ */
          [style*="background-color: rgb(248, 250, 252)"],
          [style*="background-color: #f8fafc"] {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }

          [style*="background-color: rgb(241, 245, 249)"],
          [style*="background-color: #f1f5f9"] {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }

          [style*="background-color: rgb(226, 232, 240)"],
          [style*="background-color: #e2e8f0"] {
            background-color: #334155 !important;
            color: #f1f5f9 !important;
          }

          /* ============================================
             🎨 Pastel colors (Stat cards) → Dark variants
             ============================================ */
          [style*="background: rgba(59, 130, 246"],
          [style*="background: rgba(59,130,246"] {
            background: linear-gradient(135deg, #1e3a8a, #1e40af) !important;
            color: #dbeafe !important;
          }

          [style*="background: rgba(22, 163, 74"],
          [style*="background: rgba(22,163,74"] {
            background: linear-gradient(135deg, #064e3b, #14532d) !important;
            color: #d1fae5 !important;
          }

          [style*="background: rgba(245, 158, 11"],
          [style*="background: rgba(245,158,11"] {
            background: linear-gradient(135deg, #78350f, #92400e) !important;
            color: #fef3c7 !important;
          }

          [style*="background: rgba(139, 92, 246"],
          [style*="background: rgba(139,92,246"] {
            background: linear-gradient(135deg, #4c1d95, #5b21b6) !important;
            color: #ede9fe !important;
          }

          [style*="linear-gradient(135deg, #dcfce7"],
          [style*="linear-gradient(135deg, #bbf7d0"] {
            background: linear-gradient(135deg, #064e3b, #14532d) !important;
            color: #d1fae5 !important;
          }

          [style*="linear-gradient(135deg, #dbeafe"],
          [style*="linear-gradient(135deg, #93c5fd"] {
            background: linear-gradient(135deg, #1e3a8a, #1e40af) !important;
            color: #dbeafe !important;
          }

          [style*="linear-gradient(135deg, #fef3c7"],
          [style*="linear-gradient(135deg, #fde68a"] {
            background: linear-gradient(135deg, #78350f, #92400e) !important;
            color: #fef3c7 !important;
          }

          [style*="linear-gradient(135deg, #f5f3ff"],
          [style*="linear-gradient(135deg, #ede9fe"] {
            background: linear-gradient(135deg, #4c1d95, #5b21b6) !important;
            color: #ede9fe !important;
          }

          /* ============================================
             🎨 Dark text → Light text
             ============================================ */
          [style*="color: rgb(15, 23, 42)"],
          [style*="color: #0f172a"] {
            color: #f1f5f9 !important;
          }

          [style*="color: rgb(30, 41, 59)"],
          [style*="color: #1e293b"] {
            color: #e2e8f0 !important;
          }

          [style*="color: rgb(51, 65, 85)"],
          [style*="color: #334155"] {
            color: #cbd5e1 !important;
          }

          [style*="color: rgb(71, 85, 105)"],
          [style*="color: #475569"] {
            color: #cbd5e1 !important;
          }

          [style*="color: rgb(100, 116, 139)"],
          [style*="color: #64748b"] {
            color: #94a3b8 !important;
          }

          [style*="color: rgb(148, 163, 184)"],
          [style*="color: #94a3b8"] {
            color: #cbd5e1 !important;
          }

          /* ============================================
             🎨 Global text safety
             ============================================ */
          h1, h2, h3, h4, h5, h6 {
            color: #f1f5f9;
          }

          /* ============================================
             🎨 Inputs
             ============================================ */
          input, select, textarea {
            background-color: #1e293b !important;
            color: #f1f5f9 !important;
            border-color: #334155 !important;
          }

          input::placeholder,
          textarea::placeholder {
            color: #94a3b8 !important;
          }

          /* ============================================
             🎨 Borders
             ============================================ */
          [style*="border: 1px solid rgb(226, 232, 240)"],
          [style*="border: 1.5px solid rgb(226, 232, 240)"],
          [style*="border: 2px solid rgb(226, 232, 240)"],
          [style*="border-color: rgb(226, 232, 240)"],
          [style*="border: 1px solid #e2e8f0"],
          [style*="border: 1.5px solid #e2e8f0"],
          [style*="border: 2px solid #e2e8f0"] {
            border-color: #334155 !important;
          }

          [style*="border-bottom: 2px solid rgb(241, 245, 249)"],
          [style*="border-bottom: 2px solid #f1f5f9"],
          [style*="border-bottom: 1px solid rgb(241, 245, 249)"],
          [style*="border-bottom: 1px solid #f1f5f9"],
          [style*="border-top: 1px solid rgb(241, 245, 249)"],
          [style*="border-top: 1px solid #f1f5f9"] {
            border-color: #334155 !important;
          }

          /* ============================================
             🎨 Tables
             ============================================ */
          table {
            background-color: #1e293b !important;
            color: #e2e8f0 !important;
          }

          th {
            background-color: #0f172a !important;
            color: #cbd5e1 !important;
            border-color: #334155 !important;
          }

          td {
            background-color: #1e293b !important;
            color: #e2e8f0 !important;
            border-color: #334155 !important;
          }

          /* ============================================
             🎨 Scrollbar
             ============================================ */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #0f172a;
          }
          ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }
        }
      `}</style>

      <BrowserRouter>
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
