import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function FooterManager() {
  const [footerData, setFooterData] = useState({
    copyright: '© 2026 চিলমারী প্রি ক্যাডেট মাদ্রাসা। সর্বস্বত্ব সংরক্ষিত।',
    address: 'চিলমারী, কুড়িগ্রাম, বাংলাদেশ',
    phone: '+8801521-553003',
    email: 'info@chilmari-madrasa.com',
    dev_image: 'https://i.postimg.cc/667hGYDg/Screenshot-20260727-124259.jpg',
    dev_name: 'Md Firoj Hasan',
    dev_tagline: '💻 যেকোনো প্রতিষ্ঠানের ও পারসোনাল ওয়েবসাইট বা App বানাতে যোগাযোগ করুন',
    dev_subtitle: 'Website Designed & Developed by',
    whatsapp: '8801918568313',
    facebook: 'https://www.facebook.com/firoj.gaming.chilmari',
    call: '01918568313',
    whatsapp_label: '💬 WhatsApp',
    facebook_label: '🌐 Facebook',
    call_label: '📞 Call Me',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlUploading, setUrlUploading] = useState(false);
  const fileInputRef = useRef(null);

  // =============================================
  // ✅ ডেটা লোড
  // =============================================
  useEffect(() => {
    loadFooterData();
  }, []);

  const loadFooterData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_values')
        .select(`
          value,
          cms_fields (
            field_key
          )
        `)
        .in('cms_fields.field_key', [
          'footer_copyright', 'footer_address', 'footer_phone', 'footer_email',
          'footer_dev_image', 'footer_dev_name', 'footer_dev_tagline', 'footer_dev_subtitle',
          'footer_whatsapp', 'footer_facebook', 'footer_call',
          'footer_whatsapp_label', 'footer_facebook_label', 'footer_call_label'
        ]);

      if (error) throw error;

      if (data) {
        const formatted = {};
        data.forEach(item => {
          if (item.cms_fields) {
            formatted[item.cms_fields.field_key] = item.value;
          }
        });
        setFooterData({
          copyright: formatted.footer_copyright || '© 2026 চিলমারী প্রি ক্যাডেট মাদ্রাসা। সর্বস্বত্ব সংরক্ষিত।',
          address: formatted.footer_address || 'চিলমারী, কুড়িগ্রাম, বাংলাদেশ',
          phone: formatted.footer_phone || '+8801521-553003',
          email: formatted.footer_email || 'info@chilmari-madrasa.com',
          dev_image: formatted.footer_dev_image || 'https://i.postimg.cc/667hGYDg/Screenshot-20260727-124259.jpg',
          dev_name: formatted.footer_dev_name || 'Md Firoj Hasan',
          dev_tagline: formatted.footer_dev_tagline || '💻 যেকোনো প্রতিষ্ঠানের ও পারসোনাল ওয়েবসাইট বা App বানাতে যোগাযোগ করুন',
          dev_subtitle: formatted.footer_dev_subtitle || 'Website Designed & Developed by',
          whatsapp: formatted.footer_whatsapp || '8801918568313',
          facebook: formatted.footer_facebook || 'https://www.facebook.com/firoj.gaming.chilmari',
          call: formatted.footer_call || '01918568313',
          whatsapp_label: formatted.footer_whatsapp_label || '💬 WhatsApp',
          facebook_label: formatted.footer_facebook_label || '🌐 Facebook',
          call_label: formatted.footer_call_label || '📞 Call Me',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
      setErrorMessage('⚠️ ডেটা লোড করতে সমস্যা');
    }
    setLoading(false);
  };

  // =============================================
  // ✅ ফিল্ড আপডেট
  // =============================================
  const updateField = async (fieldKey, value) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('cms_fields')
        .select('id')
        .eq('field_key', fieldKey)
        .maybeSingle();

      let fieldId;
      if (existing) {
        fieldId = existing.id;
      } else {
        const { data: newField } = await supabase
          .from('cms_fields')
          .insert([{
            field_key: fieldKey,
            field_type: 'text',
            category: 'footer',
            label: fieldKey.replace('footer_', '').replace(/_/g, ' ').toUpperCase(),
          }])
          .select()
          .single();
        fieldId = newField.id;
      }

      await supabase
        .from('cms_values')
        .upsert({
          field_id: fieldId,
          value: value,
        }, { onConflict: 'field_id' });

      const key = fieldKey.replace('footer_', '');
      setFooterData(prev => ({ ...prev, [key]: value }));

      setSuccessMessage('✅ সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Update error:', error);
      setErrorMessage('⚠️ সংরক্ষণ করতে সমস্যা');
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setSaving(false);
    setEditingField(null);
  };

  // =============================================
  // ✅ ইমেজ আপলোড (ফাইল)
  // =============================================
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage('');

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('ফাইল সাইজ ৫MB এর বেশি!');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `footer_${Date.now()}.${fileExt}`;
      const filePath = `footer-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      await updateField('footer_dev_image', urlData.publicUrl);
      setSuccessMessage('✅ ছবি আপলোড করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage('⚠️ ছবি আপলোড ব্যর্থ: ' + err.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setUploading(false);
    e.target.value = '';
  };

  // =============================================
  // ✅ URL ইমেজ আপলোড
  // =============================================
  const handleUrlImageUpload = async () => {
    if (!urlInput) {
      setErrorMessage('⚠️ দয়া করে একটি URL দিন');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setUrlUploading(true);
    setErrorMessage('');

    try {
      if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
        throw new Error('সঠিক URL দিন (http:// বা https:// দিয়ে শুরু)');
      }

      await updateField('footer_dev_image', urlInput);
      setUrlInput('');
      setSuccessMessage('✅ URL ইমেজ যোগ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('URL upload error:', err);
      setErrorMessage('⚠️ URL ইমেজ যোগ করতে সমস্যা: ' + err.message);
      setTimeout(() => setErrorMessage(''), 3000);
    }
    setUrlUploading(false);
  };

  // =============================================
  // ✅ এডিট কন্ট্রোল
  // =============================================
  const startEdit = (fieldKey, value) => {
    setEditingField(fieldKey);
    setEditValue(value);
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleEditSubmit = (fieldKey) => {
    if (editValue.trim() === '') {
      setErrorMessage('⚠️ ফিল্ড খালি রাখা যাবে না!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    updateField(fieldKey, editValue);
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <p>⏳ লোড হচ্ছে...</p>
      </div>
    );
  }

  // ফিল্ড গুলো গ্রুপ করুন
  const fields = {
    info: ['copyright', 'address', 'phone', 'email'],
    dev: ['dev_image', 'dev_subtitle', 'dev_name', 'dev_tagline'],
    social: ['whatsapp', 'facebook', 'call', 'whatsapp_label', 'facebook_label', 'call_label'],
  };

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

      <h2 style={styles.title}>📋 ফুটার ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>ফুটারের সব কন্টেন্ট এখান থেকে লাইভ এডিট করুন</p>

      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>📌 ফুটার প্রিভিউ (লাইভ)</h3>

        {/* =============================================
            📌 ফুটার কার্ড (হোমপেজের মতো)
            ============================================= */}
        <div style={styles.footerPreview}>
          <div style={styles.footerTop}>
            <div style={styles.footerInfo}>
              <h4 style={styles.footerTitle}>চিলমারী প্রি ক্যাডেট মাদ্রাসা</h4>
              <p style={styles.footerText}>📍 {footerData.address}</p>
              <p style={styles.footerText}>📞 {footerData.phone}</p>
              <p style={styles.footerText}>✉️ {footerData.email}</p>
            </div>
          </div>

          {/* ✅ ডেভেলপার কার্ড */}
          <div style={styles.devCard}>
            <div style={styles.devImageWrapper}>
              <img src={footerData.dev_image} alt="Developer" style={styles.devImage} />
              <div style={styles.imageUploadWrapper}>
                <label style={styles.imageUploadBtn}>
                  📤 আপলোড
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={styles.hiddenInput}
                    disabled={uploading}
                  />
                </label>
                <div style={styles.urlUploadWrapper}>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="ইমেজ URL দিন..."
                    style={styles.urlInput}
                  />
                  <button
                    onClick={handleUrlImageUpload}
                    disabled={urlUploading}
                    style={styles.urlBtn}
                  >
                    {urlUploading ? '⏳' : '🔗 যোগ'}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.devInfo}>
              {/* ✅ ডেভেলপার সাবটাইটেল */}
              <div style={styles.fieldRow}>
                {editingField === 'footer_dev_subtitle' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInput}
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_dev_subtitle')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.fieldDisplay}>
                    <span style={styles.devSubtitle}>{footerData.dev_subtitle}</span>
                    <button onClick={() => startEdit('footer_dev_subtitle', footerData.dev_subtitle)} style={styles.editIconBtn}>✏️</button>
                  </div>
                )}
              </div>

              {/* ✅ ডেভেলপারের নাম */}
              <div style={styles.fieldRow}>
                {editingField === 'footer_dev_name' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInput}
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_dev_name')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.fieldDisplay}>
                    <span style={styles.devName}>{footerData.dev_name}</span>
                    <button onClick={() => startEdit('footer_dev_name', footerData.dev_name)} style={styles.editIconBtn}>✏️</button>
                  </div>
                )}
              </div>

              {/* ✅ ডেভেলপার ট্যাগলাইন */}
              <div style={styles.fieldRow}>
                {editingField === 'footer_dev_tagline' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInput}
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_dev_tagline')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.fieldDisplay}>
                    <span style={styles.devTagline}>{footerData.dev_tagline}</span>
                    <button onClick={() => startEdit('footer_dev_tagline', footerData.dev_tagline)} style={styles.editIconBtn}>✏️</button>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ সোশ্যাল বাটন */}
            <div style={styles.socialButtons}>
              {/* WhatsApp */}
              <div style={styles.socialRow}>
                {editingField === 'footer_whatsapp' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInputSmall}
                      placeholder="নাম্বার দিন"
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_whatsapp')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.socialDisplay}>
                    <span style={styles.socialLabel}>{footerData.whatsapp_label}</span>
                    <span style={styles.socialValue}>{footerData.whatsapp}</span>
                    <button onClick={() => startEdit('footer_whatsapp', footerData.whatsapp)} style={styles.editIconBtnSmall}>✏️</button>
                    {editingField === 'footer_whatsapp_label' ? (
                      <div style={styles.editContainerInline}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleEditChange}
                          style={styles.editInputTiny}
                          placeholder="লেবেল"
                          autoFocus
                        />
                        <button onClick={() => handleEditSubmit('footer_whatsapp_label')} style={styles.editSaveBtnSmall}>💾</button>
                        <button onClick={() => setEditingField(null)} style={styles.editCancelBtnSmall}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit('footer_whatsapp_label', footerData.whatsapp_label)} style={styles.editLabelBtn}>✏️ লেবেল</button>
                    )}
                  </div>
                )}
              </div>

              {/* Facebook */}
              <div style={styles.socialRow}>
                {editingField === 'footer_facebook' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInputSmall}
                      placeholder="URL দিন"
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_facebook')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.socialDisplay}>
                    <span style={styles.socialLabel}>{footerData.facebook_label}</span>
                    <span style={styles.socialValue}>{footerData.facebook}</span>
                    <button onClick={() => startEdit('footer_facebook', footerData.facebook)} style={styles.editIconBtnSmall}>✏️</button>
                    {editingField === 'footer_facebook_label' ? (
                      <div style={styles.editContainerInline}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleEditChange}
                          style={styles.editInputTiny}
                          placeholder="লেবেল"
                          autoFocus
                        />
                        <button onClick={() => handleEditSubmit('footer_facebook_label')} style={styles.editSaveBtnSmall}>💾</button>
                        <button onClick={() => setEditingField(null)} style={styles.editCancelBtnSmall}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit('footer_facebook_label', footerData.facebook_label)} style={styles.editLabelBtn}>✏️ লেবেল</button>
                    )}
                  </div>
                )}
              </div>

              {/* Call */}
              <div style={styles.socialRow}>
                {editingField === 'footer_call' ? (
                  <div style={styles.editContainer}>
                    <input
                      type="text"
                      value={editValue}
                      onChange={handleEditChange}
                      style={styles.editInputSmall}
                      placeholder="নাম্বার দিন"
                      autoFocus
                    />
                    <button onClick={() => handleEditSubmit('footer_call')} style={styles.editSaveBtn}>💾</button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
                  </div>
                ) : (
                  <div style={styles.socialDisplay}>
                    <span style={styles.socialLabel}>{footerData.call_label}</span>
                    <span style={styles.socialValue}>{footerData.call}</span>
                    <button onClick={() => startEdit('footer_call', footerData.call)} style={styles.editIconBtnSmall}>✏️</button>
                    {editingField === 'footer_call_label' ? (
                      <div style={styles.editContainerInline}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={handleEditChange}
                          style={styles.editInputTiny}
                          placeholder="লেবেল"
                          autoFocus
                        />
                        <button onClick={() => handleEditSubmit('footer_call_label')} style={styles.editSaveBtnSmall}>💾</button>
                        <button onClick={() => setEditingField(null)} style={styles.editCancelBtnSmall}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit('footer_call_label', footerData.call_label)} style={styles.editLabelBtn}>✏️ লেবেল</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ কপিরাইট */}
          <div style={styles.footerBottom}>
            {editingField === 'footer_copyright' ? (
              <div style={styles.editContainer}>
                <input
                  type="text"
                  value={editValue}
                  onChange={handleEditChange}
                  style={styles.editInput}
                  autoFocus
                />
                <button onClick={() => handleEditSubmit('footer_copyright')} style={styles.editSaveBtn}>💾</button>
                <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>✕</button>
              </div>
            ) : (
              <div style={styles.fieldDisplay}>
                <span style={styles.copyrightText}>{footerData.copyright}</span>
                <button onClick={() => startEdit('footer_copyright', footerData.copyright)} style={styles.editIconBtn}>✏️</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// 🎨 প্রিমিয়াম স্টাইল
// =============================================
const styles = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '0 16px', fontFamily: "'Hind Siliguri', sans-serif" },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  popupSuccess: {
    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#166534',
    padding: '16px 24px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(22, 163, 74, 0.3)',
    display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideIn 0.5s ease',
    border: '1px solid #86efac', maxWidth: '400px',
  },
  popupError: {
    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
    background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#991b1b',
    padding: '16px 24px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
    display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideIn 0.5s ease',
    border: '1px solid #fca5a5', maxWidth: '400px',
  },
  popupIcon: { fontSize: '24px' },
  popupText: { fontSize: '15px', fontWeight: '600', flex: 1 },
  popupClose: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '4px' },
  previewSection: {
    background: 'white', borderRadius: '16px', padding: '24px',
    border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  },
  previewTitle: {
    fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px 0',
    borderBottom: '2px solid #f1f5f9', paddingBottom: '10px',
  },
  footerPreview: {
    background: '#090d16', color: '#94a3b8', borderRadius: '16px',
    padding: '24px', border: '1px solid #1e293b',
  },
  footerTop: { textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' },
  footerTitle: { color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0' },
  footerText: { fontSize: '14px', margin: '4px 0', color: '#cbd5e1' },
  devCard: {
    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
    border: '1px solid #334155', borderRadius: '20px',
    padding: '24px', maxWidth: '600px', margin: '0 auto 20px auto',
    textAlign: 'center',
  },
  devImageWrapper: { position: 'relative', display: 'inline-block', marginBottom: '12px' },
  devImage: { width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10b981', boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' },
  imageUploadWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '8px' },
  imageUploadBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white',
    padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', display: 'inline-block', position: 'relative',
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' },
  urlUploadWrapper: { display: 'flex', gap: '6px', width: '100%', maxWidth: '300px' },
  urlInput: { flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none' },
  urlBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  devInfo: { marginTop: '8px' },
  fieldRow: { marginBottom: '8px', padding: '4px 0' },
  fieldDisplay: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' },
  devSubtitle: { fontSize: '14px', color: '#94a3b8' },
  devName: { fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, #38bdf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '4px 0' },
  devTagline: { fontSize: '14px', color: '#e0f2fe', fontWeight: '600' },
  editIconBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  editIconBtnSmall: { background: '#f1f5f9', border: 'none', padding: '2px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  editLabelBtn: { background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' },
  editContainer: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  editContainerInline: { display: 'flex', gap: '4px', alignItems: 'center' },
  editInput: { padding: '6px 12px', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '14px', outline: 'none', minWidth: '200px' },
  editInputSmall: { padding: '4px 10px', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '13px', outline: 'none', minWidth: '150px' },
  editInputTiny: { padding: '2px 8px', borderRadius: '6px', border: '2px solid #16a34a', fontSize: '12px', outline: 'none', width: '80px' },
  editSaveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  editSaveBtnSmall: { background: '#16a34a', color: 'white', border: 'none', padding: '2px 10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  editCancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  editCancelBtnSmall: { background: '#64748b', color: 'white', border: 'none', padding: '2px 10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  socialButtons: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', alignItems: 'center' },
  socialRow: { width: '100%', maxWidth: '400px' },
  socialDisplay: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px' },
  socialLabel: { fontWeight: '600', color: '#e2e8f0', fontSize: '14px' },
  socialValue: { color: '#94a3b8', fontSize: '13px' },
  footerBottom: { textAlign: 'center', fontSize: '12px', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '16px' },
  copyrightText: { fontSize: '12px', color: '#64748b' },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
