import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function GalleryManager() {
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlUploading, setUrlUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  // =============================================
  // ✅ সব ক্যাটাগরি লোড
  // =============================================
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gallery_categories')
      .select('*')
      .order('name');
    setCategories(data || []);
    setLoading(false);
  };

  // =============================================
  // ✅ ক্যাটাগরির ছবি লোড
  // =============================================
  const fetchImages = async (categoryId) => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });
    
    const imagesWithUrls = await Promise.all((data || []).map(async (img) => {
      if (img.image_path) {
        const { data: urlData } = supabase.storage
          .from('gallery-images')
          .getPublicUrl(img.image_path);
        return { ...img, display_url: urlData.publicUrl };
      }
      return { ...img, display_url: img.image_url || null };
    }));
    
    setImages(imagesWithUrls);
  };

  // =============================================
  // ✅ ক্যাটাগরি ক্লিক
  // =============================================
  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    fetchImages(cat.id);
  };

  // =============================================
  // ✅ ক্যাটাগরি যোগ/আপডেট
  // =============================================
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (selectedCategory) {
      await supabase
        .from('gallery_categories')
        .update(formData)
        .eq('id', selectedCategory.id);
    } else {
      await supabase
        .from('gallery_categories')
        .insert([formData]);
    }
    setShowForm(false);
    setFormData({ name: '', description: '' });
    fetchCategories();
    setSuccessMessage('✅ ক্যাটাগরি সফলভাবে সংরক্ষণ করা হয়েছে!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // =============================================
  // ✅ ক্যাটাগরি ডিলিট
  // =============================================
  const handleCategoryDelete = async (id) => {
    if (!confirm('এই ক্যাটাগরি ও এর সব ছবি ডিলিট করতে চান?')) return;
    await supabase.from('gallery_categories').delete().eq('id', id);
    if (selectedCategory?.id === id) {
      setSelectedCategory(null);
      setImages([]);
    }
    fetchCategories();
  };

  // =============================================
  // ✅ ফোল্ডারের নাম স্যানিটাইজ (স্পেস ও বিশেষ ক্যারেক্টার সরান)
  // =============================================
  const sanitizeFolderName = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-') // শুধু a-z, 0-9, - অনুমোদিত
      .replace(/-+/g, '-') // একাধিক - কে একটিতে পরিণত
      .replace(/^-|-$/g, ''); // শুরু ও শেষের - সরান
  };

  // =============================================
  // ✅ 📤 একাধিক ছবি আপলোড (ফাইল থেকে)
  // =============================================
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCategory) {
      alert('দয়া করে একটি ক্যাটাগরি সিলেক্ট করুন');
      return;
    }

    setUploading(true);
    setSuccessMessage('');

    // ফোল্ডারের নাম স্যানিটাইজ করুন
    const folderName = sanitizeFolderName(selectedCategory.name);
    if (!folderName) {
      alert('ক্যাটাগরির নাম সঠিক নয়!');
      setUploading(false);
      return;
    }

    try {
      let successCount = 0;
      for (let file of files) {
        // ফাইল সাইজ চেক (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} - ফাইল সাইজ ৫MB এর বেশি!`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${folderName}/${fileName}`;

        // Supabase Storage এ আপলোড
        const { error: uploadError } = await supabase.storage
          .from('gallery-images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error for', file.name, uploadError);
          continue;
        }

        // gallery_images টেবিলে সেভ
        const { error: dbError } = await supabase
          .from('gallery_images')
          .insert([{
            category_id: selectedCategory.id,
            image_path: filePath,
            image_url: null,
            title: file.name,
            is_featured: false,
          }]);

        if (dbError) {
          console.error('DB error for', file.name, dbError);
          continue;
        }
        successCount++;
      }

      if (successCount > 0) {
        setSuccessMessage(`✅ ${successCount} টি ছবি আপলোড করা হয়েছে!`);
      } else {
        setSuccessMessage('⚠️ কোনো ছবি আপলোড হয়নি!');
      }
      fetchImages(selectedCategory.id);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      alert('আপলোড ব্যর্থ: ' + err.message);
    }
    setUploading(false);
    e.target.value = '';
  };

  // =============================================
  // ✅ 🔗 URL থেকে ছবি আপলোড
  // =============================================
  const handleUrlUpload = async () => {
    if (!urlInput || !selectedCategory) {
      alert('দয়া করে URL দিন এবং একটি ক্যাটাগরি সিলেক্ট করুন');
      return;
    }

    setUrlUploading(true);
    setSuccessMessage('');

    try {
      // URL ভ্যালিডেশন
      if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
        throw new Error('সঠিক URL দিন (http:// বা https:// দিয়ে শুরু)');
      }

      // ✅ image_path NULL রেখে শুধু image_url দিয়ে ইনসার্ট করুন
      const { error } = await supabase
        .from('gallery_images')
        .insert([{
          category_id: selectedCategory.id,
          image_path: null, // ✅ NULL allowed
          image_url: urlInput,
          title: urlInput.split('/').pop() || 'URL ইমেজ',
          is_featured: false,
        }]);

      if (error) {
        console.error('DB error:', error);
        throw new Error(error.message);
      }

      setSuccessMessage('✅ URL ইমেজ সফলভাবে যোগ করা হয়েছে!');
      setUrlInput('');
      fetchImages(selectedCategory.id);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('URL upload error:', err);
      alert('URL ইমেজ যোগ করতে সমস্যা: ' + err.message);
    }
    setUrlUploading(false);
  };

  // =============================================
  // ✅ ছবি ডিলিট
  // =============================================
  const handleImageDelete = async (image) => {
    if (!confirm('এই ছবি ডিলিট করতে চান?')) return;

    try {
      // Storage থেকে ডিলিট (যদি image_path থাকে)
      if (image.image_path) {
        await supabase.storage
          .from('gallery-images')
          .remove([image.image_path]);
      }

      // ডেটাবেস থেকে ডিলিট
      await supabase
        .from('gallery_images')
        .delete()
        .eq('id', image.id);

      fetchImages(selectedCategory.id);
    } catch (err) {
      console.error('Delete error:', err);
      alert('ডিলিট করতে সমস্যা হয়েছে');
    }
  };

  // =============================================
  // ✅ ফিচার্ড টগল (হোমপেজে দেখান)
  // =============================================
  const handleToggleFeatured = async (imageId, currentStatus) => {
    try {
      if (currentStatus === false) {
        await supabase
          .from('gallery_images')
          .update({ is_featured: false })
          .eq('is_featured', true);
      }

      await supabase
        .from('gallery_images')
        .update({ is_featured: !currentStatus })
        .eq('id', imageId);

      fetchImages(selectedCategory.id);
    } catch (err) {
      console.error('Toggle featured error:', err);
    }
  };

  // =============================================
  // ✅ রেন্ডার
  // =============================================
  return (
    <div style={styles.container}>
      {successMessage && (
        <div style={styles.popup}>
          <span style={styles.popupIcon}>✅</span>
          <span style={styles.popupText}>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={styles.popupClose}>✕</button>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.title}>🖼️ গ্যালারি ব্যবস্থাপনা</h2>
        <button
          onClick={() => { setShowForm(true); setSelectedCategory(null); setFormData({ name: '', description: '' }); }}
          style={styles.addBtn}
        >
          ➕ নতুন ক্যাটাগরি
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCategorySubmit} style={styles.form}>
          <input
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="ক্যাটাগরি নাম"
            style={styles.input}
            required
          />
          <input
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="বিবরণ (ঐচ্ছিক)"
            style={styles.input}
          />
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn}>
              {selectedCategory ? 'আপডেট' : 'যোগ করুন'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>বাতিল</button>
          </div>
        </form>
      )}

      <div style={styles.categoryGrid}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              ...styles.categoryCard,
              ...(selectedCategory?.id === cat.id ? styles.categoryCardActive : {}),
            }}
            onClick={() => handleCategoryClick(cat)}
          >
            <div style={styles.categoryInfo}>
              <span style={styles.categoryIcon}>📁</span>
              <div>
                <div style={styles.categoryName}>{cat.name}</div>
                <div style={styles.categoryDesc}>{cat.description || 'ক্লিক করে দেখুন'}</div>
              </div>
            </div>
            <div style={styles.categoryActions}>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedCategory(cat); setFormData(cat); setShowForm(true); }}
                style={styles.editBtn}
              >
                ✏️
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCategoryDelete(cat.id); }}
                style={styles.deleteBtn}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedCategory && (
        <div style={styles.imageSection}>
          <div style={styles.imageHeader}>
            <h3 style={styles.imageTitle}>
              📂 {selectedCategory.name}
            </h3>
            <div style={styles.imageActions}>
              <label style={styles.uploadBtn}>
                📤 ছবি আপলোড
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={styles.hiddenInput}
                  disabled={uploading}
                />
              </label>

              <div style={styles.urlUpload}>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="ইমেজ URL দিন..."
                  style={styles.urlInput}
                />
                <button
                  onClick={handleUrlUpload}
                  disabled={urlUploading}
                  style={styles.urlBtn}
                >
                  {urlUploading ? '⏳' : '🔗 যোগ'}
                </button>
              </div>
            </div>
          </div>

          {uploading && (
            <div style={styles.uploadingStatus}>⏳ আপলোড হচ্ছে...</div>
          )}

          {images.length === 0 ? (
            <div style={styles.emptyImage}>
              <span style={styles.emptyIcon}>🖼️</span>
              <p>এই ক্যাটাগরিতে কোনো ছবি নেই</p>
              <small>উপরের "ছবি আপলোড" বাটনে ক্লিক করে ছবি যোগ করুন</small>
            </div>
          ) : (
            <div style={styles.imageGrid}>
              {images.map((img) => (
                <div key={img.id} style={styles.imageCard}>
                  {img.display_url ? (
                    <img src={img.display_url} alt={img.title} style={styles.imageThumb} />
                  ) : (
                    <div style={styles.imagePlaceholder}>🖼️</div>
                  )}
                  <div style={styles.imageInfo}>
                    <span style={styles.imageTitleText}>{img.title || 'ছবি'}</span>
                    <div style={styles.imageBadges}>
                      {img.is_featured && <span style={styles.featuredBadge}>⭐</span>}
                    </div>
                  </div>
                  <div style={styles.imageActionsRow}>
                    <button
                      onClick={() => handleToggleFeatured(img.id, img.is_featured)}
                      style={{
                        ...styles.featuredToggle,
                        background: img.is_featured ? '#dcfce7' : '#f1f5f9',
                        color: img.is_featured ? '#16a34a' : '#94a3b8',
                      }}
                    >
                      {img.is_featured ? '⭐ হোমপেজে' : 'হোমপেজে দেখান'}
                    </button>
                    <button
                      onClick={() => handleImageDelete(img)}
                      style={styles.imageDeleteBtn}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', fontFamily: "'Hind Siliguri', sans-serif", padding: '0 16px' },
  popup: {
    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#166534',
    padding: '16px 24px', borderRadius: '14px', boxShadow: '0 10px 30px rgba(22, 163, 74, 0.3)',
    display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideIn 0.5s ease',
    border: '1px solid #86efac', maxWidth: '400px',
  },
  popupIcon: { fontSize: '24px' },
  popupText: { fontSize: '15px', fontWeight: '600', flex: 1 },
  popupClose: { background: 'none', border: 'none', fontSize: '18px', color: '#166534', cursor: 'pointer', padding: '4px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  addBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  form: { background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '24px' },
  categoryCard: {
    background: 'white', padding: '14px 18px', borderRadius: '12px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease',
  },
  categoryCardActive: { borderColor: '#16a34a', background: '#f0fdf4' },
  categoryInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  categoryIcon: { fontSize: '28px' },
  categoryName: { fontSize: '16px', fontWeight: '600', color: '#0f172a' },
  categoryDesc: { fontSize: '12px', color: '#94a3b8' },
  categoryActions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  imageSection: { background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', marginTop: '16px' },
  imageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  imageTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 },
  imageActions: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  uploadBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white', padding: '8px 16px', borderRadius: '10px',
    fontWeight: '600', cursor: 'pointer', fontSize: '14px',
    position: 'relative', display: 'inline-block',
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', top: 0, left: 0, cursor: 'pointer' },
  urlUpload: { display: 'flex', gap: '6px', alignItems: 'center' },
  urlInput: { padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', outline: 'none', width: '180px' },
  urlBtn: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  uploadingStatus: { textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '14px' },
  emptyImage: { textAlign: 'center', padding: '40px 0', color: '#94a3b8' },
  emptyIcon: { fontSize: '48px', display: 'block', marginBottom: '8px' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },
  imageCard: { background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' },
  imageThumb: { width: '100%', height: '140px', objectFit: 'cover' },
  imagePlaceholder: { width: '100%', height: '140px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#cbd5e1' },
  imageInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' },
  imageTitleText: { fontSize: '13px', fontWeight: '500', color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  imageBadges: { display: 'flex', gap: '4px' },
  featuredBadge: { fontSize: '16px' },
  imageActionsRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 12px 12px 12px', gap: '8px' },
  featuredToggle: {
    border: 'none', padding: '4px 12px', borderRadius: '20px',
    fontSize: '11px', fontWeight: '600', cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  imageDeleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
