import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function RoutineManager() {
  const { adminUser } = useAdmin();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    class_name: '',
    day: 'শনিবার',
    start_time: '',
    end_time: '',
    subject: '',
    teacher_name: '',
    teacher_phone: '',
    room_number: '',
    color_code: '#3b82f6',
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const days = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার'];
  const classNames = ['প্লে', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];

  // =============================================
  // ✅ ডেটা লোড + রিয়েল টাইম
  // =============================================
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('routine-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_routines',
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
        .from('class_routines')
        .select('*')
        .order('class_name')
        .order('day');

      if (error) throw error;
      setRoutines(data || []);
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const dataToSave = {
        class_name: formData.class_name,
        day: formData.day,
        start_time: formData.start_time,
        end_time: formData.end_time,
        subject: formData.subject,
        teacher_name: formData.teacher_name || null,
        teacher_phone: formData.teacher_phone || null,
        room_number: formData.room_number || null,
        color_code: formData.color_code || '#3b82f6',
        is_active: formData.is_active,
      };

      let error;
      if (editing) {
        const { error: updateError } = await supabase
          .from('class_routines')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editing);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('class_routines')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage(editing ? '✅ রুটিন আপডেট করা হয়েছে!' : '✅ রুটিন যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setShowForm(false);
      setEditing(null);
      setFormData({
        class_name: '',
        day: 'শনিবার',
        start_time: '',
        end_time: '',
        subject: '',
        teacher_name: '',
        teacher_phone: '',
        room_number: '',
        color_code: '#3b82f6',
        is_active: true,
      });

    } catch (error) {
      console.error('❌ সংরক্ষণ করতে সমস্যা:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (routine) => {
    setEditing(routine.id);
    setFormData({
      class_name: routine.class_name || '',
      day: routine.day || 'শনিবার',
      start_time: routine.start_time || '',
      end_time: routine.end_time || '',
      subject: routine.subject || '',
      teacher_name: routine.teacher_name || '',
      teacher_phone: routine.teacher_phone || '',
      room_number: routine.room_number || '',
      color_code: routine.color_code || '#3b82f6',
      is_active: routine.is_active !== undefined ? routine.is_active : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('class_routines')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('✅ রুটিন ডিলিট করা হয়েছে!');
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
    if (!confirm(`${selectedIds.length} টি রুটিন ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('class_routines')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setSelectedIds([]);
      setSuccessMessage(`✅ ${selectedIds.length} টি রুটিন ডিলিট করা হয়েছে!`);
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
    let filtered = routines;

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterClass !== 'all') {
      filtered = filtered.filter(r => r.class_name === filterClass);
    }

    if (filterDay !== 'all') {
      filtered = filtered.filter(r => r.day === filterDay);
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // =============================================
  // ✅ স্ট্যাটাস ব্যাজ
  // =============================================
  const getStatusBadge = (isActive) => {
    return isActive
      ? { label: '✅ সক্রিয়', bg: '#dcfce7', color: '#16a34a' }
      : { label: '⛔ নিষ্ক্রিয়', bg: '#fee2e2', color: '#dc2626' };
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
        <h2 style={styles.title}>📅 রুটিন ম্যানেজার</h2>
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
                day: 'শনিবার',
                start_time: '',
                end_time: '',
                subject: '',
                teacher_name: '',
                teacher_phone: '',
                room_number: '',
                color_code: '#3b82f6',
                is_active: true,
              });
            }}
            style={styles.addBtn}
          >
            ➕ নতুন রুটিন
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

            <select
              name="day"
              value={formData.day}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">📅 দিন নির্বাচন</option>
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>

            <input
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <input
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <input
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="📚 বিষয়"
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
              name="teacher_phone"
              value={formData.teacher_phone}
              onChange={handleChange}
              placeholder="📞 শিক্ষকের ফোন"
              style={styles.input}
            />

            <input
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              placeholder="🏠 রুম নম্বর"
              style={styles.input}
            />

            <input
              name="color_code"
              type="color"
              value={formData.color_code}
              onChange={handleChange}
              style={styles.colorInput}
            />

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                style={styles.checkbox}
              />
              সক্রিয়
            </label>
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
          placeholder="🔍 ক্লাস, বিষয় বা শিক্ষক দিয়ে খুঁজুন..."
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
          value={filterDay}
          onChange={(e) => setFilterDay(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব দিন</option>
          {days.map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <span style={styles.resultCount}>{filteredData.length} টি</span>
      </div>

      {/* টেবিল */}
      {filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো রুটিন পাওয়া যায়নি</p>
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
                <th style={styles.th}>ক্লাস</th>
                <th style={styles.th}>দিন</th>
                <th style={styles.th}>শুরু</th>
                <th style={styles.th}>শেষ</th>
                <th style={styles.th}>বিষয়</th>
                <th style={styles.th}>শিক্ষক</th>
                <th style={styles.th}>রুম</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((routine) => {
                const status = getStatusBadge(routine.is_active);
                return (
                  <tr key={routine.id} style={styles.tr}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(routine.id)}
                        onChange={() => toggleSelect(routine.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <span style={styles.classBadge}>{routine.class_name}</span>
                    </td>
                    <td style={styles.td}>{routine.day}</td>
                    <td style={styles.td}>{routine.start_time}</td>
                    <td style={styles.td}>{routine.end_time}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.subjectBadge,
                        backgroundColor: routine.color_code + '20',
                        color: routine.color_code,
                        borderColor: routine.color_code,
                      }}>
                        {routine.subject}
                      </span>
                    </td>
                    <td style={styles.td}>{routine.teacher_name || '—'}</td>
                    <td style={styles.td}>{routine.room_number || '—'}</td>
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
                      <button onClick={() => handleEdit(routine)} style={styles.editBtn} title="এডিট">✏️</button>
                      <button onClick={() => handleDelete(routine.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
  colorInput: {
    padding: '4px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    width: '100%',
    height: '44px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    background: 'white',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#16a34a',
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
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
    border: '1px solid',
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
