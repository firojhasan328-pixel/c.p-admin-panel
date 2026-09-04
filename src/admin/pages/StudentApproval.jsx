import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function StudentApproval() {
  const { adminUser } = useAdmin();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  // ✅ স্ট্যাটিস্টিক্স স্টেট
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // =============================================
  // ✅ ডেটা ফেচ + রিয়েল টাইম
  // =============================================
  useEffect(() => {
    fetchStudents();

    // ✅ Realtime subscription
    const channel = supabase
      .channel('student-approval-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'registration_requests',
      }, () => {
        fetchStudents(); // রিফ্রেশ ছাড়াই আপডেট
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // ✅ registration_requests থেকে ডেটা নিন (role = student)
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudents(data || []);

      // ✅ স্ট্যাটিস্টিক্স ক্যালকুলেশন
      const total = data?.length || 0;
      const pending = data?.filter(s => s.status === 'pending').length || 0;
      const approved = data?.filter(s => s.status === 'approved').length || 0;
      const rejected = data?.filter(s => s.status === 'rejected').length || 0;

      setStats({ total, pending, approved, rejected });

    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
    }
    setLoading(false);
  };

  // =============================================
  // ✅ অনুমোদন ফাংশন
  // =============================================
  const handleApprove = async (request) => {
    if (!confirm(`"${request.student_name}"-কে অনুমোদন দিতে চান?`)) return;

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // ১. registration_requests আপডেট
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.email || 'admin',
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // ২. students টেবিলে যোগ করুন
      const studentData = {
        name: request.student_name,
        class_name: request.class_name || '—',
        father_name: request.father_name || null,
        mother_name: request.mother_name || null,
        phone: request.phone,
        email: request.email,
        photo_url: request.student_photo || null,
        is_approved: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      // ইমেইল দিয়ে existing চেক
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('email', request.email)
        .maybeSingle();

      if (existingStudent) {
        await supabase
          .from('students')
          .update(studentData)
          .eq('id', existingStudent.id);
      } else {
        const { data: newStudent } = await supabase
          .from('students')
          .insert([studentData])
          .select();
        console.log('✅ Student added:', newStudent);
      }

      // ৩. registration_codes আপডেট
      await supabase
        .from('registration_codes')
        .update({
          is_used: true,
          used_by: request.email,
          used_at: new Date().toISOString(),
        })
        .eq('code', request.code);

      // ৪. লগ তৈরি
      await supabase
        .from('registration_logs')
        .insert([{
          code: request.code,
          action: 'approved',
          email: request.email,
          role: 'student',
        }]);

      setSuccessMessage(`✅ "${request.student_name}" অনুমোদন করা হয়েছে!`);
      await fetchStudents(); // রিফ্রেশ

      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Approve error:', error);
      setErrorMessage('❌ অনুমোদন করতে সমস্যা: ' + error.message);
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ বাতিল ফাংশন
  // =============================================
  const handleReject = async (request) => {
    if (!confirm(`"${request.student_name}"-কে বাতিল করতে চান?`)) return;

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: adminUser?.email || 'admin',
        })
        .eq('id', request.id);

      if (error) throw error;

      await supabase
        .from('registration_logs')
        .insert([{
          code: request.code,
          action: 'rejected',
          email: request.email,
          role: 'student',
        }]);

      setSuccessMessage(`❌ "${request.student_name}" বাতিল করা হয়েছে!`);
      await fetchStudents();

      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Reject error:', error);
      setErrorMessage('❌ বাতিল করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ ডিলিট (রিসাইকেল বিনে)
  // =============================================
  const handleDelete = async (request) => {
    if (!confirm(`"${request.student_name}"-কে রিসাইকেল বিনে সরাতে চান?`)) return;

    setActionLoading(true);

    try {
      await supabase
        .from('recycle_bin')
        .insert([{
          original_table: 'registration_requests',
          original_id: request.id,
          data: JSON.stringify(request),
          original_data: JSON.stringify(request),
          deleted_by: adminUser?.email || 'admin',
          deleted_at: new Date().toISOString(),
        }]);

      await supabase
        .from('registration_requests')
        .delete()
        .eq('id', request.id);

      setSuccessMessage(`✅ "${request.student_name}" রিসাইকেল বিনে সরানো হয়েছে!`);
      await fetchStudents();

      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('❌ ডিলিট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ ফিল্টার
  // =============================================
  const getFilteredStudents = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone?.includes(searchTerm)
      );
    }

    if (filter === 'pending') {
      filtered = filtered.filter(s => s.status === 'pending');
    } else if (filter === 'approved') {
      filtered = filtered.filter(s => s.status === 'approved');
    } else if (filter === 'rejected') {
      filtered = filtered.filter(s => s.status === 'rejected');
    }

    return filtered;
  };

  const filteredStudents = getFilteredStudents();

  // =============================================
  // ✅ স্ট্যাটাস ব্যাজ
  // =============================================
  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fef3c7', color: '#f59e0b', label: '⏳ pending' },
      approved: { background: '#dcfce7', color: '#16a34a', label: '✅ অনুমোদিত' },
      rejected: { background: '#fee2e2', color: '#dc2626', label: '❌ বাতিল' },
    };
    return styles[status] || styles.pending;
  };

  // =============================================
  // ✅ সিলেক্ট/ডি-সিলেক্ট (বাল্ক অ্যাকশনের জন্য)
  // =============================================
  const toggleSelect = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  // ✅ বাল্ক অনুমোদন
  const bulkApprove = async () => {
    if (selectedStudents.length === 0) {
      alert('⚠️ দয়া করে অন্তত একজন সিলেক্ট করুন!');
      return;
    }
    if (!confirm(`${selectedStudents.length} জনকে অনুমোদন দিতে চান?`)) return;

    setActionLoading(true);
    for (const id of selectedStudents) {
      const student = students.find(s => s.id === id);
      if (student) await handleApprove(student);
    }
    setSelectedStudents([]);
    setActionLoading(false);
  };

  // ✅ বাল্ক বাতিল
  const bulkReject = async () => {
    if (selectedStudents.length === 0) {
      alert('⚠️ দয়া করে অন্তত একজন সিলেক্ট করুন!');
      return;
    }
    if (!confirm(`${selectedStudents.length} জনকে বাতিল করতে চান?`)) return;

    setActionLoading(true);
    for (const id of selectedStudents) {
      const student = students.find(s => s.id === id);
      if (student) await handleReject(student);
    }
    setSelectedStudents([]);
    setActionLoading(false);
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
      {/* পপআপ মেসেজ */}
      {successMessage && (
        <div style={styles.popupSuccess}>
          <span style={styles.popupIcon}>✅</span>
          <span style={styles.popupText}>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div style={styles.popupError}>
          <span style={styles.popupIcon}>⚠️</span>
          <span style={styles.popupText}>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      <h2 style={styles.title}>✅ ছাত্র অনুমোদন</h2>
      <p style={styles.subtitle}>নতুন রেজিস্টার করা ছাত্রদের অনুমোদন বা বাতিল করুন</p>

      {/* ✅ স্ট্যাটিস্টিক্স — রিয়েল টাইম */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <div style={styles.statNumber}>{stats.total}</div>
            <div style={styles.statLabel}>মোট অনুরোধ</div>
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

      {/* ✅ ফিল্টার বার */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="pending">⏳ pending</option>
          <option value="approved">✅ অনুমোদিত</option>
          <option value="rejected">❌ বাতিল</option>
        </select>

        {/* ✅ বাল্ক অ্যাকশন বাটন */}
        {selectedStudents.length > 0 && (
          <div style={styles.bulkActions}>
            <span style={styles.bulkCount}>{selectedStudents.length} টি সিলেক্টেড</span>
            <button onClick={bulkApprove} disabled={actionLoading} style={styles.bulkApproveBtn}>
              ✅ সব অনুমোদন
            </button>
            <button onClick={bulkReject} disabled={actionLoading} style={styles.bulkRejectBtn}>
              ❌ সব বাতিল
            </button>
          </div>
        )}

        <button onClick={fetchStudents} style={styles.refreshBtn}>🔄 রিফ্রেশ</button>
        <span style={styles.resultCount}>{filteredStudents.length} টি</span>
      </div>

      {/* ✅ টেবিল */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>⏳ লোড হচ্ছে...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>{filter === 'pending' ? 'কোনো pending অনুরোধ নেই ✅' : 'কোনো ছাত্র পাওয়া যায়নি'}</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>#</th>
                <th style={styles.th}>ছবি</th>
                <th style={styles.th}>নাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>ফোন</th>
                <th style={styles.th}>ইমেইল</th>
                <th style={styles.th}>কোড</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const badge = getStatusBadge(student.status);
                return (
                  <tr key={student.id} style={styles.tr}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleSelect(student.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      {student.student_photo ? (
                        <img
                          src={student.student_photo}
                          alt={student.student_name}
                          style={styles.avatar}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {student.student_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={styles.clickableName}
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowDetailModal(true);
                        }}
                      >
                        {student.student_name}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{student.class_name || '—'}</span>
                    </td>
                    <td style={styles.td}>{student.phone}</td>
                    <td style={styles.td}>{student.email}</td>
                    <td style={styles.td}>
                      <span style={styles.codeBadge}>{student.code}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: badge.background,
                        color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(student.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      {student.status === 'pending' && (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailModal(true);
                            }}
                            style={styles.detailBtn}
                            title="বিস্তারিত"
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleApprove(student)}
                            disabled={actionLoading}
                            style={styles.approveBtn}
                            title="অনুমোদন"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleReject(student)}
                            disabled={actionLoading}
                            style={styles.rejectBtn}
                            title="বাতিল"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                      {student.status !== 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowDetailModal(true);
                            }}
                            style={styles.detailBtn}
                            title="বিস্তারিত"
                          >
                            📋
                          </button>
                          <span style={styles.statusText}>
                            {student.status === 'approved' ? '✅' : '❌'}
                          </span>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(student)}
                        disabled={actionLoading}
                        style={styles.deleteBtn}
                        title="রিসাইকেল বিনে সরান"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ বিস্তারিত মোডাল */}
      {showDetailModal && selectedStudent && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>✕</button>
            <h3 style={styles.modalTitle}>📋 ছাত্র বিস্তারিত</h3>

            <div style={styles.modalContent}>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👤 নাম</span>
                <span style={styles.modalValue}>{selectedStudent.student_name}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📚 ক্লাস</span>
                <span style={styles.modalValue}>{selectedStudent.class_name || '—'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👨 বাবা</span>
                <span style={styles.modalValue}>{selectedStudent.father_name || '—'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👩 মা</span>
                <span style={styles.modalValue}>{selectedStudent.mother_name || '—'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📱 ফোন</span>
                <span style={styles.modalValue}>{selectedStudent.phone}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📧 ইমেইল</span>
                <span style={styles.modalValue}>{selectedStudent.email}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>🔑 কোড</span>
                <span style={styles.modalValue}><span style={styles.codeBadge}>{selectedStudent.code}</span></span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📌 স্ট্যাটাস</span>
                <span style={{
                  ...styles.badge,
                  background: getStatusBadge(selectedStudent.status).background,
                  color: getStatusBadge(selectedStudent.status).color,
                }}>
                  {getStatusBadge(selectedStudent.status).label}
                </span>
              </div>
              {selectedStudent.student_photo && (
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>📸 ছবি</span>
                  <img
                    src={selectedStudent.student_photo}
                    alt={selectedStudent.student_name}
                    style={styles.modalImage}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {selectedStudent.status === 'pending' && (
              <div style={styles.modalActions}>
                <button
                  onClick={() => { handleApprove(selectedStudent); setShowDetailModal(false); }}
                  disabled={actionLoading}
                  style={styles.modalApproveBtn}
                >
                  ✅ অনুমোদন
                </button>
                <button
                  onClick={() => { handleReject(selectedStudent); setShowDetailModal(false); }}
                  disabled={actionLoading}
                  style={styles.modalRejectBtn}
                >
                  ❌ বাতিল
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// 🎨 স্টাইলসমূহ
// =============================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
    fontFamily: "'Hind Siliguri', sans-serif",
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    borderRadius: '14px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    minHeight: '70px',
  },
  statIcon: { fontSize: '28px' },
  statNumber: { fontSize: '26px', fontWeight: '800', lineHeight: 1.2 },
  statLabel: { fontSize: '13px', opacity: 0.9 },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: '180px',
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
    minWidth: '120px',
  },
  refreshBtn: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    background: '#f1f5f9',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  resultCount: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#64748b',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 0',
    color: '#94a3b8',
  },
  emptyIcon: {
    fontSize: '56px',
    display: 'block',
    marginBottom: '12px',
  },
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
    minWidth: '1000px',
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
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#16a34a',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#16a34a',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: '700',
  },
  clickableName: {
    color: '#2563eb',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  classBadge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  codeBadge: {
    background: '#f1f5f9',
    color: '#0f172a',
    padding: '2px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  detailBtn: {
    background: '#e0e7ff',
    color: '#4338ca',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  approveBtn: {
    background: '#dcfce7',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  rejectBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  deleteBtn: {
    background: '#fef2f2',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#dc2626',
  },
  statusText: { fontSize: '18px' },
  bulkActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bulkCount: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    background: '#f1f5f9',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  bulkApproveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '12px',
  },
  bulkRejectBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '12px',
  },
  // পপআপ
  popupSuccess: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#166534',
    padding: '16px 24px',
    borderRadius: '14px',
    boxShadow: '0 10px 30px rgba(22, 163, 74, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.5s ease',
    border: '1px solid #86efac',
    maxWidth: '400px',
  },
  popupError: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
    color: '#991b1b',
    padding: '16px 24px',
    borderRadius: '14px',
    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'slideIn 0.5s ease',
    border: '1px solid #fca5a5',
    maxWidth: '400px',
  },
  popupIcon: { fontSize: '24px' },
  popupText: { fontSize: '15px', fontWeight: '600', flex: 1 },
  popupClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
  },
  // মোডাল
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: '28px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#f1f5f9',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '18px',
    cursor: 'pointer',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  },
  modalLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  modalValue: {
    fontWeight: '500',
    color: '#0f172a',
  },
  modalImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    justifyContent: 'center',
  },
  modalApproveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalRejectBtn: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
