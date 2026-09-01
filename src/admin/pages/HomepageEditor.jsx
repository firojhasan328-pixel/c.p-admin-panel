import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

// =============================================
// ✅ সিম্পল WYSIWYG টুলবার (বোল্ড, ইটালিক, কালার)
// =============================================
const Toolbar = ({ onFormat }) => (
  <div style={styles.toolbar}>
    <button onClick={() => onFormat('bold')} style={styles.toolBtn} title="বোল্ড">𝐁</button>
    <button onClick={() => onFormat('italic')} style={styles.toolBtn} title="ইটালিক">𝑰</button>
    <button onClick={() => onFormat('underline')} style={styles.toolBtn} title="আন্ডারলাইন">U</button>
    <input
      type="color"
      onChange={(e) => onFormat('color', e.target.value)}
      style={styles.colorPicker}
      title="রঙ"
    />
    <button onClick={() => onFormat('remove')} style={styles.toolBtn} title="ফরম্যাট সরান">↺</button>
  </div>
);

export default function HomepageEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  // =============================================
  // ✅ ডেটা লোড
  // =============================================
  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    try {
      const { data: fieldData } = await supabase
        .from('cms_fields')
        .select('*')
        .eq('category', 'homepage')
        .order('sort_order', { ascending: true });

      if (fieldData) {
        setFields(fieldData);
        const { data: valueData } = await supabase
          .from('cms_values')
          .select('*')
          .in('field_id', fieldData.map(f => f.id));

        const valueMap = {};
        valueData?.forEach(v => {
          valueMap[v.field_id] = v.value;
        });
        setValues(valueMap);
      }
    } catch (error) {
      console.error('Load error:', error);
      setErrorMessage('⚠️ ডেটা লোড করতে সমস্যা');
    }
    setLoading(false);
  };

  // =============================================
  // ✅ ফিল্ড আপডেট (ইনলাইন এডিট)
  // =============================================
  const updateField = async (fieldId, value) => {
    setSaving(true);
    try {
      await supabase
        .from('cms_values')
        .upsert({
          field_id: fieldId,
          value: value,
        }, { onConflict: 'field_id' });

      setValues(prev => ({ ...prev, [fieldId]: value }));
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
  // ✅ WYSIWYG ফরম্যাটিং
  // =============================================
  const applyFormat = (fieldId, type, value = null) => {
    const textarea = document.getElementById(`editor-${fieldId}`);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    let formattedText = selectedText;
    let wrapperStart = '';
    let wrapperEnd = '';

    if (type === 'bold') {
      wrapperStart = '<b>';
      wrapperEnd = '</b>';
    } else if (type === 'italic') {
      wrapperStart = '<i>';
      wrapperEnd = '</i>';
    } else if (type === 'underline') {
      wrapperStart = '<u>';
      wrapperEnd = '</u>';
    } else if (type === 'color') {
      wrapperStart = `<span style="color:${value}">`;
      wrapperEnd = '</span>';
    } else if (type === 'remove') {
      const clean = selectedText.replace(/<[^>]*>/g, '');
      textarea.value = before + clean + after;
      setEditValue(textarea.value);
      return;
    }

    if (!selectedText) {
      const newValue = before + wrapperStart + wrapperEnd + after;
      textarea.value = newValue;
      setEditValue(newValue);
      return;
    }

    const newValue = before + wrapperStart + formattedText + wrapperEnd + after;
    textarea.value = newValue;
    setEditValue(newValue);
  };

  // =============================================
  // ✅ এডিট শুরু
  // =============================================
  const startEdit = (field) => {
    setEditingField(field.id);
    setEditValue(values[field.id] || '');
  };

  const handleEditChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleEditSubmit = (fieldId) => {
    if (editValue.trim() === '') {
      setErrorMessage('⚠️ ফিল্ড খালি রাখা যাবে না!');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    updateField(fieldId, editValue);
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

  // গ্রুপ ফিল্ডস by সেকশন
  const groupedFields = {
    header: fields.filter(f => f.field_key.includes('header')),
    about: fields.filter(f => f.field_key.includes('about')),
    notice: fields.filter(f => f.field_key.includes('notice')),
    features: fields.filter(f => f.field_key.includes('features')),
    admission: fields.filter(f => f.field_key.includes('admission')),
    footer: fields.filter(f => f.field_key.includes('footer')),
  };

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

      <h2 style={styles.title}>🏠 হোমপেজ এডিটর</h2>
      <p style={styles.subtitle}>হোমপেজের সব কন্টেন্ট এখান থেকে লাইভ এডিট করুন</p>

      {/* =============================================
          📌 লাইভ প্রিভিউ + এডিট
          ============================================= */}
      <div style={styles.previewSection}>
        <h3 style={styles.previewTitle}>📌 হোমপেজ প্রিভিউ (লাইভ)</h3>

        {/* ✅ হেডার সেকশন */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 হেডার সেকশন</h4>
          {groupedFields.header.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <Toolbar onFormat={(type, val) => applyFormat(field.id, type, val)} />
                  <textarea
                    id={`editor-${field.id}`}
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editTextarea}
                    rows="2"
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValue}>{values[field.id] || field.placeholder || '—'}</span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ প্রধান শিক্ষকের বাণী */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 প্রধান শিক্ষকের বাণী</h4>
          {groupedFields.about.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <Toolbar onFormat={(type, val) => applyFormat(field.id, type, val)} />
                  <textarea
                    id={`editor-${field.id}`}
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editTextarea}
                    rows="4"
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValue}>{values[field.id] || field.placeholder || '—'}</span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ নোটিশ */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 নোটিশ বোর্ড</h4>
          {groupedFields.notice.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInput}
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValue}>{values[field.id] || field.placeholder || '—'}</span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* =============================================
            ✅ বিশেষত্ব (আপডেটেড)
            ============================================= */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 বিশেষত্ব</h4>
          {groupedFields.features.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <Toolbar onFormat={(type, val) => applyFormat(field.id, type, val)} />
                  <textarea
                    id={`editor-${field.id}`}
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editTextarea}
                    rows="6"
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  {/* ✅ হেল্প টেক্সট */}
                  <small style={styles.helpText}>
                    💡 প্রতিটি আইটেম নতুন লাইনে লিখুন। এন্টার (Enter) চাপ দিয়ে নতুন লাইন তৈরি করুন।
                  </small>
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValuePreview}>
                    {values[field.id] ? (
                      <div style={{ whiteSpace: 'pre-line' }}>
                        {values[field.id]}
                      </div>
                    ) : (
                      field.placeholder || '—'
                    )}
                  </span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ ভর্তি সেকশন */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 ভর্তি সেকশন</h4>
          {groupedFields.admission.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInput}
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValue}>{values[field.id] || field.placeholder || '—'}</span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ ফুটার */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>🟢 ফুটার</h4>
          {groupedFields.footer.map((field) => (
            <div key={field.id} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{field.label}:</span>
              {editingField === field.id ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={handleEditChange}
                    style={styles.editInput}
                    placeholder={field.placeholder || ''}
                    autoFocus
                  />
                  <div style={styles.editActions}>
                    <button onClick={() => handleEditSubmit(field.id)} style={styles.editSaveBtn}>
                      💾 সংরক্ষণ
                    </button>
                    <button onClick={() => setEditingField(null)} style={styles.editCancelBtn}>
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.fieldDisplay}>
                  <span style={styles.fieldValue}>{values[field.id] || field.placeholder || '—'}</span>
                  <button onClick={() => startEdit(field)} style={styles.editIconBtn}>✏️</button>
                </div>
              )}
            </div>
          ))}
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
  section: {
    marginBottom: '24px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  fieldRow: {
    marginBottom: '10px',
    padding: '8px 12px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    display: 'block',
    marginBottom: '4px',
  },
  fieldDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#0f172a',
    flex: 1,
    wordBreak: 'break-word',
  },
  // ✅ নতুন স্টাইল (বিশেষত্ব প্রিভিউ)
  fieldValuePreview: {
    flex: 1,
    wordBreak: 'break-word',
    whiteSpace: 'pre-line',
    fontSize: '14px',
    color: '#0f172a',
  },
  editIconBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    flexShrink: 0,
  },
  editContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },
  editInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #16a34a',
    fontSize: '14px',
    outline: 'none',
  },
  editTextarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #16a34a',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '60px',
  },
  // ✅ হেল্প টেক্সট স্টাইল
  helpText: {
    display: 'block',
    color: '#64748b',
    fontSize: '12px',
    marginTop: '4px',
    padding: '4px 8px',
    background: '#f1f5f9',
    borderRadius: '6px',
  },
  editActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  editSaveBtn: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editCancelBtn: {
    background: '#64748b',
    color: 'white',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '6px 0',
  },
  toolBtn: {
    background: '#f1f5f9',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#334155',
  },
  colorPicker: {
    width: '30px',
    height: '30px',
    padding: '2px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    cursor: 'pointer',
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
