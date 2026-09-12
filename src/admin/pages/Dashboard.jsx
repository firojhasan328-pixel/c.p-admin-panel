import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions, ROLE_BADGES } from '../../hooks/usePermissions';
import { supabase } from '../../supabaseClient';

export default function Dashboard() {
  const { adminUser } = useAdmin();
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    notices: 0,
    images: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  // ============================================
  // স্ট্যাট লোড
  // ============================================
  const fetchStats = async () => {
    try {
      const [students, teachers, notices, images] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('portal_notices').select('*', { count: 'exact', head: true }),
        supabase.from('gallery_images').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        students: students.count || 0,
        teachers: teachers.count || 0,
        notices: notices.count || 0,
        images: images.count || 0,
      });
    } catch (error) {
      console.error('Stats error:', error);
    }
    setLoading(false);
  };

  // ============================================
  // রোল ব্যাজ ডাইনামিক
  // ============================================
  const getRoleBadge = () => {
    const role = adminUser?.role;
    const badge = ROLE_BADGES[role];
    if (badge) {
      return {
        label: badge.label,
        bg: badge.bg,
        color: badge.color,
      };
    }
    return {
      label: '👁️ দর্শক',
      bg: '#f1f5f9',
      color: '#64748b',
    };
  };

  const roleBadge = getRoleBadge();

  // ============================================
  // স্ট্যাট কার্ড (পারমিশন অনুযায়ী)
  // ============================================
  const allCards = [
    {
      id: 'students',
      icon: '🎓',
      label: 'মোট ছাত্র',
      value: stats.students,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      permission: 'manage_students',
    },
    {
      id: 'teachers',
      icon: '👨‍🏫',
      label: 'মোট শিক্ষক',
      value: stats.teachers,
      color: '#16a34a',
      bg: 'rgba(22, 163, 74, 0.1)',
      permission: 'manage_teachers',
    },
    {
      id: 'notices',
      icon: '📢',
      label: 'নোটিশ',
      value: stats.notices,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      permission: 'manage_notices',
    },
    {
      id: 'images',
      icon: '🖼️',
      label: 'গ্যালারি',
      value: stats.images,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      permission: 'manage_gallery',
    },
  ];

  // সুপার অ্যাডমিন সব দেখবে, বাকিরা পারমিশন অনুযায়ী
  const visibleCards = adminUser?.role === 'super_admin'
    ? allCards
    : allCards.filter((c) => hasPermission(c.permission));

  return (
    <div style={styles.container}>
      {/* ============================================
          ওয়েলকাম সেকশন
          ============================================ */}
      <div style={styles.welcomeSection}>
        <h2 style={styles.welcomeTitle}>
          👋 স্বাগতম,{' '}
          <span style={styles.welcomeName}>
            {adminUser?.name || 'অ্যাডমিন'}
          </span>
        </h2>
        <div style={styles.welcomeSubWrapper}>
          <span
            style={{
              ...styles.roleBadgeDynamic,
              background: roleBadge.bg,
              color: roleBadge.color,
            }}
          >
            {roleBadge.label}
          </span>
          <span style={styles.welcomeSubText}>
            আজকের তারিখ:{' '}
            {new Date().toLocaleDateString('bn-BD', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* ============================================
          স্ট্যাট কার্ড গ্রিড
          ============================================ */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>⏳ স্ট্যাট লোড হচ্ছে...</p>
        </div>
      ) : visibleCards.length === 0 ? (
        <div style={styles.noAccessBox}>
          <span style={styles.noAccessIcon}>🔒</span>
          <p style={styles.noAccessText}>
            আপনার এই মুহূর্তে কোনো স্ট্যাট দেখার অনুমতি নেই
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {visibleCards.map((card, i) => (
            <div
              key={i}
              style={{
                ...styles.card,
                background: card.bg,
                borderLeft: `4px solid ${card.color}`,
              }}
            >
              <div style={styles.cardLeft}>
                <span style={styles.cardIcon}>{card.icon}</span>
                <div>
                  <div style={styles.cardValue}>{card.value}</div>
                  <div style={styles.cardLabel}>{card.label}</div>
                </div>
              </div>
              <div
                style={{
                  ...styles.cardBar,
                  background: card.color,
                  width: `${Math.min((card.value / 100) * 100, 100)}%`,
                }}
              ></div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================
          প্রোফাইল কার্ড
          ============================================ */}
      <div style={styles.profileCard}>
        <h3 style={styles.profileTitle}>👤 আপনার প্রোফাইল</h3>
        <div style={styles.profileGrid}>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📧 ইমেইল</span>
            <span style={styles.profileValue}>
              {adminUser?.email || '—'}
            </span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>🔑 রোল</span>
            <span
              style={{
                ...styles.profileValue,
                color: roleBadge.color,
              }}
            >
              {roleBadge.label}
            </span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📅 জয়েন তারিখ</span>
            <span style={styles.profileValue}>
              {adminUser?.created_at
                ? new Date(adminUser.created_at).toLocaleDateString('bn-BD')
                : '—'}
            </span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📊 স্ট্যাটাস</span>
            <span
              style={{
                ...styles.profileValue,
                color: '#16a34a',
              }}
            >
              ✅ সক্রিয়
            </span>
          </div>
        </div>
      </div>

      {/* ============================================
          রোল-ভিত্তিক টিপস
          ============================================ */}
      {adminUser?.role !== 'super_admin' && (
        <div style={styles.tipsBox}>
          <span style={styles.tipsIcon}>💡</span>
          <div>
            <p style={styles.tipsTitle}>আপনার অ্যাক্সেস সম্পর্কে</p>
            <p style={styles.tipsText}>
              আপনার রোল: <strong>{roleBadge.label}</strong>। আপনি শুধু
              সেই মেনু ও ফিচার দেখতে পাবেন যেগুলোর পারমিশন সুপার অ্যাডমিন
              আপনাকে দিয়েছেন।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// স্টাইল
// ============================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Hind Siliguri', sans-serif",
  },
  welcomeSection: {
    marginBottom: '24px',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  welcomeName: {
    color: '#16a34a',
  },
  welcomeSubWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  roleBadgeDynamic: {
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 14px',
    borderRadius: '20px',
    display: 'inline-block',
  },
  welcomeSubText: {
    fontSize: '13px',
    color: '#64748b',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 0',
    gap: '12px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
  noAccessBox: {
    textAlign: 'center',
    padding: '50px 20px',
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  noAccessIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '10px',
  },
  noAccessText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    background: 'white',
    padding: '18px 20px',
    borderRadius: '14px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  cardIcon: {
    fontSize: '32px',
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 1.2,
  },
  cardLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  cardBar: {
    height: '3px',
    borderRadius: '4px',
    marginTop: '12px',
    transition: 'width 1s ease',
  },
  profileCard: {
    background: 'white',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  profileTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '10px',
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  profileItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  profileLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '600',
  },
  tipsBox: {
    display: 'flex',
    gap: '14px',
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '14px',
    padding: '16px 20px',
    borderLeft: '4px solid #0ea5e9',
  },
  tipsIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  tipsTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#075985',
    margin: '0 0 4px 0',
  },
  tipsText: {
    fontSize: '13px',
    color: '#0c4a6e',
    margin: 0,
    lineHeight: '1.6',
  },
};

// ============================================
// অ্যানিমেশন
// ============================================
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
