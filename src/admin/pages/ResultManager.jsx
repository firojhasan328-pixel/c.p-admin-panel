import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function ResultManager() {
  const { adminUser } = useAdmin();
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    exam_name: '',
    subject: '',
    marks: '',
    total_marks: 100,
    grade: '',
    status: 'published',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExam, setFilterExam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // =============================================
  // ✅ ডেটা লোড + রিয়েল টাইম সাবস্ক্রিপশন
  // =============================================
  useEffect(() => {
    fetchData();

    const resultsChannel = supabase
      .channel('results-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'results',
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(resultsChannel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, class_name, roll_number')
        .eq('is_approved', true)
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      const resultsWithNames = (resultsData || []).map(result => {
        const student = studentsData?.find(s => s.id === result.student_id);
        return {
          ...result,
          student_name: student?.name || 'অজানা',
          class_name: student?.class_name || '—',
          roll_number: student?.roll_number || '—',
        };
      });

      setResults(resultsWithNames);
    } catch (error) {
      console.error('❌ ডেটা লোড করতে সমস্যা:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ গ্রেড ক্যালকুলেশন
  // =============================================
  const calculateGrade = (marks) => {
    const num = parseFloat(marks);
    if (isNaN(num)) return '';
    if (num >= 90) return 'A+';
    if (num >= 80) return 'A';
    if (num >= 70) return 'B';
    if (num >= 60) return 'C';
    if (num >= 40) return 'D';
    return 'F';
  };

  // =============================================
  // ✅ ফর্ম হ্যান্ডেল
  // =============================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'marks') {
        newData.grade = calculateGrade(value);
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const dataToSave = {
        student_id: formData.student_id,
        exam_name: formData.exam_name,
        subject: formData.subject,
        marks: parseFloat(formData.marks) || 0,
        total_marks: parseFloat(formData.total_marks) || 100,
        grade: formData.grade || calculateGrade(formData.marks),
        status: formData.status || 'published',
      };

      let error;
      if (editing) {
        const { error: updateError } = await supabase
          .from('results')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editing);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('results')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage(editing ? '✅ রেজাল্ট আপডেট করা হয়েছে!' : '✅ রেজাল্ট যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setShowForm(false);
      setEditing(null);
      setFormData({
        student_id: '',
        exam_name: '',
        subject: '',
        marks: '',
        total_marks: 100,
        grade: '',
        status: 'published',
      });

    } catch (error) {
      console.error('❌ সংরক্ষণ করতে সমস্যা:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (result) => {
    setEditing(result.id);
    setFormData({
      student_id: result.student_id || '',
      exam_name: result.exam_name || '',
      subject: result.subject || '',
      marks: result.marks || '',
      total_marks: result.total_marks || 100,
      grade: result.grade || '',
      status: result.status || 'published',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('results')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('✅ রেজাল্ট ডিলিট করা হয়েছে!');
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
    if (!confirm(`${selectedIds.length} টি রেজাল্ট ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('results')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setSelectedIds([]);
      setSuccessMessage(`✅ ${selectedIds.length} টি রেজাল্ট ডিলিট করা হয়েছে!`);
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
    let filtered = results;

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.exam_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterExam !== 'all') {
      filtered = filtered.filter(r => r.exam_name === filterExam);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    return filtered;
  };

  const filteredData = getFilteredData();
  const examNames = [...new Set(results.map(r => r.exam_name).filter(Boolean))];

  // =============================================
  // ✅ স্ট্যাটাস ব্যাজ
  // =============================================
  const getStatusBadge = (status) => {
    const statuses = {
      draft: { label: '⏳ ড্রাফট', bg: '#f1f5f9', color: '#64748b' },
      published: { label: '✅ প্রকাশিত', bg: '#dcfce7', color: '#16a34a' },
      archived: { label: '📦 আর্কাইভ', bg: '#fef3c7', color: '#f59e0b' },
    };
    return statuses[status] || statuses['published'];
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
      {/* ✅ পপআপ মেসেজ */}
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
        <h2 style={styles.title}>📊 রেজাল্ট ম্যানেজার</h2>
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
                exam_name: '',
                subject: '',
                marks: '',
                total_marks: 100,
                grade: '',
                status: 'published',
              });
            }}
            style={styles.addBtn}
          >
            ➕ নতুন রেজাল্ট
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
              name="exam_name"
              value={formData.exam_name}
              onChange={handleChange}
              placeholder="📝 পরীক্ষার নাম"
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
              name="marks"
              type="number"
              min="0"
              max="100"
              value={formData.marks}
              onChange={handleChange}
              placeholder="📊 প্রাপ্ত নম্বর"
              required
              style={styles.input}
            />

            <input
              name="total_marks"
              type="number"
              min="0"
              value={formData.total_marks}
              onChange={handleChange}
              placeholder="📋 মোট নম্বর"
              style={styles.input}
            />

            <input
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              placeholder="🏅 গ্রেড (অটো)"
              style={{ ...styles.input, background: '#f8fafc' }}
              readOnly
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
          placeholder="🔍 ছাত্র, পরীক্ষা বা বিষয় দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterExam}
          onChange={(e) => setFilterExam(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">📌 সব পরীক্ষা</option>
          {examNames.map((name, i) => (
            <option key={i} value={name}>{name}</option>
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
          <p>কোনো রেজাল্ট পাওয়া যায়নি</p>
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
                <th style={styles.th}>পরীক্ষা</th>
                <th style={styles.th}>বিষয়</th>
                <th style={styles.th}>প্রাপ্ত</th>
                <th style={styles.th}>মোট</th>
                <th style={styles.th}>গ্রেড</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>তারিখ</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((result) => {
                const status = getStatusBadge(result.status);
                return (
                  <tr key={result.id} style={styles.tr}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(result.id)}
                        onChange={() => toggleSelect(result.id)}
                        style={styles.checkbox}
                      />
                    </td>
                    <td style={styles.td}>
                      <div style={styles.studentInfo}>
                        <strong>{result.student_name}</strong>
                        <span style={styles.classTag}>{result.class_name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{result.exam_name}</td>
                    <td style={styles.td}>
                      <span style={styles.subjectBadge}>{result.subject}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.marksNumber}>{result.marks}</span>
                    </td>
                    <td style={styles.td}>{result.total_marks}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.gradeBadge,
                        background: result.grade === 'A+' || result.grade === 'A' ? '#dcfce7' :
                                   result.grade === 'B' ? '#fef3c7' :
                                   result.grade === 'C' ? '#fef9c3' : '#fee2e2',
                        color: result.grade === 'A+' || result.grade === 'A' ? '#16a34a' :
                               result.grade === 'B' ? '#f59e0b' :
                               result.grade === 'C' ? '#f97316' : '#dc2626',
                      }}>
                        {result.grade || '—'}
                      </span>
                    </td>
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
                      {new Date(result.created_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => handleEdit(result)} style={styles.editBtn} title="এডিট">✏️</button>
                      <button onClick={() => handleDelete(result.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
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
  subjectBadge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  marksNumber: {
    fontWeight: '700',
    color: '#0f172a',
  },
  gradeBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
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
