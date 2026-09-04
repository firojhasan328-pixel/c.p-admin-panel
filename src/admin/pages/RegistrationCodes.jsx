import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function RegistrationCodes() {
  const { adminUser } = useAdmin();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batchSize, setBatchSize] = useState(5);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('registration_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage('❌ কোড লোড করতে সমস্যা');
    }
    setLoading(false);
  };

  // =============================================
  // ✅ কোড জেনারেট (রোল সহ)
  // =============================================
  const generateCodes = async () => {
    setGenerating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const newCodes = [];
      const batchId = `BATCH-${Date.now()}`;

      for (let i = 0; i < batchSize; i++) {
        const code = generateUniqueCode();
        newCodes.push({
          code: code,
          generated_by: adminUser?.email || 'admin',
          batch_id: batchId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          role: selectedRole, // ✅ রোল যোগ করুন
        });
      }

      const { data, error } = await supabase
        .from('registration_codes')
        .insert(newCodes)
        .select();

      if (error) throw error;

      setSuccessMessage(`✅ ${batchSize} টি কোড সফলভাবে জেনারেট করা হয়েছে!`);
      await fetchCodes();

      const codeList = newCodes.map(c => c.code).join('\n');
      if (confirm(`📋 কোডগুলো কপি করতে চান?\n\n${codeList}`)) {
        navigator.clipboard.writeText(codeList);
        alert('✅ কোড কপি করা হয়েছে!');
      }

    } catch (error) {
      console.error('Generate error:', error);
      setErrorMessage('❌ কোড জেনারেট করতে সমস্যা: ' + error.message);
    }
    setGenerating(false);
  };

  // =============================================
  // ✅ ইউনিক কোড জেনারেট
  // =============================================
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // =============================================
  // ✅ কোড ডিলিট
  // =============================================
  const deleteCode = async (id) => {
    if (!confirm('এই কোড ডিলিট করতে চান?')) return;
    try {
      await supabase.from('registration_codes').delete().eq('id', id);
      await fetchCodes();
      setSuccessMessage('✅ কোড ডিলিট করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('❌ ডিলিট করতে সমস্যা');
    }
  };

  // =============================================
  // ✅ কোড কপি
  // =============================================
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccessMessage(`✅ "${code}" কপি করা হয়েছে!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // =============================================
  // ✅ ফিল্টার
  // =============================================
  const getFilteredCodes = () => {
    let filtered = codes;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.used_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const now = new Date();
    if (filter === 'used') {
      filtered = filtered.filter(c => c.is_used === true);
    } else if (filter === 'unused') {
      filtered = filtered.filter(c => c.is_used === false);
    } else if (filter === 'expired') {
      filtered = filtered.filter(c =>
        c.is_used === false && new Date(c.expires_at) < now
      );
    } else if (filter === 'student') {
      filtered = filtered.filter(c => c.role === 'student' || !c.role);
    } else if (filter === 'teacher') {
      filtered = filtered.filter(c => c.role === 'teacher');
    }

    return filtered;
  };

  const filteredCodes = getFilteredCodes();

  // =============================================
  // ✅ স্ট্যাটিস্টিক্স
  // =============================================
  const total = codes.length;
  const used = codes.filter(c => c.is_used).length;
  const unused = codes.filter(c => !c.is_used).length;
  const expired = codes.filter(c => !c.is_used && new Date(c.expires_at) < new Date()).length;
  const teacherCodes = codes.filter(c => c.role === 'teacher').length;

  // =============================================
  // ✅ রোল ব্যাজ
  // =============================================
  const getRoleBadge = (role) => {
    if (role === 'teacher') {
      return { label: '👨‍🏫 শিক্ষক', background: '#fef3c7', color: '#f59e0b' };
    }
    return { label: '🎓 ছাত্র', background: '#dbeafe', color: '#2563eb' };
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
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

      <h2 style={styles.title}>🔑 রেজিস্ট্রেশন কোড</h2>
      <p style={styles.subtitle}>ছাত্র ও শিক্ষকদের রেজিস্ট্রেশনের জন্য ইউনিক কোড তৈরি ও ব্যবস্থাপনা করুন</p>

      {/* স্ট্যাটিস্টিক্স */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div style={styles.statIcon}>📋</div>
          <div>
            <div style={styles.statNumber}>{total}</div>
            <div style={styles.statLabel}>মোট কোড</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <div style={styles.statIcon}>✅</div>
          <div>
            <div style={styles.statNumber}>{used}</div>
            <div style={styles.statLabel}>ব্যবহৃত</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div style={styles.statIcon}>⏳</div>
          <div>
            <div style={styles.statNumber}>{unused}</div>
            <div style={styles.statLabel}>অব্যবহৃত</div>
          </div>
        </div>
        <div style={{ ...styles.statCard, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          <div style={styles.statIcon}>👨‍🏫</div>
          <div>
            <div style={styles.statNumber}>{teacherCodes}</div>
            <div style={styles.statLabel}>শিক্ষক কোড</div>
          </div>
        </div>
      </div>

      {/* জেনারেট + ফিল্টার */}
      <div style={styles.actionBar}>
        <div style={styles.generateSection}>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={styles.roleSelect}
          >
            <option value="student">🎓 ছাত্র</option>
            <option value="teacher">👨‍🏫 শিক্ষক</option>
          </select>

          <input
            type="number"
            min="1"
            max="50"
            value={batchSize}
            onChange={(e) => setBatchSize(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            style={styles.batchInput}
          />

          <button onClick={generateCodes} disabled={generating} style={styles.generateBtn}>
            {generating ? '⏳ জেনারেট হচ্ছে...' : '⚡ কোড জেনারেট'}
          </button>
        </div>

        <div style={styles.filterSection}>
          <input
            type="text"
            placeholder="🔍 কোড বা ইমেইল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.filterSelect}>
            <option value="all">📌 সব</option>
            <option value="unused">⏳ অব্যবহৃত</option>
            <option value="used">✅ ব্যবহৃত</option>
            <option value="expired">⏰ মেয়াদোত্তীর্ণ</option>
            <option value="student">🎓 ছাত্র</option>
            <option value="teacher">👨‍🏫 শিক্ষক</option>
          </select>
          <button onClick={fetchCodes} style={styles.refreshBtn}>🔄</button>
        </div>
      </div>

      {/* কোড লিস্ট */}
      {loading ? (
        <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
      ) : filteredCodes.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো কোড পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>কোড</th>
                <th style={styles.th}>রোল</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>ব্যবহারকারী</th>
                <th style={styles.th}>মেয়াদ</th>
                <th style={styles.th}>তৈরি</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.map((code, index) => {
                const isExpired = !code.is_used && new Date(code.expires_at) < new Date();
                const roleBadge = getRoleBadge(code.role);
                return (
                  <tr key={code.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <span style={styles.codeText}>{code.code}</span>
                      <button onClick={() => copyCode(code.code)} style={styles.copyBtn} title="কপি">📋</button>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.roleBadge,
                        background: roleBadge.background,
                        color: roleBadge.color,
                      }}>
                        {roleBadge.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: code.is_used ? '#dcfce7' : isExpired ? '#fee2e2' : '#fef3c7',
                        color: code.is_used ? '#16a34a' : isExpired ? '#dc2626' : '#f59e0b',
                      }}>
                        {code.is_used ? '✅ ব্যবহৃত' : isExpired ? '⏰ মেয়াদ শেষ' : '⏳ অব্যবহৃত'}
                      </span>
                    </td>
                    <td style={styles.td}>{code.used_by || '—'}</td>
                    <td style={styles.td}>
                      {new Date(code.expires_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      {new Date(code.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      {!code.is_used && !isExpired && (
                        <button onClick={() => deleteCode(code.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
                      )}
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
  actionBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generateSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  roleSelect: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    minWidth: '120px',
  },
  batchInput: {
    width: '60px',
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    textAlign: 'center',
    outline: 'none',
  },
  generateBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
    transition: 'all 0.2s ease',
  },
  filterSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInput: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '160px',
  },
  filterSelect: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    minWidth: '150px',
  },
  refreshBtn: {
    padding: '8px 14px',
    borderRadius: '10px',
    border: 'none',
    background: '#f1f5f9',
    fontSize: '18px',
    cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '50px 0', color: '#94a3b8' },
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
  codeText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '16px',
    color: '#0f172a',
    letterSpacing: '1px',
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '6px',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  roleBadge: {
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
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
  deleteBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
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
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
