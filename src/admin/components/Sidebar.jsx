import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/', icon: '📊', label: 'ড্যাশবোর্ড' },
  { path: '/homepage', icon: '🏠', label: 'হোমপেজ' },
  { path: '/teachers', icon: '👨‍🏫', label: 'শিক্ষক' },
  { path: '/students', icon: '🎓', label: 'ছাত্র' },
  { path: '/notices', icon: '📢', label: 'নোটিশ' },
  { path: '/gallery', icon: '🖼️', label: 'গ্যালারি' },
  { path: '/contact', icon: '📞', label: 'যোগাযোগ' },
  { path: '/footer', icon: '📋', label: 'ফুটার' },
  { path: '/theme', icon: '🎨', label: 'থিম' },
  { path: '/settings', icon: '⚙️', label: 'সেটিংস' },
  { path: '/seo', icon: '🔍', label: 'এসইও' },
  { path: '/media', icon: '📁', label: 'মিডিয়া' },
  { path: '/users', icon: '👥', label: 'ব্যবহারকারী' },
  { path: '/permissions', icon: '🔐', label: 'পারমিশন' },
  { path: '/backup', icon: '💾', label: 'ব্যাকআপ' },
  { path: '/logs', icon: '📋', label: 'অ্যাক্টিভিটি' },
  { path: '/recycle', icon: '🗑️', label: 'রিসাইকেল' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>📚 অ্যাডমিন</div>
      <nav style={styles.nav}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...styles.link,
              ...(location.pathname === item.path ? styles.active : {})
            }}
          >
            <span style={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '220px',
    background: '#0f172a',
    color: 'white',
    minHeight: '100vh',
    padding: '16px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    overflowY: 'auto',
    zIndex: 100,
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    padding: '0 20px 20px 20px',
    borderBottom: '1px solid #1e293b',
    marginBottom: '12px',
    color: '#16a34a',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 20px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  active: {
    background: '#1e293b',
    color: 'white',
    borderRight: '3px solid #16a34a',
  },
  icon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
};
