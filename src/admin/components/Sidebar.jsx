import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

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

export default function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const { adminUser, logout } = useAdmin();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLinkClick = () => {
    if (isMobile) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* সাইডবার */}
      <div
        style={{
          ...styles.sidebar,
          transform: isMobile
            ? isOpen
              ? 'translateX(0)'
              : 'translateX(-100%)'
            : 'translateX(0)',
        }}
      >
        {/* লোগো */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📚</span>
          <span style={styles.logoText}>চিলমারী</span>
          <span style={styles.logoBadge}>ADMIN</span>
        </div>

        {/* ইউজার প্রোফাইল */}
        <div style={styles.profile}>
          <div style={styles.profileAvatar}>
            {adminUser?.name?.charAt(0) || 'A'}
          </div>
          <div style={styles.profileInfo}>
            <div style={styles.profileName}>{adminUser?.name || 'অ্যাডমিন'}</div>
            <div style={styles.profileRole}>
              <span style={styles.onlineDot}></span>
              {adminUser?.role === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : '🔹 অ্যাডমিন'}
            </div>
          </div>
        </div>

        {/* মেনু */}
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.link,
                ...(location.pathname === item.path ? styles.active : {}),
              }}
              onClick={handleLinkClick}
            >
              <span style={styles.linkIcon}>{item.icon}</span>
              <span style={styles.linkLabel}>{item.label}</span>
              {location.pathname === item.path && (
                <span style={styles.activeIndicator}></span>
              )}
            </Link>
          ))}
        </nav>

        {/* লগআউট */}
        <div style={styles.logoutSection}>
          <button onClick={logout} style={styles.logoutBtn}>
            <span>🚪</span> লগআউট
          </button>
        </div>

        {/* ভার্সন */}
        <div style={styles.version}>v1.0.0</div>
      </div>

      {/* ওভারলে (শুধু মোবাইলে) */}
      {isMobile && isOpen && (
        <div style={styles.overlay} onClick={toggleSidebar}></div>
      )}
    </>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    color: 'white',
    minHeight: '100vh',
    padding: '20px 0',
    position: 'fixed',
    top: 0,
    left: 0,
    overflowY: 'auto',
    zIndex: 999,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '20px',
    gap: '10px',
  },
  logoIcon: { fontSize: '28px' },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#16a34a',
    letterSpacing: '0.5px',
  },
  logoBadge: {
    fontSize: '10px',
    background: 'rgba(22, 163, 74, 0.2)',
    color: '#16a34a',
    padding: '2px 10px',
    borderRadius: '12px',
    fontWeight: '600',
    marginLeft: 'auto',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 20px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: '12px',
  },
  profileAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    flexShrink: 0,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  profileRole: {
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#16a34a',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 10px',
    flex: 1,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 16px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    borderRadius: '10px',
    transition: 'all 0.25s ease',
    position: 'relative',
    fontWeight: '500',
  },
  linkIcon: { fontSize: '18px', width: '24px', textAlign: 'center' },
  linkLabel: { flex: 1 },
  active: {
    background: 'rgba(22, 163, 74, 0.15)',
    color: '#16a34a',
  },
  activeIndicator: {
    width: '3px',
    height: '24px',
    background: '#16a34a',
    borderRadius: '4px',
    position: 'absolute',
    right: '0',
  },
  logoutSection: {
    padding: '16px 20px 12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: 'auto',
  },
  logoutBtn: {
    width: '100%',
    background: 'rgba(220, 38, 38, 0.15)',
    color: '#ef4444',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  version: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#475569',
    padding: '8px 0',
    letterSpacing: '0.5px',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 998,
    animation: 'fadeIn 0.3s ease',
  },
};

// CSS অ্যানিমেশন
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);
