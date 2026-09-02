import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AdmissionDetailModal from '../components/AdmissionDetailModal';

export default function AdmissionDashboard() {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // =============================================
  // ✅ ডেটা লোড
  // =============================================
  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmissions(data || []);

      const total = data?.length || 0;
      const approved = data?.filter(a => a.status === 'approved').length || 0;
      const rejected = data?.filter(a => a.status === 'rejected').length || 0;
      const pending = data?.filter(a => a.status === 'pending').length || 0;
      setStats({ total, approved, rejected, pending });
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ স্ট্যাটাস আপডেট
  // =============================================
  const updateStatus = async (id, newStatus) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('admissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchAdmissions();
      alert(`✅ আবেদন ${newStatus === 'approved' ? 'অনুমোদন' : 'বাতিল'} করা হয়েছে!`);
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ স্ট্যাটাস আপডেট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ ফিল্টার
  // =============================================
  const filteredData = admissions.filter(ad => {
    const matchesSearch = 
      ad.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.phone?.includes(searchTerm) ||
      ad.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || ad.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
      <h2 style={styles.title}>📝 অনলাইন আবেদন ফরম</h2>
      <p style={styles.subtitle}>ছাত্র/ছাত্রীদের ভর্তি আবেদন এখানে দেখুন ও ব্যবস্থাপনা করুন</p>

      {/* ✅ স্ট্যাটিস্টিক্স কার্ড */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <div style={styles.statNumber}>{stats.total}</div>
            <div style={styles.statLabel}>মোট আবেদন</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statNumber}>{stats.approved}</div>
            <div style={styles.statLabel}>অনুমোদিত</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={styles.statIcon}>⏳</div>
          <div>
            <div style={styles.statNumber}>{stats.pending}</div>
            <div style={styles.statLabel}>pending</div>
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

      {/* ✅ ফিল্টার ও সার্চ */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 নাম, ফোন বা ইমেইল..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">সব</option>
          <option value="pending">⏳ pending</option>
          <option value="approved">✅ অনুমোদিত</option>
          <option value="rejected">❌ বাতিল</option>
        </select>
        <button onClick={fetchAdmissions} style={styles.refreshBtn}>🔄 রিফ্রেশ</button>
      </div>

      {/* ✅ টেবিল */}
      {loading ? (
        <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
      ) : filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো আবেদন পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>নাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>ফোন</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((ad, index) => {
                const badge = getStatusBadge(ad.status);
                return (
                  <tr key={ad.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <span
                        style={styles.clickableName}
                        onClick={() => {
                          setSelectedAdmission(ad);
                          setModalOpen(true);
                        }}
                      >
                        {ad.student_name}
                      </span>
                    </td>
                    <td style={styles.td}>{ad.class_to_admit || '—'}</td>
                    <td style={styles.td}>{ad.phone || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: badge.background, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(ad.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      {/* ✅ ডিটেইলস বাটন */}
                      <button
                        onClick={() => {
                          setSelectedAdmission(ad);
                          setModalOpen(true);
                        }}
                        style={styles.detailBtn}
                      >
                        📋 বিস্তারিত
                      </button>
                      {ad.status === 'pending' && (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => updateStatus(ad.id, 'approved')}
                            disabled={actionLoading}
                            style={styles.approveBtn}
                            title="অনুমোদন"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => updateStatus(ad.id, 'rejected')}
                            disabled={actionLoading}
                            style={styles.rejectBtn}
                            title="বাতিল"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                      {ad.status !== 'pending' && (
                        <span style={styles.statusText}>
                          {ad.status === 'approved' ? '✅' : '❌'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ মোডাল */}
      {modalOpen && selectedAdmission && (
        <AdmissionDetailModal
          admission={selectedAdmission}
          onClose={() => setModalOpen(false)}
          onUpdate={fetchAdmissions}
        />
      )}
    </div>
  );
}

// =============================================
// 🎨 প্রিমিয়াম রেসপনসিভ স্টাইল
// =============================================
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px',
    fontFamily: "'Hind Siliguri', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: 'clamp(13px, 2vw, 16px)',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 18px',
    borderRadius: '12px',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    minHeight: '70px',
  },
  statIcon: { fontSize: 'clamp(24px, 3vw, 32px)' },
  statNumber: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '800', lineHeight: 1.2 },
  statLabel: { fontSize: 'clamp(11px, 1.5vw, 14px)', opacity: 0.9 },
  filterBar: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    padding: '14px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  searchInput: {
    flex: '1 1 180px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '120px',
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
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    background: '#f1f5f9',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  loading: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  tableWrapper: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(12px, 1.4vw, 14px)',
    minWidth: '600px',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '700',
    color: '#334155',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: {
    padding: '10px 12px',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
  },
  clickableName: {
    color: '#2563eb',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  badge: {
    padding: '3px 10px',
    borderRadius: '16px',
    fontSize: 'clamp(10px, 1.2vw, 12px)',
    fontWeight: '600',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  detailBtn: {
    background: '#e0e7ff',
    color: '#4338ca',
    border: 'none',
    padding: '5px 12px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 1.2vw, 13px)',
    marginRight: '6px',
    whiteSpace: 'nowrap',
  },
  actionButtons: {
    display: 'inline-flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  approveBtn: {
    background: '#dcfce7',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(14px, 1.5vw, 16px)',
    transition: 'all 0.2s',
  },
  rejectBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(14px, 1.5vw, 16px)',
    transition: 'all 0.2s',
  },
  statusText: { fontSize: 'clamp(16px, 1.8vw, 20px)' },
};

// ✅ মোবাইলের জন্য অতিরিক্ত স্টাইল
const mobileStyles = `
  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-card { padding: 12px 14px; gap: 8px; min-height: 60px; }
    .filter-bar { flex-direction: column; gap: 8px; }
    .search-input, .filter-select, .refresh-btn { width: 100%; }
    .table th, .table td { padding: 8px 10px; font-size: 12px; }
    .action-buttons { flex-direction: row; gap: 4px; }
    .detail-btn { font-size: 11px; padding: 4px 10px; }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);
