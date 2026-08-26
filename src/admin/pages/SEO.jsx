import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function SEO() {
  const [seoData, setSeoData] = useState({
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSEOData();
  }, []);

  const loadSEOData = async () => {
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
          'seo_meta_title', 'seo_meta_description', 'seo_meta_keywords',
          'seo_og_title', 'seo_og_description', 'seo_og_image'
        ]);

      if (error) throw error;

      if (data) {
        const formatted = {};
        data.forEach(item => {
          if (item.cms_fields) {
            formatted[item.cms_fields.field_key] = item.value;
          }
        });
        setSeoData({
          meta_title: formatted.seo_meta_title || '',
          meta_description: formatted.seo_meta_description || '',
          meta_keywords: formatted.seo_meta_keywords || '',
          og_title: formatted.seo_og_title || '',
          og_description: formatted.seo_og_description || '',
          og_image: formatted.seo_og_image || '',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setSeoData({ ...seoData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      const updates = Object.entries(seoData).map(([key, value]) => ({
        field_key: `seo_${key}`,
        value: value,
        field_type: 'text',
        category: 'seo',
        label: key.replace(/_/g, ' ').toUpperCase(),
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

      setSuccess('✅ SEO তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!');
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
      <h2 style={styles.title}>🔍 SEO ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>সাইটের SEO তথ্য এখান থেকে পরিবর্তন করুন</p>

      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>📝 মেটা টাইটেল</label>
          <input
            type="text"
            name="meta_title"
            value={seoData.meta_title}
            onChange={handleChange}
            placeholder="চিলমারী প্রি ক্যাডেট মাদ্রাসা"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📄 মেটা ডেসক্রিপশন</label>
          <textarea
            name="meta_description"
            value={seoData.meta_description}
            onChange={handleChange}
            placeholder="চিলমারী প্রি ক্যাডেট মাদ্রাসা - দ্বীন ও আধুনিক শিক্ষার অপূর্ব মেলবন্ধন"
            rows="3"
            style={styles.textarea}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🔑 মেটা কীওয়ার্ড</label>
          <input
            type="text"
            name="meta_keywords"
            value={seoData.meta_keywords}
            onChange={handleChange}
            placeholder="মাদ্রাসা, চিলমারী, ইসলামি শিক্ষা"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🌐 OG টাইটেল</label>
          <input
            type="text"
            name="og_title"
            value={seoData.og_title}
            onChange={handleChange}
            placeholder="চিলমারী প্রি ক্যাডেট মাদ্রাসা"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📄 OG ডেসক্রিপশন</label>
          <textarea
            name="og_description"
            value={seoData.og_description}
            onChange={handleChange}
            placeholder="চিলমারী প্রি ক্যাডেট মাদ্রাসা - দ্বীন ও আধুনিক শিক্ষার অপূর্ব মেলবন্ধন"
            rows="3"
            style={styles.textarea}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🖼️ OG ইমেজ URL</label>
          <input
            type="text"
            name="og_image"
            value={seoData.og_image}
            onChange={handleChange}
            placeholder="https://example.com/og-image.jpg"
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
  textarea: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc', fontFamily: 'inherit', resize: 'vertical' },
  saveBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.3)' },
};
