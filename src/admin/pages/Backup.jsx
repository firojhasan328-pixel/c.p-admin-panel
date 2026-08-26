import React, { useState } from 'react';

export default function Backup() {
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState('');

  const handleBackup = async () => {
    setBackupRunning(true);
    setBackupSuccess('');

    try {
      // Simulate backup
      await new Promise(resolve => setTimeout(resolve, 2000));
      setBackupSuccess('✅ ব্যাকআপ সফলভাবে তৈরি করা হয়েছে!');
    } catch (error) {
      console.error('Backup error:', error);
      alert('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে');
    }
    setBackupRunning(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>💾 ব্যাকআপ ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>ডেটাবেসের ব্যাকআপ তৈরি, রিস্টোর ও এক্সপোর্ট করুন</p>

      {backupSuccess && <div style={styles.success}>{backupSuccess}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>📤</div>
          <h3 style={styles.cardTitle}>ব্যাকআপ তৈরি</h3>
          <p style={styles.cardDesc}>সম্পূর্ণ ডেটাবেসের ব্যাকআপ তৈরি করুন</p>
          <button onClick={handleBackup} disabled={backupRunning} style={styles.primaryBtn}>
            {backupRunning ? '⏳ তৈরি হচ্ছে...' : '💾 ব্যাকআপ নিন'}
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📥</div>
          <h3 style={styles.cardTitle}>রিস্টোর</h3>
          <p style={styles.cardDesc}>পূর্বের ব্যাকআপ থেকে ডেটা রিস্টোর করুন</p>
          <button style={styles.secondaryBtn}>📥 রিস্টোর করুন</button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📦</div>
          <h3 style={styles.cardTitle}>এক্সপোর্ট</h3>
          <p style={styles.cardDesc}>ডেটা JSON ফরম্যাটে এক্সপোর্ট করুন</p>
          <button style={styles.secondaryBtn}>📦 এক্সপোর্ট</button>
        </div>

        <div style={styles.card}>
          <div style={styles.cardIcon}>📂</div>
          <h3 style={styles.cardTitle}>ইমপোর্ট</h3>
          <p style={styles.cardDesc}>JSON ফাইল থেকে ডেটা ইমপোর্ট করুন</p>
          <button style={styles.secondaryBtn}>📂 ইমপোর্ট</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  success: { background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', borderLeft: '4px solid #16a34a' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  card: { background: 'white', borderRadius: '14px', padding: '24px 20px', textAlign: 'center', border: '1px solid #e2e8f0' },
  cardIcon: { fontSize: '32px', marginBottom: '8px' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  cardDesc: { fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' },
  primaryBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', width: '100%' },
  secondaryBtn: { background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', width: '100%' },
};
