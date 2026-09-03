import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import StudentDetailModal from '../components/StudentDetailModal';

export default function StudentApproval() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudents(data || []);
      const total = data?.length || 0;
      const pending = data?.filter(s => s.is_approved === undefined || s.is_approved === null).length || 0;
      const approved = data?.filter(s => s.is_approved === true).length || 0;
      const rejected = data?.filter(s => s.is_approved === false).length || 0;
      setStats({ total, pending, approved, rejected });
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel('student-approval-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const updateStatus = async (id, newStatus) => {
    const confirmMsg = newStatus === true 
      ? '✅ এই ছাত্রকে অনুমোদন করতে চান?'
      : '❌ এই ছাত্রকে বাতিল করতে চান?';
    
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ is_approved: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchStudents();
      alert(`✅ ছাত্র ${newStatus === true ? 'অনুমোদন' : 'বাতিল'} করা হয়েছে!`);
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ স্ট্যাটাস আপডেট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  const getStatusBadge = (isApproved) => {
    if (isApproved === true) return { label: '✅ অনুমোদিত', color: '#16a34a', bg: '#dcfce7' };
    if (isApproved === false) return { label: '❌ বাতিল', color: '#dc2626', bg: '#fee2e2' };
    return { label: '⏳ pending', color: '#f59e0b', bg: '#fef3c7' };
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>✅ ছাত্র অনুমোদন</h2>
      <p style={styles.subtitle}>নতুন রেজিস্টার করা ছাত্রদের অনুমোদন বা বাতিল করুন</p>

      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <div style={styles.statNumber}>{stats.total}</div>
            <div style={styles.statLabel}>মোট ছাত্র</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={styles.statIcon}>⏳</div>
          <div>
            <div style={styles.statNumber}>{stats.pending}</div>
            <div style={styles.statLabel}>pending</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statNumber}>{stats.approved}</div>
            <div style={styles.statLabel}>অনুমোদিত</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
          <div style={styles.statIcon}>❌</div>
          <div>
            <div style={styles.statNumber}>{stats.rejected}</div>
            <div style={styles.statLabel}>বাতিল</div>
          </div>
        </div>
      </div>

      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 নাম বা ইমেইল দিয়ে খুঁজুন..."
          onChange={(e) => {
            const value = e.target.value.toLowerCase();
            const filtered = students.filter(s => 
              s.name?.toLowerCase().includes(value) ||
              s.email?.toLowerCase().includes(value)
            );
            setStudents(filtered);
          }}
          style={styles.searchInput}
        />
        <select
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'all') fetchStudents();
            else {
              const filtered = students.filter(s => {
                if (value === 'pending') return s.is_approved === undefined || s.is_approved === null;
                if (value === 'approved') return s.is_approved === true;
                if (value === 'rejected') return s.is_approved === false;
                return true;
              });
              setStudents(filtered);
            }
          }}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব</option>
          <option value="pending">⏳ pending</option>
          <option value="approved">✅ অনুমোদিত</option>
          <option value="rejected">❌ বাতিল</option>
        </select>
        <button onClick={fetchStudents} style={styles.refreshBtn}>🔄 রিফ্রেশ</button>
        <span style={styles.resultCount}>{students.length} টি</span>
      </div>

      {loading ? (
        <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
      ) : students.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো ছাত্র পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>নাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>ইমেইল</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const badge = getStatusBadge(student.is_approved);
                return (
                  <tr key={student.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <span
                        style={styles.clickableName}
                        onClick={() => {
                          setSelectedStudent(student);
                          setModalOpen(true);
                        }}
                      >
                        {student.name}
                      </span>
                    </td>
                    <td style={styles.td}>{student.class_name || '—'}</td>
                    <td style={styles.td}>{student.email || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(student.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setModalOpen(true);
                        }}
                        style={styles.detailBtn}
                        title="বিস্তারিত"
                      >
                        📋
                      </button>
                      {(student.is_approved === undefined || student.is_approved === null) && (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => updateStatus(student.id, true)}
                            disabled={actionLoading}
                            style={styles.approveBtn}
                            title="অনুমোদন"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => updateStatus(student.id, false)}
                            disabled={actionLoading}
                            style={styles.rejectBtn}
                            title="বাতিল"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchStudents}
        />
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 16px', fontFamily: "'Hind Siliguri', sans-serif" },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '20px 24px', borderRadius: '14px', color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  statIcon: { fontSize: '32px' },
  statNumber: { fontSize: '28px', fontWeight: '800', lineHeight: 1.2 },
  statLabel: { fontSize: '13px', opacity: 0.9 },
  filterBar: {
    display: 'flex', gap: '12px', flexWrap: 'wrap',
    marginBottom: '20px', padding: '16px',
    background: 'white', borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  searchInput: {
    flex: 1, minWidth: '200px',
    padding: '10px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '14px',
    outline: 'none',
  },
  filterSelect: {
    padding: '10px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '14px',
    outline: 'none', background: 'white',
  },
  refreshBtn: {
    padding: '10px 20px', borderRadius: '10px',
    border: 'none', background: '#f1f5f9',
    fontWeight: '600', cursor: 'pointer',
  },
  resultCount: {
    display: 'flex', alignItems: 'center',
    fontSize: '14px', color: '#64748b', fontWeight: '500',
  },
  loading: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '60px 0', color: '#94a3b8' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  tableWrapper: { overflowX: 'auto', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '650px' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    background: '#f8fafc', fontWeight: '700',
    color: '#334155', borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  clickableName: {
    color: '#2563eb', fontWeight: '600',
    cursor: 'pointer', textDecoration: 'underline',
  },
  badge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block' },
  detailBtn: {
    background: '#e0e7ff', color: '#4338ca', border: 'none',
    padding: '5px 12px', borderRadius: '6px', fontWeight: '600',
    cursor: 'pointer', fontSize: '14px', marginRight: '6px',
  },
  actionButtons: { display: 'inline-flex', gap: '4px' },
  approveBtn: {
    background: '#dcfce7', border: 'none', padding: '5px 10px',
    borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
  },
  rejectBtn: {
    background: '#fee2e2', border: 'none', padding: '5px 10px',
    borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
  },
};
