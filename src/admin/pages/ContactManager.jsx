import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function ContactManager() {
  const [contactData, setContactData] = useState({
    phone: '+8801521-553003',
    email: 'info@chilmari-madrasa.com',
    address: 'চিলমারী, কুড়িগ্রাম, বাংলাদেশ',
    facebook: 'https://facebook.com/your-page',
    whatsapp: '8801918568313',
    image: 'https://i.postimg.cc/667hGYDg/Screenshot-20260727-124259.jpg',
    designation: 'প্রধান শিক্ষক ও পরিচালক',
    whatsapp_label: '💬 WhatsApp',
    facebook_label: '🌐 Facebook',
    call_label: '📞 কল করুন',
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
    loadContactData();
  }, []);

  const loadContactData = async () => {
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
          'contact_phone', 'contact_email', 'contact_address',
          'contact_facebook', 'contact_whatsapp', 'contact_image',
          'contact_designation', 'contact_whatsapp_label',
          'contact_facebook_label', 'contact_call_label'
        ]);

      if (error) throw error;

      if (data) {
        const formatted = {};
        data.forEach(item => {
          if (item.cms_fields) {
            formatted[item.cms_fields.field_key] = item.value;
          }
        });
        setContactData({
          phone: formatted.contact_phone || '+8801521-553003',
          email: formatted.contact_email || 'info@chilmari-madrasa.com',
          address: formatted.contact_address || 'চিলমারী, কুড়িগ্রাম, বাংলাদেশ',
          facebook: formatted.contact_facebook || 'https://facebook.com/your-page',
          whatsapp: formatted.contact_whatsapp || '8801918568313',
          image: formatted.contact_image || 'https://i.postimg.cc/667hGYDg/Screenshot-20260727-124259.jpg',
          designation: formatted.contact_designation || 'প্রধান শিক্ষক ও পরিচালক',
          whatsapp_label: formatted.contact_whatsapp_label || '💬 WhatsApp',
          facebook_label: formatted.contact_facebook_label || '🌐 Facebook',
          call_label: formatted.contact_call_label || '📞 কল করুন',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  };

  // =============================================
  // ✅ ফিল্ড আপডেট (ইনলাইন এডিট)
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
            category: 'contact',
            label: fieldKey.replace('contact_', '').replace(/_/g, ' ').toUpperCase(),
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

      // লোকাল স্টেট আপডেট
      const key = fieldKey.replace('contact_', '');
      setContactData(prev => ({ ...prev, [key]: value }));

      setSuccessMessage('✅ সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Update error:', error);
      setErrorMessage('⚠️ সংরক্ষণ করতে সমস্যা: ' + error.message);
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
      const fileName = `contact_${Date.now()}.${fileExt}`;
      const filePath = `contact-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      await updateField('contact_image', urlData.publicUrl);
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

      await updateField('contact_image', urlInput);
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
  // ✅ এডিট শুরু
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

  return (
    <div style={styles.container}>
      {/* ✅ পপআপ মেসেজ */}
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

      <h2 style={styles.title}>📞 যোগাযোগ ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>হোমপেজের যোগাযোগ সেকশন এখান থেকে লাইভ এডিট করুন</p>

      {/* =============================================
          📌 লাইভ প্রিভিউ (হোমপেজের মতো)
          ============================================= */}
      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>📌 হোমপেজ প্রিভিউ (লাইভ)</h3>

        <div style={styles.previewCard}>
          {/* প্রোফাইল ইমেজ */}
          <div style={styles.previewImageWrapper}>
            <img
              src={contactData.image}
              alt="প্রধান শিক্ষক"
              style={styles.previewImage}
            />
            {/* ইমেজ আপলোড বাটন */}
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

          {/* পদবি (এডিটেবল) */}
          <div style={styles.fieldRow}>
            {editingField === 'contact_designation' ? (
              <div style={styles.editContainer}>
                <input
                  type="text"
                  value={editValue}
                  onChange={handleEditChange}
                  style={styles.editInput}
                  autoFocus
                />
                <button onClick={() => handleEditSubmit('contact_designation')} style={styles.editSaveBtn}>
                  💾
                </button>
                <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={styles.fieldDisplay}>
                <span style={styles.fieldValueLarge}>{contactData.designation}</span>
                <button onClick={() => startEdit('contact_designation', contactData.designation)} style={styles.editIconBtn}>
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* ফোন */}
          <div style={styles.fieldRow}>
            {editingField === 'contact_phone' ? (
              <div style={styles.editContainer}>
                <input
                  type="text"
                  value={editValue}
                  onChange={handleEditChange}
                  style={styles.editInput}
                  autoFocus
                />
                <button onClick={() => handleEditSubmit('contact_phone')} style={styles.editSaveBtn}>
                  💾
                </button>
                <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={styles.fieldDisplay}>
                <span style={styles.fieldLabel}>📞 ফোন</span>
                <span style={styles.fieldValue}>{contactData.phone}</span>
                <button onClick={() => startEdit('contact_phone', contactData.phone)} style={styles.editIconBtn}>
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* ইমেইল */}
          <div style={styles.fieldRow}>
            {editingField === 'contact_email' ? (
              <div style={styles.editContainer}>
                <input
                  type="text"
                  value={editValue}
                  onChange={handleEditChange}
                  style={styles.editInput}
                  autoFocus
                />
                <button onClick={() => handleEditSubmit('contact_email')} style={styles.editSaveBtn}>
                  💾
                </button>
                <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={styles.fieldDisplay}>
                <span style={styles.fieldLabel}>✉️ ইমেইল</span>
                <span style={styles.fieldValue}>{contactData.email}</span>
                <button onClick={() => startEdit('contact_email', contactData.email)} style={styles.editIconBtn}>
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* ঠিকানা */}
          <div style={styles.fieldRow}>
            {editingField === 'contact_address' ? (
              <div style={styles.editContainer}>
                <input
                  type="text"
                  value={editValue}
                  onChange={handleEditChange}
                  style={styles.editInput}
                  autoFocus
                />
                <button onClick={() => handleEditSubmit('contact_address')} style={styles.editSaveBtn}>
                  💾
                </button>
                <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                  ✕
                </button>
              </div>
            ) : (
              <div style={styles.fieldDisplay}>
                <span style={styles.fieldLabel}>📍 ঠিকানা</span>
                <span style={styles.fieldValue}>{contactData.address}</span>
                <button onClick={() => startEdit('contact_address', contactData.address)} style={styles.editIconBtn}>
                  ✏️
                </button>
              </div>
            )}
          </div>

          {/* ৩টি বাটন (এডিটেবল) */}
          <div style={styles.buttonsSection}>
            {/* WhatsApp */}
            <div style={styles.buttonEditRow}>
              {editingField === 'contact_whatsapp' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="নাম্বার দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_whatsapp')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={styles.buttonDisplay}>
                  <span style={styles.buttonLabel}>{contactData.whatsapp_label}</span>
                  <span style={styles.buttonValue}>{contactData.whatsapp}</span>
                  <button onClick={() => startEdit('contact_whatsapp', contactData.whatsapp)} style={styles.editIconBtnSmall}>
                    ✏️
                  </button>
                </div>
              )}
              {/* WhatsApp লেবেল এডিট */}
              {editingField === 'contact_whatsapp_label' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="লেবেল দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_whatsapp_label')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit('contact_whatsapp_label', contactData.whatsapp_label)} style={styles.editLabelBtn}>
                  ✏️ লেবেল
                </button>
              )}
            </div>

            {/* Facebook */}
            <div style={styles.buttonEditRow}>
              {editingField === 'contact_facebook' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="URL দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_facebook')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={styles.buttonDisplay}>
                  <span style={styles.buttonLabel}>{contactData.facebook_label}</span>
                  <span style={styles.buttonValue}>{contactData.facebook}</span>
                  <button onClick={() => startEdit('contact_facebook', contactData.facebook)} style={styles.editIconBtnSmall}>
                    ✏️
                  </button>
                </div>
              )}
              {editingField === 'contact_facebook_label' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="লেবেল দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_facebook_label')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit('contact_facebook_label', contactData.facebook_label)} style={styles.editLabelBtn}>
                  ✏️ লেবেল
                </button>
              )}
            </div>

            {/* Call */}
            <div style={styles.buttonEditRow}>
              {editingField === 'contact_phone' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="নাম্বার দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_phone')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={styles.buttonDisplay}>
                  <span style={styles.buttonLabel}>{contactData.call_label}</span>
                  <span style={styles.buttonValue}>{contactData.phone}</span>
                  <button onClick={() => startEdit('contact_phone', contactData.phone)} style={styles.editIconBtnSmall}>
                    ✏️
                  </button>
                </div>
              )}
              {editingField === 'contact_call_label' ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInputSmall}
                    placeholder="লেবেল দিন"
                    autoFocus
                  />
                  <button onClick={() => handleEditSubmit('contact_call_label')} style={styles.editSaveBtn}>
                    💾
                  </button>
                  <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => startEdit('contact_call_label', contactData.call_label)} style={styles.editLabelBtn}>
                  ✏️ লেবেল
                </button>
              )}
            </div>
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
  container: {
    maxWidth: '900px',
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
  previewSection: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
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
  },
  previewCard: {
    maxWidth: '500px',
    margin: '0 auto',
    textAlign: 'center',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  previewImageWrapper: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '12px',
  },
  previewImage: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #16a34a',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
  },
  imageUploadWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
  },
  imageUploadBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-block',
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    cursor: 'pointer',
  },
  urlUploadWrapper: {
    display: 'flex',
    gap: '6px',
    width: '100%',
    maxWidth: '300px',
  },
  urlInput: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '13px',
    outline: 'none',
  },
  urlBtn: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  fieldRow: {
    marginBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '10px',
  },
  fieldDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    minWidth: '60px',
    textAlign: 'left',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  fieldValueLarge: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
  },
  editIconBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  editIconBtnSmall: {
    background: '#f1f5f9',
    border: 'none',
    padding: '2px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  editLabelBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '11px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  editContainer: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  editInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #16a34a',
    fontSize: '14px',
    outline: 'none',
    minWidth: '200px',
  },
  editInputSmall: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '2px solid #16a34a',
    fontSize: '13px',
    outline: 'none',
    minWidth: '150px',
  },
  editSaveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editCancelBtn: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonsSection: {
    marginTop: '16px',
    borderTop: '2px solid #e2e8f0',
    paddingTop: '16px',
  },
  buttonEditRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '10px',
    padding: '8px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
  },
  buttonDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonValue: {
    color: '#64748b',
    fontSize: '13px',
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
