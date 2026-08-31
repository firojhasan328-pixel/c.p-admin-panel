import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function NoticeManager() {
  const { adminUser } = useAdmin();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'both',
    target_class: '',
    is_featured: false,
  });

  // =============================================
  // ✅ হোমপেজের জন্য ফিচার্ড নোটিশ
  // =============================================
  const [featuredNotice, setFeaturedNotice] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  // =============================================
  // ✅ সব নোটিশ + ফিচার্ড নোটিশ লোড
  // =============================================
  useEffect(() => {
    fetchNotices();
    fetchFeaturedNotice();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('portal_notices')
      .select('*')
      .order('created_at', { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  const fetchFeaturedNotice = async () => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_notices')
        .select('*')
        .eq('is_featured', true)
        .maybeSingle();

      if (error) throw error;
      setFeaturedNotice(data || null);
    } catch (error) {
      console.error('Featured notice fetch error:', error);
    }
    setPreviewLoading(false);
  };

  // =============================================
  // ✅ ফর্ম হ্যান্ডেল
  // =============================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // =============================================
  // ✅ নোটিশ সেভ (যোগ/আপডেট)
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');

    const data = {
      ...formData,
      created_by: adminUser?.user_id,
    };

    try {
      let result;
      if (editing) {
        result = await supabase
          .from('portal_notices')
          .update(data)
          .eq('id', editing);
      } else {
        result = await supabase
          .from('portal_notices')
          .insert([data]);
      }

      if (result.error) throw result.error;

      setSuccessMessage('✅ নোটিশ সফলভাবে সংরক্ষণ করা হয়েছে!');
      setShowForm(false);
      setEditing(null);
      setFormData({
        title: '',
        message: '',
        target_role: 'both',
        target_class: '',
        is_featured: false,
      });

      await fetchNotices();
      await fetchFeaturedNotice();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে: ' + error.message);
    }
    setSaving(false);
  };

  // =============================================
  // ✅ নোটিশ ডিলিট
  // =============================================
  const handleDelete = async (id) => {
    if (!confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) return;

    try {
      const { error } = await supabase
        .from('portal_notices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchNotices();
      await fetchFeaturedNotice();
    } catch (error) {
      console.error('Delete error:', error);
      alert('ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  // =============================================
  // ✅ ফিচার্ড টগল (অন/অফ)
  // =============================================
  const handleToggleFeatured = async (noticeId, currentStatus) => {
    setSaving(true);
    try {
      if (currentStatus === false) {
        await supabase
          .from('portal_notices')
          .update({ is_featured: false })
          .eq('is_featured', true);
      }

      const { error } = await supabase
        .from('portal_notices')
        .update({ is_featured: !currentStatus })
        .eq('id', noticeId);

      if (error) throw error;

      setSuccessMessage(
        currentStatus
          ? '✅ নোটিশ হোমপেজ থেকে সরানো হয়েছে!'
          : '✅ নোটিশ হোমপেজে দেখানো হবে!'
      );

      await fetchNotices();
      await fetchFeaturedNotice();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Toggle error:', error);
      alert('সুইচ পরিবর্তন করতে সমস্যা হয়েছে');
    }
    setSaving(false);
  };

  // =============================================
  // ✅ ফিচার্ড নোটিশ ইনলাইন এডিট
  // =============================================
  const [editingFeatured, setEditingFeatured] = useState(false);
  const [featuredMessage, setFeaturedMessage] = useState('');

  const handleEditFeatured = () => {
    setFeaturedMessage(featuredNotice?.message || '');
    setEditingFeatured(true);
  };

  const handleSaveFeatured = async () => {
    if (!featuredNotice) return;
    setSaving(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('portal_notices')
        .update({ message: featuredMessage })
        .eq('id', featuredNotice.id);

      if (error) throw error;

      setSuccessMessage('✅ হোমপেজ নোটিশ আপডেট করা হয়েছে!');
      setEditingFeatured(false);
      await fetchFeaturedNotice();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Update featured error:', error);
      alert('আপডেট করতে সমস্যা হয়েছে');
    }
    setSaving(false);
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
      {/* ✅ পপআপ মেসেজ */}
      {successMessage && (
        <div style={styles.popup}>
          <span style={styles.popupIcon}>✅</span>
          <span style={styles.popupText}>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            style={styles.popupClose}
          >
            ✕
          </button>
        </div>
      )}

      {/* =============================================
          📌 হোমপেজ লাইভ প্রিভিউ
          ============================================= */}
      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>📌 হোমপেজ নোটিশ (লাইভ প্রিভিউ)</h3>

        {previewLoading ? (
          <p style={styles.previewLoading}>⏳ লোড হচ্ছে...</p>
        ) : featuredNotice ? (
          <div style={styles.previewCard}>
            <div style={styles.previewHeader}>
              <span style={styles.previewBadge}>📌 নোটিশ বোর্ড</span>
              <div style={styles.previewActions}>
                {!editingFeatured ? (
                  <button
                    onClick={handleEditFeatured}
                    style={styles.editIconBtn}
                    title="এডিট করুন"
                  >
                    ✏️
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingFeatured(false)}
                    style={styles.cancelEditBtn}
                  >
                    ✕ বাতিল
                  </button>
                )}
              </div>
            </div>

            <div style={styles.previewBody}>
              {editingFeatured ? (
                <div style={styles.editArea}>
                  <textarea
                    value={featuredMessage}
                    onChange={(e) => setFeaturedMessage(e.target.value)}
                    style={styles.editTextarea}
                    rows="3"
                    placeholder="নতুন নোটিশ লিখুন..."
                  />
                  <div style={styles.editActions}>
                    <button
                      onClick={handleSaveFeatured}
                      disabled={saving}
                      style={styles.saveFeaturedBtn}
                    >
                      {saving ? '⏳ সংরক্ষণ...' : '💾 সংরক্ষণ করুন'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.previewContent}>
                  <p style={styles.previewText}>{featuredNotice.message}</p>
                  <div style={styles.previewMeta}>
                    <span style={styles.previewDate}>
                      📅 {new Date(featuredNotice.created_at).toLocaleDateString('bn-BD')}
                    </span>
                    <span style={styles.previewStatus}>✅ সক্রিয়</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.previewEmpty}>
            <span style={styles.previewEmptyIcon}>⚠️</span>
            <p style={styles.previewEmptyText}>
              বর্তমানে কোনো নোটিশ হোমপেজে দেখানো হচ্ছে না।
              <br />
              <small>নিচের তালিকা থেকে একটি নোটিশ নির্বাচন করে "হোমপেজে দেখান" সুইচ অন করুন।</small>
            </p>
          </div>
        )}

        <div style={styles.switchStatus}>
          <span style={styles.switchLabel}>📢 হোমপেজ নোটিশ:</span>
          {featuredNotice ? (
            <span style={styles.switchOn}>✅ সক্রিয়</span>
          ) : (
            <span style={styles.switchOff}>⛔ নিষ্ক্রিয়</span>
          )}
        </div>
      </div>

      {/* =============================================
          📌 সব নোটিশের তালিকা
          ============================================= */}
      <div style={styles.header}>
        <h2 style={styles.title}>📢 নোটিশ ব্যবস্থাপনা</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setFormData({
              title: '',
              message: '',
              target_role: 'both',
              target_class: '',
              is_featured: false,
            });
          }}
          style={styles.addBtn}
        >
          ➕ নতুন নোটিশ
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="শিরোনাম"
            style={styles.input}
            required
          />
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="বার্তা"
            rows="3"
            style={styles.textarea}
            required
          />
          <select
            name="target_role"
            value={formData.target_role}
            onChange={handleChange}
            style={styles.input}
          >
            <option value="both">সকলকে</option>
            <option value="student">শুধু ছাত্র</option>
            <option value="teacher">শুধু শিক্ষক</option>
          </select>
          <input
            name="target_class"
            value={formData.target_class}
            onChange={handleChange}
            placeholder="ক্লাস (ঐচ্ছিক)"
            style={styles.input}
          />

          <div style={styles.switchContainer}>
            <label style={styles.switchLabel2}>
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                style={styles.switchInput}
              />
              <span style={styles.switchSlider}></span>
              <span style={styles.switchText}>
                {formData.is_featured ? '✅ হোমপেজে দেখান' : '⛔ হোমপেজে দেখাবেন না'}
              </span>
            </label>
          </div>

          <div style={styles.formActions}>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={styles.cancelBtn}
            >
              বাতিল
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : (
        <div style={styles.list}>
          {notices.map((n) => (
            <div
              key={n.id}
              style={{
                ...styles.item,
                ...(n.is_featured ? styles.itemFeatured : {}),
              }}
            >
              <div style={styles.itemLeft}>
                <strong>{n.title}</strong>
                <span style={styles.badge}>
                  {n.target_role === 'both' ? 'সকলকে' : n.target_role}
                </span>
                <span style={styles.badge2}>
                  {new Date(n.created_at).toLocaleDateString('bn-BD')}
                </span>
                {n.is_featured && (
                  <span style={styles.featuredBadge}>⭐ হোমপেজে</span>
                )}
              </div>

              <div style={styles.itemRight}>
                <label style={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={n.is_featured}
                    onChange={() => handleToggleFeatured(n.id, n.is_featured)}
                    disabled={saving}
                    style={styles.toggleInput}
                  />
                  <span style={styles.toggleSlider}></span>
                </label>

                <button
                  onClick={() => {
                    setEditing(n.id);
                    setFormData(n);
                    setShowForm(true);
                  }}
                  style={styles.editBtn}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  style={styles.deleteBtn}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// 🎨 প্রিমিয়াম স্টাইল
// =============================================
const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: "'Hind Siliguri', sans-serif",
  },
  popup: {
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
  popupIcon: { fontSize: '24px' },
  popupText: { fontSize: '15px', fontWeight: '600', flex: 1 },
  popupClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#166534',
    cursor: 'pointer',
    padding: '4px',
  },
  previewSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  },
  previewTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewLoading: { textAlign: 'center', color: '#94a3b8', padding: '20px 0' },
  previewCard: {
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
  },
  previewBadge: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
  },
  previewActions: { display: 'flex', gap: '8px' },
  editIconBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelEditBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    color: '#dc2626',
  },
  previewBody: { padding: '16px' },
  previewContent: {},
  previewText: {
    fontSize: '15px',
    color: '#0f172a',
    margin: '0 0 8px 0',
    lineHeight: '1.6',
  },
  previewMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '8px',
  },
  previewDate: {},
  previewStatus: { fontWeight: '600', color: '#16a34a' },
  previewEmpty: {
    textAlign: 'center',
    padding: '30px 20px',
    background: '#fef3c7',
    borderRadius: '12px',
    border: '1px solid #fcd34d',
  },
  previewEmptyIcon: { fontSize: '32px', display: 'block', marginBottom: '8px' },
  previewEmptyText: {
    fontSize: '14px',
    color: '#92400e',
    margin: 0,
    lineHeight: '1.6',
  },
  switchStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '12px',
    padding: '12px 16px',
    background: '#f1f5f9',
    borderRadius: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  switchLabel: { fontWeight: '600', color: '#334155', fontSize: '14px' },
  switchOn: { fontWeight: '700', color: '#16a34a', fontSize: '14px' },
  switchOff: { fontWeight: '700', color: '#dc2626', fontSize: '14px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  addBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
  },
  textarea: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  switchContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
  },
  switchLabel2: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    position: 'relative',
  },
  switchInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    width: '44px',
    height: '24px',
    background: '#cbd5e1',
    borderRadius: '12px',
    transition: '0.3s ease',
    position: 'relative',
    display: 'inline-block',
    flexShrink: 0,
  },
  switchText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'white',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '8px',
  },
  itemFeatured: {
    borderColor: '#16a34a',
    borderWidth: '2px',
    background: '#f0fdf4',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
  },
  itemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    background: '#dbeafe',
    color: '#2563eb',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  badge2: {
    background: '#f1f5f9',
    color: '#64748b',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  featuredBadge: {
    background: '#dcfce7',
    color: '#16a34a',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '40px',
    height: '22px',
    flexShrink: 0,
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#cbd5e1',
    transition: '0.3s ease',
    borderRadius: '22px',
  },
  editBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteBtn: {
    background: '#fee2e2',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  editArea: { display: 'flex', flexDirection: 'column', gap: '10px' },
  editTextarea: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #16a34a',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '60px',
    outline: 'none',
  },
  editActions: { display: 'flex', gap: '10px' },
  saveFeaturedBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '10px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// ✅ অ্যানিমেশন
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .toggle-switch input:checked + .toggle-slider {
    background-color: #16a34a;
  }
  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(18px);
  }
`;
document.head.appendChild(styleSheet);
