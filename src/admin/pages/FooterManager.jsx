import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function FooterManager() {
  const [footerData, setFooterData] = useState({
    copyright: '',
    address: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

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
          'footer_copyright', 'footer_address', 'footer_phone', 'footer_email'
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
          copyright: formatted.footer_copyright || '',
          address: formatted.footer_address || '',
          phone: formatted.footer_phone || '',
          email: formatted.footer_email || '',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFooterData({ ...footerData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      const updates = Object.entries(footerData).map(([key, value]) => ({
        field_key: `footer_${key}`,
        value: value,
        field_type: 'text',
        category: 'footer',
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));

      for (const item of updates) {
        const { data: existing } = await supabase
          .from('cms_fields')
          .select('id')
          .eq('field_key', item.field_key)
          .maybeSingle();

        let fieldId;
        if (existing) {
          fieldId = existing.id;
        } else {
          const { data: newField } = await supabase
            .from('cms_fields')
            .insert([{
              field_key: item.field_key,
              field_type: item.field_type,
              category: item.category,
              label: item.label,
            }])
            .select()
            .single();
          fieldId = newField.id;
        }

        await supabase
          .from('cms_values')
          .upsert({
            field_id: fieldId,
            value: item.value,
          }, { onConflict: 'field_id' });
      }

      setSuccess('✅ ফুটার তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
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
      <h2 style={styles.title}>📋 ফুটার ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>ফুটারের সকল তথ্য এখান থেকে এডিট করুন</p>

      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>© কপিরাইট টেক্সট</label>
          <input
            type="text"
            name="copyright"
            value={footerData.copyright}
            onChange={handleChange}
            placeholder="© 2026 চিলমারী প্রি ক্যাডেট মাদ্রাসা"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📍 ঠিকানা</label>
          <input
            type="text"
            name="address"
            value={footerData.address}
            onChange={handleChange}
            placeholder="চিলমারী, কুড়িগ্রাম, বাংলাদেশ"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📞 ফোন</label>
          <input
            type="text"
            name="phone"
            value={footerData.phone}
            onChange={handleChange}
            placeholder="+8801521-553003"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📧 ইমেইল</label>
          <input
            type="email"
            name="email"
            value={footerData.email}
            onChange={handleChange}
            placeholder="info@chilmari-madrasa.com"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={saving} style={styles.saveBtn}>
          {saving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ করুন'}
        </button>
      </form>
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
  saveBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.3)' },
};
