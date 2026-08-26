import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabaseClient';

export default function Dashboard() {
  const { adminUser, logout } = useAdmin();
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
    { icon: '🎓', label: 'ছাত্র', value: stats.students, color: '#3b82f6' },
    { icon: '👨‍🏫', label: 'শিক্ষক', value: stats.teachers, color: '#16a34a' },
    { icon: '📢', label: 'নোটিশ', value: stats.notices, color: '#f59e0b' },
    { icon: '🖼️', label: 'গ্যালারি', value: stats.images, color: '#8b5cf6' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 ড্যাশবোর্ড</h1>
        <p style={styles.subtitle}>স্বাগতম, {adminUser?.name}! 👋</p>
      </div>

      <div style={styles.grid}>
        {cards.map((card, i) => (
          <div key={i} style={{ ...styles.card, borderTop: `4px solid ${card.color}` }}>
            <span style={styles.icon}>{card.icon}</span>
            <div>
              <div style={styles.value}>{card.value}</div>
              <div style={styles.label}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.profileCard}>
        <h2 style={styles.profileTitle}>👤 আপনার প্রোফাইল</h2>
        <div style={styles.profileInfo}>
          <p><strong>নাম:</strong> {adminUser?.name}</p>
          <p><strong>ইমেইল:</strong> {adminUser?.email}</p>
          <p><strong>রোল:</strong> {adminUser?.role === 'super_admin' ? '⭐ সুপার অ্যাডমিন' : '🔹 অ্যাডমিন'}</p>
          <p><strong>স্ট্যাটাস:</strong> {adminUser?.is_active ? '✅ সক্রিয়' : '❌ নিষ্ক্রিয়'}</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>🚪 লগআউট</button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '24px 20px', fontFamily: 'Arial' },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '16px', color: '#64748b', margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' },
  card: { background: 'white', padding: '20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' },
  icon: { fontSize: '32px' },
  value: { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
  label: { fontSize: '13px', color: '#64748b' },
  profileCard: { background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' },
  profileTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' },
  profileInfo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: '16px' },
  logoutBtn: { background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
};
