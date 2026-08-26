import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function Permissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Fetch permissions error:', error);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔐 পারমিশন ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>সব পারমিশনের তালিকা ও রোল অনুযায়ী অ্যাক্সেস নিয়ন্ত্রণ</p>

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.colName}>পারমিশন নাম</span>
            <span style={styles.colCategory}>ক্যাটাগরি</span>
            <span style={styles.colDesc}>বিবরণ</span>
          </div>
          {permissions.map((perm) => (
            <div key={perm.id} style={styles.tableRow}>
              <span style={styles.colName}>{perm.name}</span>
              <span style={styles.colCategory}>
                <span style={styles.categoryBadge}>{perm.category}</span>
              </span>
              <span style={styles.colDesc}>{perm.description || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  table: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  tableHeader: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr', padding: '12px 16px', background: '#f1f5f9', fontWeight: '700', fontSize: '13px', color: '#334155' },
  tableRow: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr', padding: '10px 16px', borderTop: '1px solid #f1f5f9', alignItems: 'center', fontSize: '13px' },
  colName: { fontWeight: '600', color: '#0f172a' },
  colCategory: {}, colDesc: { color: '#64748b' },
  categoryBadge: { background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
};
