import React from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }) {
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f1f5f9',
  },
  content: {
    marginLeft: '220px',
    padding: '24px',
    flex: 1,
    width: 'calc(100% - 220px)',
  },
};
