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
      {/* ✅ গ্লোবাল ডার্ক মোড CSS — সব inline style force override */}
      <style>{`
        /* ============================================
           🌙 অ্যাডমিন প্যানেল ডার্ক মোড (অটো Force Override)
           ============================================ */
        @media (prefers-color-scheme: dark) {
          
          /* ===== Base ===== */
          html, body {
            background-color: #0f172a !important;
            color: #f1f5f9 !important;
          }
          
          #root {
            background-color: #0f172a !important;
            min-height: 100vh;
          }
          
          /* ===== সব heading ===== */
          h1, h2, h3, h4, h5, h6 {
            color: #f1f5f9 !important;
          }
          
          /* ===== সব টেক্সট ===== */
          p, span, small, label, strong, b, i {
            color: #cbd5e1;
          }
          
          /* ===== White background force override ===== */
          [style*="background-color: rgb(255, 255, 255)"],
          [style*="background-color: white"],
          [style*="background-color: #ffffff"],
          [style*="background-color: #fff"],
          [style*="backgroundColor: white"],
          [style*="backgroundColor: #ffffff"],
          [style*="background: white"],
          [style*="background: #ffffff"],
          [style*="background-color: #FFFFFF"] {
            background-color: #1e293b !important;
            color: #f1f5f9 !important;
          }
          
          /* ===== হালকা ধূসর background (card, box) ===== */
          [style*="background-color: rgb(248, 250, 252)"],
          [style*="background-color: #f8fafc"] {
            background-color: #0f172a !important;
          }
          
          [style*="background-color: rgb(241, 245, 249)"],
          [style*="background-color: #f1f5f9"] {
            background-color: #0f172a !important;
          }
          
          [style*="background-color: rgb(226, 232, 240)"],
          [style*="background-color: #e2e8f0"] {
            background-color: #334155 !important;
          }
          
          /* ===== Linear gradient force override ===== */
          [style*="linear-gradient(135deg, #dcfce7"],
          [style*="linear-gradient(135deg, #bbf7d0"] {
            background: linear-gradient(135deg, #064e3b, #14532d) !important;
          }
          
          [style*="linear-gradient(135deg, #eff6ff"],
          [style*="linear-gradient(135deg, #dbeafe"] {
            background: linear-gradient(135deg, #1e3a8a, #1e40af) !important;
          }
          
          [style*="linear-gradient(135deg, #fef3c7"],
          [style*="linear-gradient(135deg, #fde68a"] {
            background: linear-gradient(135deg, #78350f, #92400e) !important;
          }
          
          [style*="linear-gradient(135deg, #fce7f3"],
          [style*="linear-gradient(135deg, #fbcfe8"] {
            background: linear-gradient(135deg, #831843, #9d174d) !important;
          }
          
          /* ===== কালো টেক্সট force override ===== */
          [style*="color: rgb(15, 23, 42)"],
          [style*="color: #0f172a"] {
            color: #f1f5f9 !important;
          }
          
          [style*="color: rgb(51, 65, 85)"],
          [style*="color: #334155"] {
            color: #cbd5e1 !important;
          }
          
          [style*="color: rgb(30, 41, 59)"],
          [style*="color: #1e293b"] {
            color: #e2e8f0 !important;
          }
          
          [style*="color: rgb(100, 116, 139)"],
          [style*="color: #64748b"] {
            color: #94a3b8 !important;
          }
          
          [style*="color: rgb(71, 85, 105)"],
          [style*="color: #475569"] {
            color: #cbd5e1 !important;
          }
          
          /* ===== Input, Select, Textarea ===== */
          input, select, textarea {
            background-color: #1e293b !important;
            color: #f1f5f9 !important;
            border-color: #334155 !important;
          }
          
          input::placeholder, textarea::placeholder {
            color: #64748b !important;
          }
          
          /* ===== Table ===== */
          table {
            background-color: #1e293b !important;
          }
          thead, tbody, tr {
            background-color: transparent !important;
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
          
          /* ===== Border force override ===== */
          [style*="border: 1px solid rgb(226, 232, 240)"],
          [style*="border: 1.5px solid rgb(226, 232, 240)"],
          [style*="border: 2px solid rgb(226, 232, 240)"],
          [style*="border: 1px solid #e2e8f0"],
          [style*="border: 1.5px solid #e2e8f0"],
          [style*="border: 2px solid #e2e8f0"],
          [style*="border-color: #e2e8f0"],
          [style*="borderBottom: 2px solid #f1f5f9"],
          [style*="border-bottom: 2px solid #f1f5f9"] {
            border-color: #334155 !important;
          }
          
          [style*="border: 1px solid #f1f5f9"],
          [style*="border-bottom: 1px solid #f1f5f9"],
          [style*="border-top: 1px solid #f1f5f9"] {
            border-color: #1e293b !important;
          }
          
          /* ===== Card class ===== */
          .card {
            background-color: #1e293b !important;
            border-color: #334155 !important;
            color: #f1f5f9 !important;
          }
          
          /* ===== Sidebar dark (already dark) ===== */
          aside, nav {
            /* সাইডবার আগেই ডার্ক, কিছু করার নেই */
          }
          
          /* ===== Modal/Overlay ===== */
          [style*="background: rgba(0,0,0,0.6)"],
          [style*="background: rgba(0, 0, 0, 0.6)"] {
            background: rgba(0, 0, 0, 0.8) !important;
          }
          
          /* ===== Success/Error boxes ===== */
          [style*="background-color: rgb(220, 252, 231)"],
          [style*="background: #dcfce7"] {
            background: #064e3b !important;
            color: #6ee7b7 !important;
          }
          
          [style*="background-color: rgb(254, 226, 226)"],
          [style*="background: #fee2e2"] {
            background: #7f1d1d !important;
            color: #fca5a5 !important;
          }
          
          [style*="background-color: rgb(254, 243, 199)"],
          [style*="background: #fef3c7"] {
            background: #78350f !important;
            color: #fcd34d !important;
          }
          
          /* ===== Scrollbar dark ===== */
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
