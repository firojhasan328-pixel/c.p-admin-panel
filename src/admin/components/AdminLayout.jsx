import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div style={styles.container}>
      {/* হ্যামবার্গার বাটন (শুধু মোবাইলে) */}
      {isMobile && (
        <button onClick={toggleSidebar} style={styles.hamburger}>
          <span style={styles.hamburgerIcon}>☰</span>
        </button>
      )}

      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div
        style={{
          ...styles.content,
          marginLeft: isMobile ? '0' : '260px',
        }}
      >
        {/* হেডার */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {!isMobile && (
              <h1 style={styles.pageTitle}>👋 স্বাগতম</h1>
            )}
          </div>
          <div style={styles.headerRight}>
            <span style={styles.dateTime}>
              {new Date().toLocaleDateString('bn-BD', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* বডি */}
        <div style={styles.body}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f1f5f9',
    fontFamily: "'Hind Siliguri', 'Segoe UI', sans-serif",
  },
  hamburger: {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: 1000,
    background: '#0f172a',
    color: 'white',
    border: 'none',
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    fontSize: '22px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'all 0.3s ease',
  },
  hamburgerIcon: {
    display: 'inline-block',
    transition: 'transform 0.3s ease',
  },
  content: {
    flex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  header: {
    background: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '10px',
    minHeight: '64px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  dateTime: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  body: {
    padding: '24px',
    flex: 1,
  },
  '@media (max-width: 768px)': {
    header: { padding: '12px 16px', paddingLeft: '68px' },
    body: { padding: '16px' },
    pageTitle: { fontSize: '16px' },
  },
};
