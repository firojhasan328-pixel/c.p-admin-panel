import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function HomepageEditor() {
  const { adminUser } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});

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
        .order('sort_order');

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
    }
    setLoading(false);
  };

  const handleChange = (fieldId, value) => {
    setValues({ ...values, [fieldId]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    try {
      for (const [fieldId, value] of Object.entries(values)) {
        await supabase
          .from('cms_values')
          .upsert({
            field_id: fieldId,
            value: value,
            updated_by: adminUser?.user_id,
          }, { onConflict: 'field_id' });
      }
      setSuccess('✅ সফলভাবে সংরক্ষণ করা হয়েছে!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে');
    }
    setSaving(false);
  };

  if (loading) return <p>⏳ লোড হচ্ছে...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏠 হোমপেজ এডিটর</h2>
      <p style={styles.subtitle}>হোমপেজের সব কন্টেন্ট এখান থেকে এডিট করুন</p>

      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.form}>
        {fields.map((field) => (
          <div key={field.id} style={styles.field}>
            <label style={styles.label}>{field.label}</label>
            {field.field_type === 'text' && (
              <input
                type="text"
                value={values[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={styles.input}
              />
            )}
            {field.field_type === 'rich_text' && (
              <textarea
                rows="4"
                value={values[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={styles.textarea}
              />
            )}
            {field.field_type === 'image' && (
              <input
                type="text"
                value={values[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={styles.input}
              />
            )}
          </div>
        ))}

        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  title: { fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' },
  success: { background: '#dcfce7', color: '#15803d', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', borderLeft: '4px solid #16a34a' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#334155' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' },
  textarea: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', fontFamily: 'inherit', resize: 'vertical' },
  saveBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.3)' },
};
