import React from 'react';

export default function Settings() {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚙️ সেটিংস</h2>
      <p style={styles.subtitle}>সাইটের সাধারণ সেটিংস এখান থেকে পরিবর্তন করুন</p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📊 সাইট তথ্য</h3>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>সাইটের নাম:</span>
          <span style={styles.infoValue}>চিলমারী প্রি ক্যাডেট মাদ্রাসা</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>ভাষা:</span>
          <span style={styles.infoValue}>বাংলা</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>সময় অঞ্চল:</span>
          <span style={styles.infoValue}>GMT+6 (বাংলাদেশ)</span>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>🔐 নিরাপত্তা</h3>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>সেশন সময়:</span>
          <span style={styles.infoValue}>৭ দিন</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>রোল ভিত্তিক অ্যাক্সেস:</span>
          <span style={styles.infoValue}>✅ সক্রিয়</span>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>📱 অ্যাডমিন প্যানেল</h3>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>সংস্করণ:</span>
          <span style={styles.infoValue}>v1.0.0</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>বিল্ড তারিখ:</span>
          <span style={styles.infoValue}>{new Date().toLocaleDateString('bn-BD')}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  card: { background: 'white', borderRadius: '14px', padding: '20px', marginBottom: '16px', border: '1px solid #e2e8f0' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc' },
  infoLabel: { color: '#64748b', fontWeight: '500' },
  infoValue: { color: '#0f172a', fontWeight: '600' },
};
