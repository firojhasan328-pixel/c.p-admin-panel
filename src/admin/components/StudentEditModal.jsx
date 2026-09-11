import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export default function StudentEditModal({ student, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    student_name: '',
    class_name: '',
    roll_number: '',
    father_name: '',
    mother_name: '',
    village: '',
    phone: '',
    email: '',
    student_photo: '',
  });
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [popup, setPopup] = useState({ show: false, type: '', message: '' });
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // =============================================
  // ✅ Modal খুললে ফর্ম প্রি-ফিল
  // =============================================
  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        student_name: student.student_name || '',
        class_name: student.class_name || '',
        roll_number: student.roll_number || '',
        father_name: student.father_name || '',
        mother_name: student.mother_name || '',
        village: student.village || '',
        phone: student.phone || '',
        email: student.email || '',
        student_photo: student.student_photo || '',
      });
      setPhotoPreview(student.student_photo || '');
      setNewPhoto(null);
      setErrors({});
      setPopup({ show: false, type: '', message: '' });
    }
  }, [isOpen, student]);

  // =============================================
  // ✅ পপআপ অটো-হাইড
  // =============================================
  useEffect(() => {
    if (popup.show) {
      const timer = setTimeout(() => {
        setPopup({ show: false, type: '', message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popup.show]);

  // =============================================
  // ✅ ছবি কম্প্রেস (200x200)
  // =============================================
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // =============================================
  // ✅ ছবি সিলেক্ট
  // =============================================
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ ফাইল টাইপ চেক
    if (!file.type.startsWith('image/')) {
      setPopup({ show: true, type: 'error', message: '❌ শুধু ছবি ফাইল নির্বাচন করুন' });
      return;
    }

    // ✅ সাইজ চেক (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPopup({ show: true, type: 'error', message: '❌ ফাইল সাইজ ৫MB এর বেশি!' });
      return;
    }

    const compressed = await compressImage(file);
    setNewPhoto(compressed);

    const previewUrl = URL.createObjectURL(compressed);
    setPhotoPreview(previewUrl);
  };

  // =============================================
  // ✅ ছবি Upload
  // =============================================
  const uploadPhoto = async () => {
    if (!newPhoto) return formData.student_photo;

    setUploading(true);
    try {
      const fileExt = newPhoto.name.split('.').pop();
      const fileName = `student_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `student-photos/${fileName}`;

      // ✅ private-admission-files bucket-এ আপলোড (মূল সাইটের মতো)
      const { error: uploadError } = await supabase.storage
        .from('private-admission-files')
        .upload(filePath, newPhoto, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // ✅ পাবলিক URL তৈরি
      const { data: urlData } = supabase.storage
        .from('private-admission-files')
        .getPublicUrl(filePath);

      setUploading(false);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Photo upload error:', error);
      setUploading(false);
      throw error;
    }
  };

  // =============================================
  // ✅ Validation
  // =============================================
  const validateForm = () => {
    const newErrors = {};

    if (!formData.student_name.trim()) newErrors.student_name = 'নাম প্রয়োজন';
    if (!formData.class_name.trim()) newErrors.class_name = 'ক্লাস প্রয়োজন';

    if (formData.phone && !/^01[3-9]\d{8}$/.test(formData.phone.trim())) {
      newErrors.phone = 'সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'সঠিক ইমেইল দিন';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================
  // ✅ Submit
  // =============================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setPopup({ show: true, type: 'error', message: '❌ দয়া করে সব ঘর সঠিকভাবে পূরণ করুন' });
      return;
    }

    setSaving(true);

    try {
      // ✅ নতুন ছবি থাকলে upload
      let finalPhotoUrl = formData.student_photo;
      if (newPhoto) {
        finalPhotoUrl = await uploadPhoto();
      }

      // ✅ students টেবিলে আপডেট
      const updateData = {
        name: formData.student_name.trim(),
        class_name: formData.class_name.trim(),
        roll_number: formData.roll_number ? parseInt(formData.roll_number) : null,
        father_name: formData.father_name.trim() || null,
        mother_name: formData.mother_name.trim() || null,
        village: formData.village.trim() || null,
        phone: formData.phone.trim() || null,
        photo_url: finalPhotoUrl || null,
      };

      // ⚠️ ইমেইল আপডেট শুধু auth.users-এ না — students টেবিলেও সিঙ্ক করতে হবে
      // তবে auth.users-এ আপডেট করতে admin API লাগে, তাই শুধু students টেবিলে
      // ইমেইল সেভ করছি (read-only থাকলেও ডেটা সিঙ্কের জন্য)
      // (UI-তে ইমেইল read-only)

      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('email', student.email);

      if (updateError) throw updateError;

      // ✅ registration_requests-এও সিঙ্ক (optional)
      try {
        await supabase
          .from('registration_requests')
          .update({
            student_name: updateData.name,
            class_name: updateData.class_name,
            roll_number: updateData.roll_number,
            father_name: updateData.father_name,
            mother_name: updateData.mother_name,
            village: updateData.village,
            phone: updateData.phone,
            student_photo: finalPhotoUrl,
          })
          .eq('email', student.email);
      } catch (syncError) {
        console.warn('⚠️ Registration sync error:', syncError);
        // এটা critical না, তাই ignore
      }

      // ✅ সফল পপআপ
      setPopup({
        show: true,
        type: 'success',
        message: '✅ ছাত্রের তথ্য সফলভাবে আপডেট করা হয়েছে!',
      });

      // ✅ ১.৫ সেকেন্ড পর modal বন্ধ
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1500);

    } catch (error) {
      console.error('❌ Update error:', error);
      setPopup({
        show: true,
        type: 'error',
        message: '❌ সংরক্ষণ করা যায়নি: ' + error.message,
      });
    }

    setSaving(false);
  };

  // =============================================
  // ✅ Modal বন্ধ করার চেষ্টা
  // =============================================
  const handleClose = () => {
    if (saving || uploading) return;
    onClose?.();
  };

  if (!isOpen || !student) return null;

  const classOptions = ['প্লে', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* পপআপ মেসেজ */}
        {popup.show && (
          <div style={{
            ...styles.popup,
            background: popup.type === 'success'
              ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
              : 'linear-gradient(135deg, #fee2e2, #fecaca)',
            color: popup.type === 'success' ? '#166534' : '#991b1b',
            borderColor: popup.type === 'success' ? '#86efac' : '#fca5a5',
          }}>
            <span>{popup.type === 'success' ? '✅' : '⚠️'}</span>
            <span style={styles.popupText}>{popup.message}</span>
          </div>
        )}

        {/* হেডার */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>✏️</div>
          <h3 style={styles.title}>ছাত্র তথ্য এডিট</h3>
          <button onClick={handleClose} style={styles.closeBtn} disabled={saving}>✕</button>
        </div>

        {/* ফর্ম */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* ছবি সেকশন */}
          <div style={styles.photoSection}>
            <div style={styles.photoWrapper}>
              {photoPreview ? (
                <img src={photoPreview} alt="ছাত্রের ছবি" style={styles.photo} />
              ) : (
                <div style={styles.photoPlaceholder}>
                  {formData.student_name?.charAt(0) || '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.editPhotoBtn}
                disabled={uploading || saving}
              >
                {uploading ? '⏳' : '📷'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoChange}
                style={styles.hiddenInput}
              />
            </div>
            <p style={styles.photoHint}>
              {newPhoto ? '✅ নতুন ছবি নির্বাচিত' : '📷 নতুন ছবি যোগ করতে ক্লিক করুন'}
            </p>
          </div>

          {/* ছাত্রের নাম */}
          <div style={styles.field}>
            <label style={styles.label}>👤 ছাত্রের নাম *</label>
            <input
              type="text"
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              style={{
                ...styles.input,
                borderColor: errors.student_name ? '#ef4444' : '#e2e8f0',
              }}
              placeholder="পূর্ণ নাম লিখুন"
            />
            {errors.student_name && <span style={styles.errorText}>{errors.student_name}</span>}
          </div>

          {/* ক্লাস + রোল */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>📚 ক্লাস *</label>
              <select
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                style={{
                  ...styles.input,
                  borderColor: errors.class_name ? '#ef4444' : '#e2e8f0',
                }}
              >
                <option value="">নির্বাচন করুন</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              {errors.class_name && <span style={styles.errorText}>{errors.class_name}</span>}
            </div>

            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>🔢 রোল নম্বর</label>
              <input
                type="number"
                min="1"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                style={styles.input}
                placeholder="যেমন: ১"
              />
            </div>
          </div>

          {/* বাবা + মা */}
          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>👨 বাবার নাম</label>
              <input
                type="text"
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                style={styles.input}
                placeholder="বাবার নাম"
              />
            </div>

            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>👩 মায়ের নাম</label>
              <input
                type="text"
                value={formData.mother_name}
                onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                style={styles.input}
                placeholder="মায়ের নাম"
              />
            </div>
          </div>

          {/* গ্রাম */}
          <div style={styles.field}>
            <label style={styles.label}>📍 গ্রাম</label>
            <input
              type="text"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              style={styles.input}
              placeholder="গ্রামের নাম"
            />
          </div>

          {/* ফোন */}
          <div style={styles.field}>
            <label style={styles.label}>📱 মোবাইল নাম্বার</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{
                ...styles.input,
                borderColor: errors.phone ? '#ef4444' : '#e2e8f0',
              }}
              placeholder="01XXXXXXXXX"
            />
            {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
          </div>

          {/* ইমেইল (Read-only) */}
          <div style={styles.field}>
            <label style={styles.label}>📧 ইমেইল (পরিবর্তন করা যাবে না)</label>
            <input
              type="email"
              value={formData.email}
              readOnly
              style={{ ...styles.input, background: '#f8fafc', cursor: 'not-allowed' }}
            />
            <small style={styles.hint}>💡 ইমেইল পরিবর্তন করতে হলে নতুন অ্যাকাউন্ট তৈরি করতে হবে</small>
          </div>

          {/* বাটন */}
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
              style={styles.cancelBtn}
              disabled={saving || uploading}
            >
              ✕ বাতিল
            </button>
            <button
              type="submit"
              style={{
                ...styles.saveBtn,
                opacity: (saving || uploading) ? 0.7 : 1,
                cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
              }}
              disabled={saving || uploading}
            >
              {saving ? '⏳ সংরক্ষণ হচ্ছে...' : uploading ? '⏳ ছবি আপলোড...' : '💾 সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================
// 🎨 স্টাইল
// =============================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    background: 'white',
    borderRadius: '20px',
    padding: '28px',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.3s ease',
  },
  popup: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 10001,
    padding: '14px 22px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: '1px solid',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    maxWidth: '400px',
    animation: 'slideIn 0.4s ease',
  },
  popupText: { fontSize: '14px', fontWeight: '600', flex: 1 },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f1f5f9',
    position: 'relative',
  },
  headerIcon: { fontSize: '26px' },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: '0',
    right: '0',
    background: '#f1f5f9',
    border: 'none',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  photoSection: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  photoWrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  photo: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid #16a34a',
    boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
  },
  photoPlaceholder: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '42px',
    fontWeight: '700',
    border: '4px solid #16a34a',
  },
  editPhotoBtn: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
    transition: 'all 0.2s ease',
  },
  hiddenInput: { display: 'none' },
  photoHint: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
    fontWeight: '500',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '2px',
  },
  hint: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  cancelBtn: {
    flex: 1,
    background: '#f1f5f9',
    color: '#64748b',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  saveBtn: {
    flex: 2,
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
    transition: 'all 0.2s ease',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(styleSheet);
