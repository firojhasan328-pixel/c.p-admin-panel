import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    class_name: '',
    roll_number: '',
    father_name: '',
    mother_name: '',
    phone: '',
    email: '',
    photo_url: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // ✅ ক্লাস লিস্ট
  const classList = ['প্লে', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('class_name')
        .order('roll_number');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ ফিল্টার করা ডেটা
  // =============================================
  const filteredData = students.filter(student => {
    const matchesClass = selectedClass === 'all' || student.class_name === selectedClass;
    const matchesSearch = 
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number?.toString().includes(searchTerm) ||
      student.phone?.includes(searchTerm);
    return matchesClass && matchesSearch;
  });

  // =============================================
  // ✅ ক্লাস অনুযায়ী কাউন্ট
  // =============================================
  const getClassCount = (className) => {
    if (className === 'all') return students.length;
    return students.filter(s => s.class_name === className).length;
  };

  // =============================================
  // ✅ সিলেক্ট/ডি-সিলেক্ট
  // =============================================
  const toggleSelect = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredData.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredData.map(s => s.id));
    }
  };

  // =============================================
  // ✅ বাল্ক ডিলিট
  // =============================================
  const bulkDelete = async () => {
    if (selectedStudents.length === 0) {
      alert('⚠️ দয়া করে অন্তত একটি ছাত্র সিলেক্ট করুন!');
      return;
    }
    if (!confirm(`${selectedStudents.length} জন ছাত্র ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', selectedStudents);

      if (error) throw error;
      setSelectedStudents([]);
      await fetchStudents();
      alert(`✅ ${selectedStudents.length} জন ছাত্র ডিলিট করা হয়েছে!`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('❌ ডিলিট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ এক্সপোর্ট CSV
  // =============================================
  const exportCSV = () => {
    if (filteredData.length === 0) {
      alert('⚠️ কোনো ছাত্র নেই!');
      return;
    }

    const headers = ['নাম', 'ক্লাস', 'রোল', 'বাবার নাম', 'মায়ের নাম', 'ফোন', 'ইমেইল'];
    const rows = filteredData.map(s => [
      s.name, s.class_name, s.roll_number || '', s.father_name || '',
      s.mother_name || '', s.phone || '', s.email || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ছাত্র_তালিকা_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // =============================================
  // ✅ ফর্ম হ্যান্ডেল
  // =============================================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (editing) {
        await supabase.from('students').update(formData).eq('id', editing);
      } else {
        await supabase.from('students').insert([formData]);
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', class_name: '', roll_number: '', father_name: '', mother_name: '', phone: '', email: '', photo_url: '' });
      await fetchStudents();
      alert(editing ? '✅ ছাত্র আপডেট করা হয়েছে!' : '✅ ছাত্র যোগ করা হয়েছে!');
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ সংরক্ষণ করতে সমস্যা');
    }
    setActionLoading(false);
  };

  const handleEdit = (student) => {
    setEditing(student.id);
    setFormData(student);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('এই ছাত্র ডিলিট করতে চান?')) return;
    setActionLoading(true);
    try {
      await supabase.from('students').delete().eq('id', id);
      await fetchStudents();
      alert('✅ ছাত্র ডিলিট করা হয়েছে!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ ডিলিট করতে সমস্যা');
    }
    setActionLoading(false);
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
      {/* ✅ হেডার */}
      <div style={styles.header}>
        <h2 style={styles.title}>🎓 ছাত্র ব্যবস্থাপনা</h2>
        <div style={styles.headerActions}>
          <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', class_name: '', roll_number: '', father_name: '', mother_name: '', phone: '', email: '', photo_url: '' }); }} style={styles.addBtn}>
            ➕ নতুন ছাত্র
          </button>
          <button onClick={exportCSV} style={styles.exportBtn}>📥 CSV এক্সপোর্ট</button>
          {selectedStudents.length > 0 && (
            <button onClick={bulkDelete} disabled={actionLoading} style={styles.bulkDeleteBtn}>
              🗑️ {selectedStudents.length} টি ডিলিট
            </button>
          )}
        </div>
      </div>

      {/* ✅ ফর্ম */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="নাম" style={styles.input} required />
            <select name="class_name" value={formData.class_name} onChange={handleChange} style={styles.input} required>
              <option value="">ক্লাস নির্বাচন</option>
              {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
            <input name="roll_number" value={formData.roll_number} onChange={handleChange} placeholder="রোল নম্বর" style={styles.input} />
            <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="বাবার নাম" style={styles.input} />
            <input name="mother_name" value={formData.mother_name} onChange={handleChange} placeholder="মায়ের নাম" style={styles.input} />
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="ফোন" style={styles.input} />
            <input name="email" value={formData.email} onChange={handleChange} placeholder="ইমেইল" style={styles.input} />
            <input name="photo_url" value={formData.photo_url} onChange={handleChange} placeholder="ছবি URL" style={styles.input} />
          </div>
          <div style={styles.formActions}>
            <button type="submit" disabled={actionLoading} style={styles.saveBtn}>
              {actionLoading ? '⏳ সংরক্ষণ...' : '💾 সংরক্ষণ করুন'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>বাতিল</button>
          </div>
        </form>
      )}

      {/* ✅ মোট ছাত্র + সার্চ */}
      <div style={styles.statsBar}>
        <span style={styles.totalCount}>👥 মোট ছাত্র: {students.length} জন</span>
        <input
          type="text"
          placeholder="🔍 নাম, রোল বা ফোন দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* ✅ ক্লাস ট্যাব */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setSelectedClass('all')}
          style={{ ...styles.tab, ...(selectedClass === 'all' ? styles.tabActive : {}) }}
        >
          সব <span style={styles.tabBadge}>{getClassCount('all')}</span>
        </button>
        {classList.map(cls => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            style={{ ...styles.tab, ...(selectedClass === cls ? styles.tabActive : {}) }}
          >
            {cls} <span style={styles.tabBadge}>{getClassCount(cls)}</span>
          </button>
        ))}
      </div>

      {/* ✅ টেবিল */}
      {loading ? (
        <div style={styles.loading}>⏳ লোড হচ্ছে...</div>
      ) : filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>এই ক্লাসে কোনো ছাত্র নেই</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === filteredData.length && filteredData.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>ছবি</th>
                <th style={styles.th}>নাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>রোল</th>
                <th style={styles.th}>ফোন</th>
                <th style={styles.th}>ইমেইল</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((student) => (
                <tr key={student.id} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleSelect(student.id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.name} style={styles.avatar} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>{student.name?.charAt(0) || '?'}</div>
                    )}
                  </td>
                  <td style={styles.td}><strong>{student.name}</strong></td>
                  <td style={styles.td}><span style={styles.classBadge}>{student.class_name}</span></td>
                  <td style={styles.td}>{student.roll_number || '—'}</td>
                  <td style={styles.td}>{student.phone || '—'}</td>
                  <td style={styles.td}>{student.email || '—'}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(student)} style={styles.editBtn} title="এডিট">✏️</button>
                    <button onClick={() => handleDelete(student.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
  },
  title: {
    fontSize: 'clamp(20px, 4vw, 26px)',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  addBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  exportBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  bulkDeleteBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  form: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '12px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  saveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px 16px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  totalCount: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  searchInput: {
    flex: '1 1 200px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    minWidth: '140px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '8px',
    background: '#f1f5f9',
    borderRadius: '12px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tabActive: {
    background: 'white',
    color: '#0f172a',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tabBadge: {
    background: '#e2e8f0',
    padding: '0 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
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
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(13px, 1.4vw, 15px)',
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
    letterSpacing: '0.3px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
    fontSize: '14px',
    color: '#1e293b',
  },
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
  classBadge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  editBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '4px',
  },
  deleteBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

// ✅ মোবাইল রেসপনসিভ
const mobileStyles = `
  @media (max-width: 640px) {
    .header { flex-direction: column; align-items: stretch; }
    .header-actions { flex-direction: column; }
    .header-actions button { width: 100%; text-align: center; }
    .stats-bar { flex-direction: column; align-items: stretch; }
    .search-input { width: 100%; }
    .tab-container { justify-content: center; }
    .tab { font-size: 12px; padding: 6px 12px; }
    .table th, .table td { padding: 8px 10px; font-size: 12px; }
    .avatar, .avatar-placeholder { width: 32px; height: 32px; font-size: 12px; }
    .form-grid { grid-template-columns: 1fr; }
  }
  @media (min-width: 641px) and (max-width: 1024px) {
    .form-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);
