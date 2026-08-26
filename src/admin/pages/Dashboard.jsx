import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';

export default function Dashboard() {
  const { adminUser } = useAdmin();
  const [stats, setStats] = useState({ students: 0, teachers: 0, notices: 0, images: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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

  const cards = [
    { icon: '🎓', label: 'মোট ছাত্র', value: stats.students, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { icon: '👨‍🏫', label: 'মোট শিক্ষক', value: stats.teachers, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
    { icon: '📢', label: 'নোটিশ', value: stats.notices, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { icon: '🖼️', label: 'গ্যালারি', value: stats.images, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.welcomeSection}>
        <h2 style={styles.welcomeTitle}>
          👋 স্বাগতম, <span style={styles.welcomeName}>{adminUser?.name || 'অ্যাডমিন'}</span>
        </h2>
        <p style={styles.welcomeSub}>
          {adminUser?.role === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : '🔹 অ্যাডমিন'}
        </p>
      </div>

      <div style={styles.grid}>
        {cards.map((card, i) => (
          <div key={i} style={{ ...styles.card, background: card.bg, borderLeft: `4px solid ${card.color}` }}>
            <div style={styles.cardLeft}>
              <span style={styles.cardIcon}>{card.icon}</span>
              <div>
                <div style={styles.cardValue}>{card.value}</div>
                <div style={styles.cardLabel}>{card.label}</div>
              </div>
            </div>
            <div style={{ ...styles.cardBar, background: card.color, width: `${Math.min((card.value / 100) * 100, 100)}%` }}></div>
          </div>
        ))}
      </div>

      <div style={styles.profileCard}>
        <h3 style={styles.profileTitle}>👤 প্রোফাইল</h3>
        <div style={styles.profileGrid}>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📧 ইমেইল</span>
            <span style={styles.profileValue}>{adminUser?.email}</span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>🔑 রোল</span>
            <span style={{ ...styles.profileValue, color: '#16a34a' }}>
              {adminUser?.role === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : '🔹 অ্যাডমিন'}
            </span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📅 জয়েন তারিখ</span>
            <span style={styles.profileValue}>
              {adminUser?.created_at ? new Date(adminUser.created_at).toLocaleDateString('bn-BD') : '—'}
            </span>
          </div>
          <div style={styles.profileItem}>
            <span style={styles.profileLabel}>📊 স্ট্যাটাস</span>
            <span style={{ ...styles.profileValue, color: '#16a34a' }}>
              ✅ সক্রিয়
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto' },
  welcomeSection: { marginBottom: '28px' },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  welcomeName: { color: '#16a34a' },
  welcomeSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
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
  cardIcon: { fontSize: '32px' },
  cardValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 1.2,
  },
  cardLabel: { fontSize: '12px', color: '#64748b', fontWeight: '500' },
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
  profileLabel: { fontSize: '11px', color: '#94a3b8', fontWeight: '500' },
  profileValue: { fontSize: '14px', color: '#0f172a', fontWeight: '600' },
};
