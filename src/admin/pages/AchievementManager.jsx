import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function AchievementManager() {
  const { adminUser } = useAdmin();
  const [achievements, setAchievements] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    title: '',
    description: '',
    category: 'academic',
    rank: 'participation',
    date: new Date().toISOString().split('T')[0],
    certificate_url: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const categories = [
    { id: 'academic', label: '📚 একাডেমিক', icon: '📚' },
    { id: 'sports', label: '🏃 ক্রীড়া', icon: '🏃' },
    { id: 'cultural', label: '🎭 সাংস্কৃতিক', icon: '🎭' },
    { id: 'religious', label: '🕌 ধর্মীয়', icon: '🕌' },
    { id: 'other', label: '🏅 অন্যান্য', icon: '🏅' },
  ];

  const ranks = [
    { id: '1st', label: '🥇 ১ম' },
    { id: '2nd', label: '🥈 ২য়' },
    { id: '3rd', label: '🥉 ৩য়' },
    { id: 'gold', label: '🏅 গোল্ড' },
    { id: 'silver', label: '🏅 সিলভার' },
    { id: 'bronze', label: '🏅 ব্রোঞ্জ' },
    { id: 'participation', label: '🎯 অংশগ্রহণ' },
  ];

  // =============================================
  // ✅ ডেটা লোড + রিয়েল টাইম
  // =============================================
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('achievements-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'achievements',
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
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // ২. achievements লোড
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('created_at', { ascending: false });

      if (achievementsError) throw achievementsError;

      // ৩. ছাত্রের নাম যোগ করা
      const achievementsWithNames = (achievementsData || []).map(achievement => {
        const student = studentsData?.find(s => s.id === achievement.student_id);
        return {
          ...achievement,
          student_name: student?.name || 'অজানা',
          class_name: student?.class_name || '—',
          roll_number: student?.roll_number || '—',
        };
      });

      setAchievements(achievementsWithNames);
    } catch (error) {
      console.error('❌ ডেটা লোড করতে সমস্যা:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ ফর্ম হ্যান্ডেল
  // =============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const dataToSave = {
        student_id: formData.student_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category || 'academic',
        rank: formData.rank || 'participation',
        date: formData.date || new Date().toISOString().split('T')[0],
        certificate_url: formData.certificate_url || null,
        created_by: adminUser?.id,
      };

      let error;
      if (editing) {
        const { error: updateError } = await supabase
          .from('achievements')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editing);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('achievements')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage(editing ? '✅ অর্জন আপডেট করা হয়েছে!' : '✅ অর্জন যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setShowForm(false);
      setEditing(null);
      setFormData({
        student_id: '',
        title: '',
        description: '',
        category: 'academic',
        rank: 'participation',
        date: new Date().toISOString().split('T')[0],
        certificate_url: '',
      });

    } catch (error) {
      console.error('❌ সংরক্ষণ করতে সমস্যা:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (achievement) => {
    setEditing(achievement.id);
    setFormData({
      student_id: achievement.student_id || '',
      title: achievement.title || '',
      description: achievement.description || '',
      category: achievement.category || 'academic',
      rank: achievement.rank || 'participation',
      date: achievement.date || new Date().toISOString().split('T')[0],
      certificate_url: achievement.certificate_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('✅ অর্জন ডিলিট করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('❌ ডিলিট করতে সমস্যা:', error);
      setErrorMessage('❌ ডিলিট করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('⚠️ দয়া করে অন্তত একটি রেকর্ড সিলেক্ট করুন!');
      return;
    }
    if (!confirm(`${selectedIds.length} টি অর্জন ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setSelectedIds([]);
      setSuccessMessage(`✅ ${selectedIds.length} টি অর্জন ডিলিট করা হয়েছে!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('❌ বাল্ক ডিলিট করতে সমস্যা:', error);
      setErrorMessage('❌ বাল্ক ডিলিট করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(r => r.id));
    }
  };

  // =============================================
  // ✅ ফিল্টার
  // =============================================
  const getFilteredData = () => {
    let filtered = achievements;

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // =============================================
  // ✅ ক্যাটাগরি ব্যাজ
  // =============================================
  const getCategoryBadge = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat || categories[0];
  };

  // =============================================
  // ✅ র্যাঙ্ক ব্যাজ
  // =============================================
  const getRankBadge = (rank) => {
    const r = ranks.find(r => r.id === rank);
    return r || ranks[0];
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
        <h2 style={styles.title}>🏆 অর্জন ম্যানেজার</h2>
        <div style={styles.headerActions}>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              style={styles.bulkDeleteBtn}
            >
              🗑️ {selectedIds.length} টি ডিলিট
            </button>
          )}
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setFormData({
                student_id: '',
                title: '',
                description: '',
                category: 'academic',
                rank: 'participation',
                date: new Date().toISOString().split('T')[0],
                certificate_url: '',
              });
            }}
            style={styles.addBtn}
          >
            ➕ নতুন অর্জন
          </button>
        </div>
      </div>

      {/* ফর্ম */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <select
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">👤 ছাত্র নির্বাচন</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.class_name} - {s.roll_number})
                </option>
              ))}
            </select>

            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="🏆 শিরোনাম"
              required
              style={styles.input}
            />

            <input
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="📄 বিবরণ"
              style={styles.input}
            />

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={styles.input}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              name="rank"
              value={formData.rank}
              onChange={handleChange}
              style={styles.input}
            >
              {ranks.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>

            <input
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <input
              name="certificate_url"
              value={formData.certificate_url}
              onChange={handleChange}
              placeholder="📄 সার্টিফিকেট URL (ঐচ্ছিক)"
              style={styles.input}
            />
          </div>

          <div style={styles.formActions}>
            <button type="submit" disabled={actionLoading} style={styles.saveBtn}>
              {actionLoading ? '⏳ সংরক্ষণ...' : editing ? '💾 আপডেট করুন' : '💾 যোগ করুন'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditing(null); }}
              style={styles.cancelBtn}
            >
              ✕ বাতিল
            </button>
          </div>
        </form>
      )}

      {/* ফিল্টার */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 ছাত্র বা শিরোনাম দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব ক্যাটাগরি</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <span style={styles.resultCount}>{filteredData.length} টি</span>
      </div>

      {/* টেবিল */}
      {filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো অর্জন পাওয়া যায়নি</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>ছাত্র</th>
                <th style={styles.th}>শিরোনাম</th>
                <th style={styles.th}>ক্যাটাগরি</th>
                <th style={styles.th}>র্যাঙ্ক</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((achievement) => {
                const category = getCategoryBadge(achievement.category);
                const rank = getRankBadge(achievement.rank);
                return (
                  <tr key={achievement.id} style={styles.tr}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(achievement.id)}
                        onChange={() => toggleSelect(achievement.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.studentInfo}>
                        <strong>{achievement.student_name}</strong>
                        <span style={styles.classTag}>{achievement.class_name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <strong>{achievement.title}</strong>
                      {achievement.description && (
                        <div style={styles.descPreview}>
                          {achievement.description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.categoryBadge,
                        background: '#f1f5f9',
                        color: '#64748b',
                      }}>
                        {category.icon} {category.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.rankBadge,
                        background: achievement.rank === '1st' || achievement.rank === 'gold' ? '#fef3c7' :
                                   achievement.rank === '2nd' || achievement.rank === 'silver' ? '#f1f5f9' :
                                   achievement.rank === '3rd' || achievement.rank === 'bronze' ? '#fef3c7' : '#f8fafc',
                        color: achievement.rank === '1st' || achievement.rank === 'gold' ? '#f59e0b' :
                               achievement.rank === '2nd' || achievement.rank === 'silver' ? '#94a3b8' :
                               achievement.rank === '3rd' || achievement.rank === 'bronze' ? '#d97706' : '#64748b',
                      }}>
                        {rank.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(achievement.date).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleEdit(achievement)} style={styles.editBtn} title="এডিট">✏️</button>
                      <button onClick={() => handleDelete(achievement.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
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
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  addBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
  bulkDeleteBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
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
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
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
    minWidth: '150px',
  },
  resultCount: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
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
  classTag: {
    fontSize: '11px',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
    display: 'inline-block',
    width: 'fit-content',
  },
  descPreview: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  categoryBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  rankBadge: {
    padding: '4px 12px',
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

// অ্যানিমেশন
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
