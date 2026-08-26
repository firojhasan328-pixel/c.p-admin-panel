import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await supabase
        .from('admin_users')
        .update({ role: newRole })
        .eq('id', userId);
      fetchUsers();
    } catch (error) {
      console.error('Update role error:', error);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      fetchUsers();
    } catch (error) {
      console.error('Toggle status error:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👥 ব্যবহারকারী ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>অ্যাডমিন ও শিক্ষকদের তালিকা ও পারমিশন</p>

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.colName}>নাম</span>
            <span style={styles.colEmail}>ইমেইল</span>
            <span style={styles.colRole}>রোল</span>
            <span style={styles.colStatus}>স্ট্যাটাস</span>
            <span style={styles.colActions}>অ্যাকশন</span>
          </div>
          {users.map((user) => (
            <div key={user.id} style={styles.tableRow}>
              <span style={styles.colName}>{user.name}</span>
              <span style={styles.colEmail}>{user.email}</span>
              <span style={styles.colRole}>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={styles.roleSelect}
                >
                  <option value="super_admin">⭐ সুপার অ্যাডমিন</option>
                  <option value="admin">🔹 অ্যাডমিন</option>
                  <option value="teacher">👨‍🏫 শিক্ষক</option>
                  <option value="viewer">👁️ দর্শক</option>
                </select>
              </span>
              <span style={styles.colStatus}>
                <span style={{ ...styles.statusBadge, background: user.is_active ? '#dcfce7' : '#fee2e2', color: user.is_active ? '#16a34a' : '#dc2626' }}>
                  {user.is_active ? '✅ সক্রিয়' : '❌ নিষ্ক্রিয়'}
                </span>
              </span>
              <span style={styles.colActions}>
                <button onClick={() => handleToggleActive(user.id, user.is_active)} style={styles.toggleBtn}>
                  {user.is_active ? '⏸️' : '▶️'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  table: { background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  tableHeader: { display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.5fr', padding: '12px 16px', background: '#f1f5f9', fontWeight: '700', fontSize: '13px', color: '#334155' },
  tableRow: { display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.5fr', padding: '10px 16px', borderTop: '1px solid #f1f5f9', alignItems: 'center', fontSize: '13px' },
  colName: { fontWeight: '600', color: '#0f172a' },
  colEmail: { color: '#64748b' },
  colRole: {}, colStatus: {}, colActions: {},
  roleSelect: { padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: 'white' },
  statusBadge: { padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  toggleBtn: { background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' },
};
