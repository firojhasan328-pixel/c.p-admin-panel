import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HomepageEditor from './pages/HomepageEditor';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAdmin();
  
  // লোডিং চলাকালীন কিছু দেখান
  if (loading) {
    return <div style={{textAlign: 'center', padding: '50px'}}>⏳ লোড হচ্ছে...</div>;
  }
  
  // অথেনটিকেটেড না হলে লগইন পেজে রিডাইরেক্ট
  if (!isAuthenticated) {
    console.log('🔒 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('🔓 Authenticated, showing protected content');
  return children;
}

export default function AdminApp() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/homepage" element={<ProtectedRoute><HomepageEditor /></ProtectedRoute>} />
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
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute><Permissions /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute><Backup /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="/recycle" element={<ProtectedRoute><RecycleBin /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}
