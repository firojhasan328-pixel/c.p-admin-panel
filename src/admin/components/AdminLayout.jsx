import React from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>👋 স্বাগতম</h1>
          <div style={styles.headerRight}>
            <span style={styles.dateTime}>
              {new Date().toLocaleDateString('bn-BD', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
        <div style={styles.body}>
          {children}
        </div>
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
  content: {
    marginLeft: '260px',
    flex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'white',
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '10px',
  },
  pageTitle: {
    fontSize: '20px',
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
    padding: '24px 32px',
    flex: 1,
  },
  '@media (max-width: 768px)': {
    content: { marginLeft: 0 },
    header: { padding: '16px' },
    body: { padding: '16px' },
  },
};
