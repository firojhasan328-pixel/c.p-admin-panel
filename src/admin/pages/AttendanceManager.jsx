import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function AttendanceManager() {
  const { adminUser } = useAdmin();
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const classNames = ['প্লে', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];

  // =============================================
  // ✅ ডেটা লোড + রিয়েল টাইম
  // =============================================
  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedClass]);

  useEffect(() => {
    const channel = supabase
      .channel('attendance-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance',
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // ১. students লোড
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class_name, roll_number')
        .eq('is_approved', true)
        .order('class_name')
        .order('roll_number');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // ২. attendance লোড (নির্দিষ্ট তারিখের)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate);

      if (attendanceError) throw attendanceError;

      // ৩. ফিল্টার + স্ট্যাটস
      let filteredStudents = studentsData || [];
      if (selectedClass !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.class_name === selectedClass);
      }

      const attendanceMap = {};
      attendanceData?.forEach(a => {
        attendanceMap[a.student_id] = a;
      });

      const mergedData = filteredStudents.map(student => ({
        ...student,
        status: attendanceMap[student.id]?.status || null,
        attendance_id: attendanceMap[student.id]?.id || null,
      }));

      setAttendance(mergedData);

      // ✅ স্ট্যাটিস্টিক্স
      const total = mergedData.length;
      const present = mergedData.filter(a => a.status === 'present').length;
      const absent = mergedData.filter(a => a.status === 'absent').length;
      const late = mergedData.filter(a => a.status === 'late').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ total, present, absent, late, percentage });

    } catch (error) {
      console.error('❌ ডেটা লোড করতে সমস্যা:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ উপস্থিতি আপডেট (সঠিক সমাধান)
  // =============================================
  const updateAttendance = async (studentId, status) => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // ১. আগের এন্ট্রি আছে কিনা চেক করো
      const { data: existing, error: checkError } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('student_id', studentId)
        .eq('date', selectedDate)
        .maybeSingle();

      if (checkError) throw checkError;

      let error;

      if (existing) {
        // ২. আপডেট করো (যদি থাকে)
        const { error: updateError } = await supabase
          .from('attendance')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        // ৩. নতুন এন্ট্রি তৈরি করো (যদি না থাকে)
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            student_id: studentId,
            date: selectedDate,
            status: status,
          }]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage('✅ উপস্থিতি সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // ৪. ডেটা রিফ্রেশ করো
      await fetchData();

    } catch (error) {
      console.error('❌ আপডেট করতে সমস্যা:', error);
      setErrorMessage('❌ আপডেট করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setSaving(false);
  };

  // =============================================
  // ✅ বাল্ক আপডেট
  // =============================================
  const bulkUpdate = async (status) => {
    if (!confirm(`সবাইকে "${status === 'present' ? 'উপস্থিত' : status === 'absent' ? 'অনুপস্থিত' : 'দেরি'}" হিসাবে চিহ্নিত করতে চান?`)) return;

    setSaving(true);
    try {
      for (const student of attendance) {
        await updateAttendance(student.id, status);
      }
      setSuccessMessage(`✅ সবাইকে ${status === 'present' ? 'উপস্থিত' : status === 'absent' ? 'অনুপস্থিত' : 'দেরি'} করা হয়েছে!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('❌ বাল্ক আপডেট করতে সমস্যা:', error);
      setErrorMessage('❌ বাল্ক আপডেট করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setSaving(false);
  };

  // =============================================
  // ✅ ফিল্টার
  // =============================================
  const getFilteredData = () => {
    let filtered = attendance;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // =============================================
  // ✅ স্ট্যাটাস ব্যাজ
  // =============================================
  const getStatusBadge = (status) => {
    const statuses = {
      present: { label: '✅ উপস্থিত', bg: '#dcfce7', color: '#16a34a' },
      absent: { label: '❌ অনুপস্থিত', bg: '#fee2e2', color: '#dc2626' },
      late: { label: '⏰ দেরি', bg: '#fef3c7', color: '#f59e0b' },
    };
    return statuses[status] || { label: '—', bg: '#f1f5f9', color: '#94a3b8' };
  };

  // =============================================
  // ✅ লোডিং
  // =============================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>⏳ লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* পপআপ মেসেজ */}
      {successMessage && (
        <div style={styles.popupSuccess}>
          <span>✅</span> {successMessage}
          <button onClick={() => setSuccessMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div style={styles.popupError}>
          <span>⚠️</span> {errorMessage}
          <button onClick={() => setErrorMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      {/* হেডার */}
      <div style={styles.header}>
        <h2 style={styles.title}>📈 উপস্থিতি ম্যানেজার</h2>
      </div>

      {/* স্ট্যাটিস্টিক্স */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.percentage}%</div>
          <div style={styles.statLabel}>উপস্থিতি</div>
        </div>
        <div style={{ ...styles.statCard, background: '#dcfce7' }}>
          <div style={{ ...styles.statNumber, color: '#16a34a' }}>{stats.present}</div>
          <div style={styles.statLabel}>✅ উপস্থিত</div>
        </div>
        <div style={{ ...styles.statCard, background: '#fee2e2' }}>
          <div style={{ ...styles.statNumber, color: '#dc2626' }}>{stats.absent}</div>
          <div style={styles.statLabel}>❌ অনুপস্থিত</div>
        </div>
        <div style={{ ...styles.statCard, background: '#fef3c7' }}>
          <div style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.late}</div>
          <div style={styles.statLabel}>⏰ দেরি</div>
        </div>
      </div>

      {/* ফিল্টার বার */}
      <div style={styles.filterBar}>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={styles.dateInput}
        />
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব ক্লাস</option>
          {classNames.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="🔍 ছাত্রের নাম খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.resultCount}>{filteredData.length} জন</span>
      </div>

      {/* বাল্ক অ্যাকশন */}
      <div style={styles.bulkActions}>
        <span style={styles.bulkLabel}>⚡ বাল্ক অ্যাকশন:</span>
        <button
          onClick={() => bulkUpdate('present')}
          disabled={saving}
          style={{ ...styles.bulkBtn, background: '#16a34a' }}
        >
          ✅ সব উপস্থিত
        </button>
        <button
          onClick={() => bulkUpdate('absent')}
          disabled={saving}
          style={{ ...styles.bulkBtn, background: '#dc2626' }}
        >
          ❌ সব অনুপস্থিত
        </button>
        <button
          onClick={() => bulkUpdate('late')}
          disabled={saving}
          style={{ ...styles.bulkBtn, background: '#f59e0b' }}
        >
          ⏰ সব দেরি
        </button>
      </div>

      {/* টেবিল */}
      {filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো ছাত্র পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>ছাত্র</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>রোল</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((student, index) => {
                const status = getStatusBadge(student.status);
                return (
                  <tr key={student.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <div style={styles.studentInfo}>
                        <strong>{student.name}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{student.class_name}</span>
                    </td>
                    <td style={styles.td}>{student.roll_number || '—'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: status.bg,
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => updateAttendance(student.id, 'present')}
                          disabled={saving}
                          style={{ ...styles.actionBtn, background: '#16a34a' }}
                          title="উপস্থিত"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => updateAttendance(student.id, 'absent')}
                          disabled={saving}
                          style={{ ...styles.actionBtn, background: '#dc2626' }}
                          title="অনুপস্থিত"
                        >
                          ❌
                        </button>
                        <button
                          onClick={() => updateAttendance(student.id, 'late')}
                          disabled={saving}
                          style={{ ...styles.actionBtn, background: '#f59e0b' }}
                          title="দেরি"
                        >
                          ⏰
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================
// 🎨 প্রিমিয়াম স্টাইল
// =============================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px 40px 16px',
    fontFamily: "'Hind Siliguri', sans-serif",
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  popupSuccess: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: '#dcfce7',
    color: '#166534',
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #86efac',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '400px',
  },
  popupError: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: '#fee2e2',
    color: '#991b1b',
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid #fca5a5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '400px',
  },
  popupClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '14px',
    background: 'white',
    border: '1px solid #e2e8f0',
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  dateInput: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
  },
  searchInput: {
    flex: 1,
    minWidth: '160px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
  },
  filterSelect: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    minWidth: '130px',
  },
  resultCount: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  bulkActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  bulkLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
  },
  bulkBtn: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#94a3b8',
  },
  emptyIcon: { fontSize: '56px', display: 'block', marginBottom: '12px' },
  tableWrapper: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '700px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '700',
    color: '#334155',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', verticalAlign: 'middle' },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  classBadge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  actionButtons: {
    display: 'flex',
    gap: '4px',
  },
  actionBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: 'none',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
  },
};

// অ্যানিমেশন
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
