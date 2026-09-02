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

  const filteredData = admissions.filter(ad => {
    const matchesSearch = 
      ad.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.phone?.includes(searchTerm) ||
      ad.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || ad.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: { background: '#fef3c7', color: '#f59e0b', label: '⏳ pending' },
      approved: { background: '#dcfce7', color: '#16a34a', label: '✅ অনুমোদিত' },
      rejected: { background: '#fee2e2', color: '#dc2626', label: '❌ বাতিল' },
    };
    return styles[status] || styles.pending;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📝 অনলাইন আবেদন ফরম</h2>
      <p style={styles.subtitle}>ছাত্র/ছাত্রীদের ভর্তি আবেদন এখানে দেখুন ও ব্যবস্থাপনা করুন</p>

      {/* ✅ ২x২ স্ট্যাটিস্টিক্স কার্ড */}
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

      {/* ✅ ফিল্টার বার */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব</option>
          <option value="pending">⏳ pending</option>
          <option value="approved">✅ অনুমোদিত</option>
          <option value="rejected">❌ বাতিল</option>
        </select>
        <button onClick={fetchAdmissions} style={styles.refreshBtn}>🔄 রিফ্রেশ</button>
        <span style={styles.resultCount}>{filteredData.length} টি আবেদন</span>
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
                <th style={styles.th}>ছাত্রের নাম</th>
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
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{ad.class_to_admit || '—'}</span>
                    </td>
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    borderRadius: '14px',
    color: 'white',
    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
    minHeight: '80px',
  },
  statIcon: { fontSize: 'clamp(28px, 3.5vw, 36px)' },
  statNumber: { fontSize: 'clamp(24px, 3.5vw, 32px)', fontWeight: '800', lineHeight: 1.2 },
  statLabel: { fontSize: 'clamp(12px, 1.5vw, 15px)', opacity: 0.9 },
  filterBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '16px 20px',
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  searchInput: {
    flex: '1 1 200px',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '140px',
    transition: 'border-color 0.2s',
  },
  filterSelect: {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    minWidth: '130px',
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
    transition: 'background 0.2s',
  },
  resultCount: {
    marginLeft: 'auto',
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  loading: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '50px 0', color: '#94a3b8' },
  emptyIcon: { fontSize: '56px', display: 'block', marginBottom: '12px' },
  tableWrapper: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    WebkitOverflowScrolling: 'touch',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(13px, 1.4vw, 15px)',
    minWidth: '650px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    background: '#f8fafc',
    fontWeight: '700',
    color: '#334155',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
    cursor: 'default',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    fontSize: '14px',
    color: '#1e293b',
  },
  clickableName: {
    color: '#2563eb',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'text-decoration 0.2s',
  },
  classBadge: {
    background: '#e2e8f0',
    color: '#334155',
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  badge: {
    padding: '4px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
  detailBtn: {
    background: '#e0e7ff',
    color: '#4338ca',
    border: 'none',
    padding: '5px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '6px',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
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
    fontSize: '15px',
    transition: 'transform 0.15s',
  },
  rejectBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'transform 0.15s',
  },
  statusText: { fontSize: '18px' },
};

// মোবাইল রেসপনসিভ
const mobileStyles = `
  @media (max-width: 640px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .stat-card { padding: 14px 16px; min-height: 70px; gap: 10px; }
    .filter-bar { flex-direction: column; gap: 10px; align-items: stretch; }
    .search-input, .filter-select, .refresh-btn { width: 100%; }
    .result-count { margin-left: 0; text-align: center; }
    .table th, .table td { padding: 10px 12px; font-size: 12px; }
    .detail-btn { font-size: 11px; padding: 4px 10px; }
    .approve-btn, .reject-btn { font-size: 13px; padding: 4px 8px; }
  }
  @media (min-width: 641px) and (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);
