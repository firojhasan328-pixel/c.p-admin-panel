import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';

// =============================================
// ✅ রোল অনুযায়ী মেনু দেখানো
// =============================================
const getMenuItems = (role, hasPermission) => {
  // সবাই দেখতে পারে এমন মেনু
  const baseMenus = [
    { path: '/', icon: '📊', label: 'ড্যাশবোর্ড', permission: 'view_dashboard' },
  ];

  // অ্যাডমিন ও সুপার অ্যাডমিন দেখতে পারে
  const adminMenus = [
    { path: '/homepage', icon: '🏠', label: 'হোমপেজ', permission: 'edit_homepage' },
    { path: '/admissions', icon: '📝', label: 'অনলাইন আবেদন ফরম', permission: 'manage_admissions' },
    { path: '/student-approval', icon: '✅', label: 'ছাত্র অনুমোদন', permission: 'manage_students' },
    { path: '/teachers', icon: '👨‍🏫', label: 'শিক্ষক', permission: 'manage_teachers' },
    { path: '/students', icon: '🎓', label: 'ছাত্র', permission: 'manage_students' },
    { path: '/notices', icon: '📢', label: 'নোটিশ', permission: 'manage_notices' },
    { path: '/gallery', icon: '🖼️', label: 'গ্যালারি', permission: 'manage_gallery' },
    { path: '/contact', icon: '📞', label: 'যোগাযোগ', permission: 'manage_contact' },
    { path: '/footer', icon: '📋', label: 'ফুটার', permission: 'manage_footer' },
    { path: '/theme', icon: '🎨', label: 'থিম', permission: 'manage_theme' },
    { path: '/settings', icon: '⚙️', label: 'সেটিংস', permission: 'manage_settings' },
    { path: '/seo', icon: '🔍', label: 'এসইও', permission: 'manage_seo' },
    { path: '/media', icon: '📁', label: 'মিডিয়া', permission: 'manage_media' },
  ];

  // শুধু সুপার অ্যাডমিন দেখতে পারে
  const superAdminMenus = [
    { path: '/users', icon: '👥', label: 'ব্যবহারকারী', permission: 'manage_users' },
    { path: '/permissions', icon: '🔐', label: 'পারমিশন', permission: 'manage_permissions' },
    { path: '/backup', icon: '💾', label: 'ব্যাকআপ', permission: 'manage_backup' },
    { path: '/logs', icon: '📋', label: 'অ্যাক্টিভিটি', permission: 'view_logs' },
    { path: '/recycle', icon: '🗑️', label: 'রিসাইকেল', permission: 'manage_recycle' },
  ];

  let menus = [...baseMenus];

  // অ্যাডমিন বা সুপার অ্যাডমিন
  if (role === 'admin' || role === 'super_admin') {
    adminMenus.forEach(menu => {
      if (hasPermission(menu.permission)) {
        menus.push(menu);
      }
    });
  }

  // শুধু সুপার অ্যাডমিন
  if (role === 'super_admin') {
    superAdminMenus.forEach(menu => {
      menus.push(menu);
    });
  }

  return menus;
};

export default function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const { adminUser, logout } = useAdmin();
  const { hasPermission } = usePermissions();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = getMenuItems(adminUser?.role, hasPermission);

  const handleLinkClick = () => {
    if (isMobile) {
      toggleSidebar();
    }
  };

  // রোল অনুযায়ী ব্যাজ
  const getRoleBadge = () => {
    const role = adminUser?.role;
    if (role === 'super_admin') return { label: '⭐ সুপার অ্যাডমিন', color: '#16a34a' };
    if (role === 'admin') return { label: '🔹 সাব অ্যাডমিন', color: '#2563eb' };
    if (role === 'teacher') return { label: '👨‍🏫 শিক্ষক', color: '#f59e0b' };
    return { label: '👁️ দর্শক', color: '#64748b' };
  };

  const roleBadge = getRoleBadge();

  return (
    <>
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
            <div style={{
              ...styles.profileRole,
              color: roleBadge.color,
            }}>
              <span style={styles.onlineDot}></span>
              {roleBadge.label}
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

      {/* ওভারলে */}
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600',
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
