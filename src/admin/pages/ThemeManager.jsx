import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function ThemeManager() {
  const [themeData, setThemeData] = useState({
    primary_color: '#14532d',
    secondary_color: '#16a34a',
    font_family: 'Hind Siliguri',
    logo_url: '',
    favicon_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadThemeData();
  }, []);

  const loadThemeData = async () => {
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
          'theme_primary_color', 'theme_secondary_color', 'theme_font_family',
          'theme_logo_url', 'theme_favicon_url'
        ]);

      if (error) throw error;

      if (data) {
        const formatted = {};
        data.forEach(item => {
          if (item.cms_fields) {
            formatted[item.cms_fields.field_key] = item.value;
          }
        });
        setThemeData({
          primary_color: formatted.theme_primary_color || '#14532d',
          secondary_color: formatted.theme_secondary_color || '#16a34a',
          font_family: formatted.theme_font_family || 'Hind Siliguri',
          logo_url: formatted.theme_logo_url || '',
          favicon_url: formatted.theme_favicon_url || '',
        });
      }
    } catch (error) {
      console.error('Load error:', error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setThemeData({ ...themeData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      const updates = Object.entries(themeData).map(([key, value]) => ({
        field_key: `theme_${key}`,
        value: value,
        field_type: 'text',
        category: 'theme',
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

      setSuccess('✅ থিম সফলভাবে সংরক্ষণ করা হয়েছে!');
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
      <h2 style={styles.title}>🎨 থিম ব্যবস্থাপনা</h2>
      <p style={styles.subtitle}>ওয়েবসাইটের থিম ও রঙ এখান থেকে পরিবর্তন করুন</p>

      {success && <div style={styles.success}>{success}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>🎨 প্রাইমারি রঙ (HEX)</label>
          <div style={styles.colorRow}>
            <input
              type="color"
              name="primary_color"
              value={themeData.primary_color}
              onChange={handleChange}
              style={styles.colorPicker}
            />
            <input
              type="text"
              name="primary_color"
              value={themeData.primary_color}
              onChange={handleChange}
              placeholder="#14532d"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🎨 সেকেন্ডারি রঙ (HEX)</label>
          <div style={styles.colorRow}>
            <input
              type="color"
              name="secondary_color"
              value={themeData.secondary_color}
              onChange={handleChange}
              style={styles.colorPicker}
            />
            <input
              type="text"
              name="secondary_color"
              value={themeData.secondary_color}
              onChange={handleChange}
              placeholder="#16a34a"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>📝 ফন্ট ফ্যামিলি</label>
          <select
            name="font_family"
            value={themeData.font_family}
            onChange={handleChange}
            style={styles.select}
          >
            <option value="Hind Siliguri">Hind Siliguri</option>
            <option value="Arial">Arial</option>
            <option value="Roboto">Roboto</option>
            <option value="Noto Sans Bengali">Noto Sans Bengali</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🖼️ লোগো URL</label>
          <input
            type="text"
            name="logo_url"
            value={themeData.logo_url}
            onChange={handleChange}
            placeholder="https://example.com/logo.png"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🔖 ফেভিকন URL</label>
          <input
            type="text"
            name="favicon_url"
            value={themeData.favicon_url}
            onChange={handleChange}
            placeholder="https://example.com/favicon.ico"
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
  colorRow: { display: 'flex', gap: '12px', alignItems: 'center' },
  colorPicker: { width: '50px', height: '50px', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' },
  input: { flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' },
  select: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', backgroundColor: '#f8fafc' },
  saveBtn: { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 20px rgba(22,163,74,0.3)' },
};
