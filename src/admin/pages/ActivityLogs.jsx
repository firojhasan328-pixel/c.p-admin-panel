import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Fetch logs error:', error);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📋 অ্যাক্টিভিটি লগ</h2>
      <p style={styles.subtitle}>কে কী করছে তা এখানে দেখুন</p>

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : logs.length === 0 ? (
        <p style={styles.emptyText}>কোনো অ্যাক্টিভিটি লগ নেই</p>
      ) : (
        <div style={styles.list}>
          {logs.map((log) => (
            <div key={log.id} style={styles.logItem}>
              <div style={styles.logHeader}>
                <span style={styles.logUser}>{log.user_name || 'সিস্টেম'}</span>
                <span style={styles.logAction}>{log.action}</span>
                <span style={styles.logTarget}>{log.target_name || log.target_type}</span>
              </div>
              <div style={styles.logFooter}>
                <span style={styles.logTime}>{new Date(log.created_at).toLocaleString('bn-BD')}</span>
                <span style={styles.logRole}>{log.user_role}</span>
              </div>
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
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: '40px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  logItem: { background: 'white', borderRadius: '10px', padding: '12px 16px', border: '1px solid #e2e8f0' },
  logHeader: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  logUser: { fontWeight: '700', color: '#0f172a' },
  logAction: { color: '#64748b' },
  logTarget: { fontWeight: '500', color: '#2563eb' },
  logFooter: { display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#94a3b8' },
  logTime: {}, logRole: { background: '#f1f5f9', padding: '0 8px', borderRadius: '4px' },
};
