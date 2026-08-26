import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function GalleryManager() {
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_categories').select('*').order('name');
    setCategories(data || []);
    setLoading(false);
  };

  const fetchImages = async (categoryId) => {
    const { data } = await supabase.from('gallery_images').select('*').eq('category_id', categoryId);
    setImages(data || []);
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    fetchImages(cat.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCategory) {
      await supabase.from('gallery_categories').update(formData).eq('id', selectedCategory.id);
    } else {
      await supabase.from('gallery_categories').insert([formData]);
    }
    setShowForm(false);
    setFormData({ name: '', description: '' });
    fetchCategories();
  };

  const handleDelete = async (id) => {
    if (confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) {
      await supabase.from('gallery_categories').delete().eq('id', id);
      if (selectedCategory?.id === id) setSelectedCategory(null);
      fetchCategories();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🖼️ গ্যালারি ব্যবস্থাপনা</h2>
        <button onClick={() => { setShowForm(true); setSelectedCategory(null); setFormData({ name: '', description: '' }); }} style={styles.addBtn}>➕ নতুন ক্যাটাগরি</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ক্যাটাগরি নাম" style={styles.input} required />
          <input name="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="বিবরণ" style={styles.input} />
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn}>যোগ করুন</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>বাতিল</button>
          </div>
        </form>
      )}

      <div style={styles.grid}>
        {categories.map((cat) => (
          <div key={cat.id} style={{ ...styles.categoryCard, border: selectedCategory?.id === cat.id ? '2px solid #16a34a' : '1px solid #e2e8f0' }} onClick={() => handleCategoryClick(cat)}>
            <div style={styles.categoryName}>{cat.name}</div>
            <div style={styles.categoryActions}>
              <button onClick={(e) => { e.stopPropagation(); setSelectedCategory(cat); setFormData(cat); setShowForm(true); }} style={styles.editBtn}>✏️</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} style={styles.deleteBtn}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  addBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  form: { background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  categoryCard: { background: 'white', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  categoryName: { fontWeight: '600', color: '#0f172a' },
  categoryActions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
};
