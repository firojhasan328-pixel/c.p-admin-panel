import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function AIChatManager() {
  const { adminUser } = useAdmin();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [settings, setSettings] = useState({
    greeting_message: '',
    whatsapp_number: '',
    whatsapp_default_message: '',
    max_failed_attempts: '3',
    ai_model: 'llama-3.3-70b-versatile',
    enable_whatsapp_transfer: 'true',
  });
  const [showSettings, setShowSettings] = useState(false);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: 'general',
    is_active: true,
    sort_order: 0,
  });

  const categories = [
    { id: 'general', label: '🏫 সাধারণ' },
    { id: 'admission', label: '🎓 ভর্তি' },
    { id: 'fee', label: '💰 ফি' },
    { id: 'contact', label: '📞 যোগাযোগ' },
    { id: 'routine', label: '📅 রুটিন' },
    { id: 'academic', label: '📚 পড়াশোনা' },
    { id: 'religious', label: '🕌 দ্বীনি' },
    { id: 'other', label: '📌 অন্যান্য' },
  ];

  // ============================================
  // ডেটা লোড
  // ============================================
  useEffect(() => {
    fetchData();
    fetchSettings();

    const channel = supabase
      .channel('ai-faqs-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_chat_faqs' },
        () => fetchData()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_faqs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setErrorMessage('❌ ডেটা লোড করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('ai_chat_settings')
        .select('setting_key, setting_value');

      if (data) {
        const map = { ...settings };
        data.forEach((s) => {
          map[s.setting_key] = s.set_value || s.setting_value;
        });
        setSettings(map);
      }
    } catch (error) {
      console.error('Settings error:', error);
    }
  };

  const saveSettings = async () => {
    setActionLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existing } = await supabase
          .from('ai_chat_settings')
          .select('id')
          .eq('setting_key', key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('ai_chat_settings')
            .update({
              setting_value: value,
              updated_at: new Date().toISOString(),
            })
            .eq('setting_key', key);
        } else {
          await supabase
            .from('ai_chat_settings')
            .insert([
              { setting_key: key, setting_value: value },
            ]);
        }
      }

      setSuccessMessage('✅ সেটিংস সেভ হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Settings save error:', error);
      setErrorMessage('❌ সেটিংস সেভ করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  // ============================================
  // FAQ হ্যান্ডেল
  // ============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
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
      // keywords স্ট্রিং থেকে array তে
      const keywordsArray = formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k);

      const dataToSave = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        keywords: keywordsArray,
        category: formData.category,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      let error;
      if (editing) {
        const { error: updateError } = await supabase
          .from('ai_chat_faqs')
          .update({
            ...dataToSave,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ai_chat_faqs')
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      setSuccessMessage(
        editing
          ? '✅ প্রশ্ন-উত্তর আপডেট হয়েছে!'
          : '✅ নতুন প্রশ্ন-উত্তর যোগ হয়েছে!'
      );
      setTimeout(() => setSuccessMessage(''), 3000);

      setShowForm(false);
      setEditing(null);
      setFormData({
        question: '',
        answer: '',
        keywords: '',
        category: 'general',
        is_active: true,
        sort_order: 0,
      });

      fetchData();
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('❌ সংরক্ষণ করতে সমস্যা: ' + error.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleEdit = (faq) => {
    setEditing(faq.id);
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      keywords: (faq.keywords || []).join(', '),
      category: faq.category || 'general',
      is_active: faq.is_active !== false,
      sort_order: faq.sort_order || 0,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('এই প্রশ্ন-উত্তর ডিলিট করতে চান?')) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('ai_chat_faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('✅ ডিলিট হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage('❌ ডিলিট করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert('⚠️ অন্তত একটি সিলেক্ট করুন!');
      return;
    }
    if (!confirm(`${selectedIds.length} টি ডিলিট করতে চান?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('ai_chat_faqs')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setSelectedIds([]);
      setSuccessMessage(`✅ ${selectedIds.length} টি ডিলিট হয়েছে!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (error) {
      setErrorMessage('❌ বাল্ক ডিলিট সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setActionLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((f) => f.id));
    }
  };

  const toggleActive = async (faq) => {
    try {
      await supabase
        .from('ai_chat_faqs')
        .update({ is_active: !faq.is_active })
        .eq('id', faq.id);
      fetchData();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const getFilteredData = () => {
    let filtered = faqs;

    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.answer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter((f) => f.category === filterCategory);
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  const getCategoryLabel = (cat) => {
    const c = categories.find((x) => x.id === cat);
    return c ? c.label : cat;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>⏳ লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* পপআপ */}
      {successMessage && (
        <div style={styles.popupSuccess}>
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div style={styles.popupError}>
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      {/* হেডার */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🤖 AI চ্যাট ম্যানেজার</h2>
          <p style={styles.subtitle}>
            চ্যাটবটের জন্য প্রশ্ন-উত্তর যোগ করুন — সাথে সাথে AI শিখে যাবে
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={styles.settingsBtn}
          >
            ⚙️ সেটিংস
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setFormData({
                question: '',
                answer: '',
                keywords: '',
                category: 'general',
                is_active: true,
                sort_order: 0,
              });
            }}
            style={styles.addBtn}
          >
            ➕ নতুন প্রশ্ন-উত্তর
          </button>
        </div>
      </div>

      {/* সেটিংস প্যানেল */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          <h3 style={styles.settingsTitle}>⚙️ AI চ্যাট সেটিংস</h3>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>👋 গ্রিটিং মেসেজ</label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) =>
                  setSettings({ ...settings, greeting_message: e.target.value })
                }
                rows="2"
                style={styles.textarea}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>📱 WhatsApp নাম্বার</label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) =>
                  setSettings({ ...settings, whatsapp_number: e.target.value })
                }
                placeholder="8801918568313"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>💬 WhatsApp ডিফল্ট মেসেজ</label>
              <input
                type="text"
                value={settings.whatsapp_default_message}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    whatsapp_default_message: e.target.value,
                  })
                }
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>🤖 AI মডেল</label>
              <select
                value={settings.ai_model}
                onChange={(e) =>
                  setSettings({ ...settings, ai_model: e.target.value })
                }
                style={styles.input}
              >
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (সেরা)</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B (দ্রুত)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
              </select>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={actionLoading}
            style={styles.saveBtn}
          >
            {actionLoading ? '⏳ সংরক্ষণ...' : '💾 সেটিংস সেভ করুন'}
          </button>
        </div>
      )}

      {/* ফর্ম */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>
            {editing ? '✏️ প্রশ্ন-উত্তর এডিট' : '➕ নতুন প্রশ্ন-উত্তর'}
          </h3>

          <div style={styles.field}>
            <label style={styles.label}>❓ প্রশ্ন *</label>
            <input
              type="text"
              name="question"
              value={formData.question}
              onChange={handleChange}
              placeholder="যেমন: ভর্তির ফি কত?"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>💬 উত্তর *</label>
            <textarea
              name="answer"
              value={formData.answer}
              onChange={handleChange}
              placeholder="বিস্তারিত উত্তর লিখুন..."
              required
              rows="4"
              style={styles.textarea}
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>🔑 কীওয়ার্ড (কমা দিয়ে আলাদা)</label>
              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="ফি, ভর্তি, টাকা, বেতন"
                style={styles.input}
              />
              <small style={styles.hint}>
                💡 এই শব্দগুলো দিয়ে ইউজার লিখলে AI এই প্রশ্ন ধরবে
              </small>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>📂 ক্যাটাগরি</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={styles.input}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>🔢 ক্রম (sort order)</label>
              <input
                type="number"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={styles.checkbox}
                />
                ✅ অ্যাক্টিভ (চ্যাটে দেখাবে)
              </label>
            </div>
          </div>

          <div style={styles.formActions}>
            <button
              type="submit"
              disabled={actionLoading}
              style={styles.saveBtn}
            >
              {actionLoading ? '⏳ সংরক্ষণ...' : editing ? '💾 আপডেট' : '💾 যোগ করুন'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
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
          placeholder="🔍 প্রশ্ন বা উত্তর দিয়ে খুঁজুন..."
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
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} style={styles.bulkBtn}>
            🗑️ {selectedIds.length} টি ডিলিট
          </button>
        )}
        <span style={styles.resultCount}>{filteredData.length} টি</span>
      </div>

      {/* টেবিল */}
      {filteredData.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📭</span>
          <p>কোনো প্রশ্ন-উত্তর নেই</p>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>
            উপরে "নতুন প্রশ্ন-উত্তর" ক্লিক করে যোগ করুন
          </p>
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
                <th style={styles.th}>প্রশ্ন</th>
                <th style={styles.th}>উত্তর (সংক্ষেপ)</th>
                <th style={styles.th}>ক্যাটাগরি</th>
                <th style={styles.th}>কীওয়ার্ড</th>
                <th style={styles.th}>স্ট্যাটাস</th>
                <th style={styles.th}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((faq) => (
                <tr key={faq.id} style={styles.tr}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(faq.id)}
                      onChange={() => toggleSelect(faq.id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}>
                    <strong>{faq.question}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.answerPreview}>
                      {faq.answer?.substring(0, 60)}
                      {faq.answer?.length > 60 ? '...' : ''}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.categoryBadge}>
                      {getCategoryLabel(faq.category)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.keywordsText}>
                      {(faq.keywords || []).slice(0, 3).join(', ')}
                      {(faq.keywords || []).length > 3 ? '...' : ''}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => toggleActive(faq)}
                      style={{
                        ...styles.statusBtn,
                        background: faq.is_active ? '#dcfce7' : '#fee2e2',
                        color: faq.is_active ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {faq.is_active ? '✅ অ্যাক্টিভ' : '⛔ নিষ্ক্রিয়'}
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleEdit(faq)}
                      style={styles.editBtn}
                      title="এডিট"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      style={styles.deleteBtn}
                      title="ডিলিট"
                    >
                      🗑️
                    </button>
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

// ============================================
// স্টাইল
// ============================================
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
  spinner: {
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
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#166534',
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 30px rgba(22, 163, 74, 0.3)',
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
    padding: '12px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
    border: '1px solid #fca5a5',
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
    alignItems: 'flex-start',
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
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  settingsBtn: {
    background: '#f1f5f9',
    color: '#334155',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
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
  settingsPanel: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  settingsTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  form: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '14px',
    marginBottom: '14px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
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
    fontFamily: 'inherit',
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
    padding: '10px 0',
    cursor: 'pointer',
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
    marginTop: '10px',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelBtn: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
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
  bulkBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
  },
  resultCount: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 'auto',
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
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  answerPreview: {
    fontSize: '13px',
    color: '#64748b',
  },
  categoryBadge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block',
  },
  keywordsText: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  statusBtn: {
    border: 'none',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  editBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '4px',
  },
  deleteBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
