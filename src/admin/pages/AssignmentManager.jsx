import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function AssignmentManager() {
  const { adminUser } = useAdmin();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    subject: '',
    title: '',
    description: '',
    deadline: '',
    teacher_name: '',
    marks: '',
    status: 'published',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const classNames = ['প্লে', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];

  // =============================================
  // ✅ ডেটা লোড + রিয়েল টাইম
  // =============================================
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('assignments-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'assignments',
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
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
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
        class_name: formData.class_name,
        subject: formData.subject,
        title: formData.title,
        description: formData.description || null,
        deadline: formData.deadline,
        teacher_name: formData.teacher_name || adminUser?.name || 'শিক্ষক',
        marks: formData.marks ? parseFloat(formData.marks) : null,
        status: formData.status || 'published',
        created_by: adminUser?.id,
      };

      let error;
      if (editing) {
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editing);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('assignments')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage(editing ? '✅ অ্যাসাইনমেন্ট আপডেট করা হয়েছে!' : '✅ অ্যাসাইনমেন্ট যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setShowForm(false);
      setEditing(null);
      setFormData({
        class_name: '',
        subject: '',
        title: '',
        description: '',
        deadline: '',
        teacher_name: '',
        marks: '',
        status: 'published',
      });

    } catch (error) {
      console.error('❌ সংরক্ষণ করতে সমস্যা:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (assignment) => {
    setEditing(assignment.id);
    setFormData({
      class_name: assignment.class_name || '',
      subject: assignment.subject || '',
      title: assignment.title || '',
      description: assignment.description || '',
      deadline: assignment.deadline || '',
      teacher_name: assignment.teacher_name || '',
      marks: assignment.marks || '',
      status: assignment.status || 'published',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('✅ অ্যাসাইনমেন্ট ডিলিট করা হয়েছে!');
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
    if (!confirm(`${selectedIds.length} টি অ্যাসাইনমেন্ট ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setSelectedIds([]);
      setSuccessMessage(`✅ ${selectedIds.length} টি অ্যাসাইনমেন্ট ডিলিট করা হয়েছে!`);
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
    let filtered = assignments;

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterClass !== 'all') {
      filtered = filtered.filter(a => a.class_name === filterClass);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // =============================================
  // ✅ স্ট্যাটাস ব্যাজ
  // =============================================
  const getStatusBadge = (status) => {
    const statuses = {
      draft: { label: '⏳ ড্রাফট', bg: '#f1f5f9', color: '#64748b' },
      published: { label: '✅ প্রকাশিত', bg: '#dcfce7', color: '#16a34a' },
      archived: { label: '📦 আর্কাইভ', bg: '#fef3c7', color: '#f59e0b' },
      expired: { label: '⏰ মেয়াদ শেষ', bg: '#fee2e2', color: '#dc2626' },
    };
    return statuses[status] || statuses['draft'];
  };

  // =============================================
  // ✅ ডেডলাইন চেক
  // =============================================
  const isDeadlinePassed = (deadline) => {
    return new Date(deadline) < new Date();
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
        <h2 style={styles.title}>📝 অ্যাসাইনমেন্ট ম্যানেজার</h2>
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
                class_name: '',
                subject: '',
                title: '',
                description: '',
                deadline: '',
                teacher_name: '',
                marks: '',
                status: 'published',
              });
            }}
            style={styles.addBtn}
          >
            ➕ নতুন অ্যাসাইনমেন্ট
          </button>
        </div>
      </div>

      {/* ফর্ম */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <select
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">📚 ক্লাস নির্বাচন</option>
              {classNames.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>

            <input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="📚 বিষয়"
              required
              style={styles.input}
            />

            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="📝 শিরোনাম"
              required
              style={styles.input}
            />

            <input
              name="deadline"
              type="date"
              value={formData.deadline}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <input
              name="teacher_name"
              value={formData.teacher_name}
              onChange={handleChange}
              placeholder="👨‍🏫 শিক্ষকের নাম"
              style={styles.input}
            />

            <input
              name="marks"
              type="number"
              min="0"
              max="100"
              value={formData.marks}
              onChange={handleChange}
              placeholder="📊 নম্বর (ঐচ্ছিক)"
              style={styles.input}
            />

            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="draft">⏳ ড্রাফট</option>
              <option value="published">✅ প্রকাশিত</option>
              <option value="archived">📦 আর্কাইভ</option>
            </select>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="📄 বিবরণ"
              rows="2"
              style={styles.textarea}
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
          placeholder="🔍 শিরোনাম, বিষয় বা ক্লাস দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব ক্লাস</option>
          {classNames.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব স্ট্যাটাস</option>
          <option value="draft">⏳ ড্রাফট</option>
          <option value="published">✅ প্রকাশিত</option>
          <option value="archived">📦 আর্কাইভ</option>
        </select>
        <span style={styles.resultCount}>{filteredData.length} টি</span>
      </div>

      {/* টেবিল */}
      {filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো অ্যাসাইনমেন্ট পাওয়া যায়নি</p>
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
                <th style={styles.th}>শিরোনাম</th>
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>বিষয়</th>
                <th style={styles.th}>শিক্ষক</th>
                <th style={styles.th}>শেষ তারিখ</th>
                <th style={styles.th}>নম্বর</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((assignment) => {
                const status = getStatusBadge(assignment.status);
                const expired = isDeadlinePassed(assignment.deadline) && assignment.status !== 'archived';
                const displayStatus = expired ? 'expired' : assignment.status;
                const statusInfo = getStatusBadge(displayStatus);
                return (
                  <tr key={assignment.id} style={styles.tr}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(assignment.id)}
                        onChange={() => toggleSelect(assignment.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <strong>{assignment.title}</strong>
                      {assignment.description && (
                        <div style={styles.descPreview}>
                          {assignment.description.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{assignment.class_name}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.subjectBadge}>{assignment.subject}</span>
                    </td>
                    <td style={styles.td}>{assignment.teacher_name || '—'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.deadlineBadge,
                        background: expired ? '#fee2e2' : '#f1f5f9',
                        color: expired ? '#dc2626' : '#64748b',
                      }}>
                        {new Date(assignment.deadline).toLocaleDateString('bn-BD')}
                        {expired && ' ⏰'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {assignment.marks ? (
                        <span style={styles.marksBadge}>{assignment.marks}</span>
                      ) : '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                      }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleEdit(assignment)} style={styles.editBtn} title="এডিট">✏️</button>
                      <button onClick={() => handleDelete(assignment.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
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
  textarea: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
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
    minWidth: '130px',
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
    minWidth: '900px',
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
  descPreview: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
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
  subjectBadge: {
    background: '#dcfce7',
    color: '#16a34a',
    padding: '2px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  deadlineBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  marksBadge: {
    background: '#fef3c7',
    color: '#f59e0b',
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
