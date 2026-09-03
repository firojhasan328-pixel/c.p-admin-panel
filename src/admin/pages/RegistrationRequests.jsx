import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function RegistrationRequests() {
  const { adminUser } = useAdmin();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | pending | approved | rejected
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // =============================================
  // ✅ ডেটা ফেচ
  // =============================================
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
    }
    setLoading(false);
  };

  // =============================================
  // ✅ রিয়েলটাইম সাবস্ক্রিপশন
  // =============================================
  useEffect(() => {
    const channel = supabase
      .channel('registration-requests-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'registration_requests',
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // =============================================
  // ✅ অনুমোদন ফাংশন
  // =============================================
  const handleApprove = async (request) => {
    if (!confirm(`"${request.student_name}"-এর অনুরোধটি অনুমোদন করতে চান?`)) return;

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // ১. registration_requests-এ স্ট্যাটাস আপডেট
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
        class_name: request.class_name,
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
        // ইতিমধ্যে আছে → আপডেট
        await supabase
          .from('students')
          .update(studentData)
          .eq('id', existingStudent.id);
      } else {
        // নতুন → ইনসার্ট
        await supabase
          .from('students')
          .insert([studentData]);
      }

      // ৩. registration_codes টেবিলে is_used = true করুন
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
        }]);

      setSuccessMessage(`✅ "${request.student_name}" অনুমোদন করা হয়েছে! ছাত্র এখন লগইন করতে পারবে।`);
      await fetchRequests();

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
    if (!confirm(`"${request.student_name}"-এর অনুরোধটি বাতিল করতে চান?`)) return;

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

      // লগ তৈরি
      await supabase
        .from('registration_logs')
        .insert([{
          code: request.code,
          action: 'rejected',
          email: request.email,
        }]);

      setSuccessMessage(`❌ "${request.student_name}"-এর অনুরোধ বাতিল করা হয়েছে!`);
      await fetchRequests();

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
    if (!confirm(`"${request.student_name}"-এর অনুরোধটি রিসাইকেল বিনে সরাতে চান?`)) return;

    setActionLoading(true);

    try {
      // রিসাইকেল বিনে পাঠান
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

      // মূল টেবিল থেকে ডিলিট
      await supabase
        .from('registration_requests')
        .delete()
        .eq('id', request.id);

      setSuccessMessage(`✅ "${request.student_name}"-এর অনুরোধ রিসাইকেল বিনে সরানো হয়েছে!`);
      await fetchRequests();

      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('❌ ডিলিট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ ফিল্টার ও সার্চ
  // =============================================
  const getFilteredRequests = () => {
    let filtered = requests;

    // সার্চ
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone?.includes(searchTerm) ||
        r.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ফিল্টার
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.status === filter);
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  // =============================================
  // ✅ স্ট্যাটিস্টিক্স
  // =============================================
  const total = requests.length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

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
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
      {/* ✅ পপআপ মেসেজ */}
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

      <h2 style={styles.title}>📩 ছাত্র অনুরোধ</h2>
      <p style={styles.subtitle}>যারা কোড যাচাই করে রেজিস্ট্রেশন করেছেন তাদের অনুরোধ এখানে দেখুন ও ব্যবস্থাপনা করুন</p>

      {/* ✅ স্ট্যাটিস্টিক্স */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <div style={styles.statNumber}>{total}</div>
            <div style={styles.statLabel}>মোট অনুরোধ</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={styles.statIcon}>⏳</div>
          <div>
            <div style={styles.statNumber}>{pending}</div>
            <div style={styles.statLabel}>pending</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statNumber}>{approved}</div>
            <div style={styles.statLabel}>অনুমোদিত</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
          <div style={styles.statIcon}>❌</div>
          <div>
            <div style={styles.statNumber}>{rejected}</div>
            <div style={styles.statLabel}>বাতিল</div>
          </div>
        </div>
      </div>

      {/* ✅ ফিল্টার বার */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 নাম, ইমেইল, ফোন বা কোড দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব</option>
          <option value="pending">⏳ pending</option>
          <option value="approved">✅ অনুমোদিত</option>
          <option value="rejected">❌ বাতিল</option>
        </select>
        <button onClick={fetchRequests} style={styles.refreshBtn}>🔄 রিফ্রেশ</button>
        <span style={styles.resultCount}>{filteredRequests.length} টি</span>
      </div>

      {/* ✅ টেবিল */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>⏳ লোড হচ্ছে...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো অনুরোধ পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>ছাত্রের নাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>কোড</th>
                <th style={styles.th}>ফোন</th>
                <th style={styles.th}>ইমেইল</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request, index) => {
                const badge = getStatusBadge(request.status);
                return (
                  <tr key={request.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <span
                        style={styles.clickableName}
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                      >
                        {request.student_name}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{request.class_name}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.codeBadge}>{request.code}</span>
                    </td>
                    <td style={styles.td}>{request.phone}</td>
                    <td style={styles.td}>{request.email}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: badge.background,
                        color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(request.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      {request.status === 'pending' && (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={actionLoading}
                            style={styles.approveBtn}
                            title="অনুমোদন"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            disabled={actionLoading}
                            style={styles.rejectBtn}
                            title="বাতিল"
                          >
                            ❌
                          </button>
                        </div>
                      )}

                      {request.status !== 'pending' && (
                        <span style={styles.statusText}>
                          {request.status === 'approved' ? '✅' : '❌'}
                        </span>
                      )}

                      <button
                        onClick={() => handleDelete(request)}
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
      {showDetailModal && selectedRequest && (
        <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>✕</button>
            <h3 style={styles.modalTitle}>📋 ছাত্র বিস্তারিত</h3>

            <div style={styles.modalContent}>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👤 নাম</span>
                <span style={styles.modalValue}>{selectedRequest.student_name}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📚 ক্লাস</span>
                <span style={styles.modalValue}>{selectedRequest.class_name}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👨 বাবা</span>
                <span style={styles.modalValue}>{selectedRequest.father_name || '—'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>👩 মা</span>
                <span style={styles.modalValue}>{selectedRequest.mother_name || '—'}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📱 ফোন</span>
                <span style={styles.modalValue}>{selectedRequest.phone}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📧 ইমেইল</span>
                <span style={styles.modalValue}>{selectedRequest.email}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>🔑 কোড</span>
                <span style={styles.modalValue}><span style={styles.codeBadge}>{selectedRequest.code}</span></span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📌 স্ট্যাটাস</span>
                <span style={{
                  ...styles.statusBadge,
                  background: getStatusBadge(selectedRequest.status).background,
                  color: getStatusBadge(selectedRequest.status).color,
                }}>
                  {getStatusBadge(selectedRequest.status).label}
                </span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>📅 আবেদনের তারিখ</span>
                <span style={styles.modalValue}>
                  {new Date(selectedRequest.created_at).toLocaleString('bn-BD')}
                </span>
              </div>
              {selectedRequest.approved_at && (
                <div style={styles.modalRow}>
                  <span style={styles.modalLabel}>✅ অনুমোদনের তারিখ</span>
                  <span style={styles.modalValue}>
                    {new Date(selectedRequest.approved_at).toLocaleString('bn-BD')}
                  </span>
                </div>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <div style={styles.modalActions}>
                <button
                  onClick={() => { handleApprove(selectedRequest); setShowDetailModal(false); }}
                  disabled={actionLoading}
                  style={styles.modalApproveBtn}
                >
                  ✅ অনুমোদন
                </button>
                <button
                  onClick={() => { handleReject(selectedRequest); setShowDetailModal(false); }}
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
// 🎨 প্রিমিয়াম স্টাইলসমূহ
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
    minWidth: '800px',
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
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '4px',
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
  },
  modalLabel: {
    fontWeight: '600',
    color: '#64748b',
  },
  modalValue: {
    fontWeight: '500',
    color: '#0f172a',
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
