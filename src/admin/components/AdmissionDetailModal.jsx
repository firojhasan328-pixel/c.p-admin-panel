import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function AdmissionDetailModal({ admission, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [slideIndex, setSlideIndex] = useState(0);

  // ✅ ইমেজ লিস্ট
  const images = [];
  if (admission.student_photo) images.push({ url: admission.student_photo, label: 'ছাত্র/ছাত্রীর ছবি' });
  if (admission.birth_cert_photo) images.push({ url: admission.birth_cert_photo, label: 'জন্ম নিবন্ধন' });
  if (admission.father_nid_photo) images.push({ url: admission.father_nid_photo, label: 'বাবার NID' });

  // ✅ স্ট্যাটাস আপডেট
  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('admissions')
        .update({ status: newStatus })
        .eq('id', admission.id);

      if (error) throw error;
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ স্ট্যাটাস আপডেট করতে সমস্যা');
    }
    setLoading(false);
  };

  // ✅ PDF ডাউনলোড (সঠিক পদ্ধতি)
  const downloadPDF = async (includeImages = true) => {
    setLoading(true);
    try {
      // ১. PDF কন্টেন্ট এলিমেন্ট খুঁজুন
      const content = document.getElementById('pdf-content');
      if (!content) {
        throw new Error('PDF কন্টেন্ট পাওয়া যায়নি');
      }

      // ২. এলিমেন্টটি অস্থায়ীভাবে দৃশ্যমান করুন (অফ-স্ক্রিন)
      const originalDisplay = content.style.display;
      content.style.display = 'block';
      content.style.position = 'absolute';
      content.style.left = '-9999px';
      content.style.top = '0';
      content.style.width = '800px';
      content.style.background = 'white';
      content.style.padding = '20px';

      // ৩. html2canvas দিয়ে ক্যাপচার করুন
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        width: 800,
        height: content.scrollHeight,
      });

      // ৪. এলিমেন্টটি আবার লুকান
      content.style.display = originalDisplay || 'none';
      content.style.position = '';
      content.style.left = '';
      content.style.top = '';
      content.style.width = '';
      content.style.background = '';
      content.style.padding = '';

      // ৫. PDF তৈরি করুন
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`আবেদন_ফরম_${admission.form_number || 'NA'}.pdf`);
    } catch (error) {
      console.error('PDF download error:', error);
      alert(`❌ PDF ডাউনলোড করতে সমস্যা: ${error.message}`);
    }
    setLoading(false);
  };

  // ✅ ইমেজ ডাউনলোড
  const downloadImage = async (url, label) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${label}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ ছবি ডাউনলোড করতে সমস্যা');
    }
  };

  // ✅ ইমেজ ভিউয়ার
  const openImageViewer = (index) => {
    setSlideIndex(index);
    setZoom(1);
    setImageViewerOpen(true);
  };

  const closeImageViewer = () => {
    setImageViewerOpen(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handlePrev = () => setSlideIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  const handleNext = () => setSlideIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));

  const currentImage = images[slideIndex];

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>

          <div style={styles.formNumberHeader}>
            <span style={styles.formNumberLabel}>📋 ফরম নাম্বার</span>
            <span style={styles.formNumber}>{admission.form_number || 'NA'}</span>
          </div>

          <h2 style={styles.title}>📋 আবেদন বিস্তারিত</h2>

          <div style={styles.pdfButtons}>
            <button onClick={() => downloadPDF(true)} disabled={loading} style={styles.pdfBtn}>
              {loading ? '⏳ প্রস্তুত...' : '📄 ছবি সহ PDF ডাউনলোড'}
            </button>
            <button onClick={() => downloadPDF(false)} disabled={loading} style={styles.pdfBtnText}>
              {loading ? '⏳ প্রস্তুত...' : '📄 শুধু ফরম PDF ডাউনলোড'}
            </button>
          </div>

          {/* ✅ PDF কন্টেন্ট (অফ-স্ক্রিন) */}
          <div id="pdf-content" style={styles.pdfContent}>
            <div style={styles.pdfHeader}>
              <h2 style={styles.pdfTitle}>চিলমারী প্রি ক্যাডেট মাদ্রাসা</h2>
              <p style={styles.pdfSubtitle}>ভর্তি আবেদন ফরম</p>
              <p style={styles.pdfFormNo}>ফরম নাম্বার: {admission.form_number || 'NA'}</p>
            </div>
            <div style={styles.pdfBody}>
              <div style={styles.pdfRow}><strong>ছাত্রের নাম:</strong> {admission.student_name}</div>
              <div style={styles.pdfRow}><strong>ক্লাস:</strong> {admission.class_to_admit || '—'}</div>
              <div style={styles.pdfRow}><strong>বাবার নাম:</strong> {admission.father_name || '—'}</div>
              <div style={styles.pdfRow}><strong>মায়ের নাম:</strong> {admission.mother_name || '—'}</div>
              <div style={styles.pdfRow}><strong>ফোন:</strong> {admission.phone || '—'}</div>
              <div style={styles.pdfRow}><strong>ইমেইল:</strong> {admission.email || '—'}</div>
              <div style={styles.pdfRow}><strong>স্ট্যাটাস:</strong> {admission.status}</div>
              <div style={styles.pdfRow}><strong>আবেদনের তারিখ:</strong> {new Date(admission.created_at).toLocaleString('bn-BD')}</div>
              {includeImages && images.map((img, idx) => (
                <div key={idx} style={styles.pdfRow}>
                  <strong>{img.label}:</strong> 
                  <img src={img.url} alt={img.label} style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px', marginTop: '4px' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={styles.content}>
            <div style={styles.row}><span style={styles.label}>👤 ছাত্রের নাম</span><span style={styles.value}>{admission.student_name}</span></div>
            <div style={styles.row}><span style={styles.label}>📚 ক্লাস</span><span style={styles.value}>{admission.class_to_admit || '—'}</span></div>
            <div style={styles.row}><span style={styles.label}>👨 বাবার নাম</span><span style={styles.value}>{admission.father_name || '—'}</span></div>
            <div style={styles.row}><span style={styles.label}>👩 মায়ের নাম</span><span style={styles.value}>{admission.mother_name || '—'}</span></div>
            <div style={styles.row}><span style={styles.label}>📱 ফোন</span><span style={styles.value}>{admission.phone || '—'}</span></div>
            <div style={styles.row}><span style={styles.label}>📧 ইমেইল</span><span style={styles.value}>{admission.email || '—'}</span></div>
            <div style={styles.row}><span style={styles.label}>📅 আবেদনের তারিখ</span><span style={styles.value}>{new Date(admission.created_at).toLocaleString('bn-BD')}</span></div>
            <div style={styles.row}>
              <span style={styles.label}>📌 স্ট্যাটাস</span>
              <span style={{
                ...styles.statusBadge,
                background: admission.status === 'approved' ? '#dcfce7' : admission.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                color: admission.status === 'approved' ? '#16a34a' : admission.status === 'rejected' ? '#dc2626' : '#f59e0b',
              }}>
                {admission.status === 'approved' ? '✅ অনুমোদিত' : admission.status === 'rejected' ? '❌ বাতিল' : '⏳ pending'}
              </span>
            </div>
          </div>

          {images.length > 0 && (
            <div style={styles.gallerySection}>
              <h4 style={styles.galleryTitle}>📎 আপলোড করা ডকুমেন্ট</h4>
              <div style={styles.galleryGrid}>
                {images.map((img, idx) => (
                  <div key={idx} style={styles.galleryItem} onClick={() => openImageViewer(idx)}>
                    <img src={img.url} alt={img.label} style={styles.galleryThumb} />
                    <span style={styles.galleryLabel}>{img.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.label); }}
                      style={styles.galleryDownloadBtn}
                      title="ডাউনলোড"
                    >
                      📥
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {admission.status === 'pending' && (
            <div style={styles.actionRow}>
              <button onClick={() => handleStatusUpdate('approved')} disabled={loading} style={styles.approveBtn}>
                ✅ অনুমোদন করুন
              </button>
              <button onClick={() => handleStatusUpdate('rejected')} disabled={loading} style={styles.rejectBtn}>
                ❌ বাতিল করুন
              </button>
            </div>
          )}
        </div>
      </div>

      {imageViewerOpen && currentImage && (
        <div style={styles.viewerOverlay} onClick={closeImageViewer}>
          <div style={styles.viewerModal} onClick={(e) => e.stopPropagation()}>
            <button onClick={closeImageViewer} style={styles.viewerClose}>✕</button>
            <div style={styles.viewerToolbar}>
              <button onClick={handleZoomIn} style={styles.viewerBtn}>🔍+</button>
              <button onClick={handleZoomOut} style={styles.viewerBtn}>🔍-</button>
              <button onClick={() => downloadImage(currentImage.url, currentImage.label)} style={styles.viewerBtn}>📥</button>
              <span style={styles.viewerCounter}>{slideIndex + 1} / {images.length}</span>
            </div>
            <div style={styles.viewerImageWrapper}>
              <img
                src={currentImage.url}
                alt={currentImage.label}
                style={{
                  ...styles.viewerImage,
                  transform: `scale(${zoom})`,
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
            {images.length > 1 && (
              <>
                <button onClick={handlePrev} style={{ ...styles.viewerNav, left: '10px' }}>‹</button>
                <button onClick={handleNext} style={{ ...styles.viewerNav, right: '10px' }}>›</button>
              </>
            )}
            <div style={styles.viewerLabel}>{currentImage.label}</div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: 'white', borderRadius: '20px', padding: '24px',
    maxWidth: '620px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
    position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '12px',
    background: '#f1f5f9', border: 'none',
    width: '36px', height: '36px', borderRadius: '50%',
    fontSize: '18px', cursor: 'pointer',
  },
  formNumberHeader: {
    background: 'linear-gradient(135deg, #14532d, #16a34a)',
    borderRadius: '12px', padding: '12px 16px',
    marginBottom: '16px', textAlign: 'center',
    color: 'white',
  },
  formNumberLabel: { fontSize: '13px', opacity: 0.8, display: 'block' },
  formNumber: { fontSize: '24px', fontWeight: '800', letterSpacing: '1px' },
  title: { fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' },
  pdfButtons: {
    display: 'flex', gap: '10px', flexWrap: 'wrap',
    marginBottom: '16px',
  },
  pdfBtn: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: 'white', border: 'none', padding: '8px 16px',
    borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
    fontSize: '13px', flex: 1, minWidth: '130px',
  },
  pdfBtnText: {
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: 'white', border: 'none', padding: '8px 16px',
    borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
    fontSize: '13px', flex: 1, minWidth: '130px',
  },
  pdfContent: {
    display: 'none', // হিডেন কিন্তু অফ-স্ক্রিনে দেখানো হবে
    position: 'absolute',
    left: '-9999px',
    top: 0,
    width: '800px',
    background: 'white',
    padding: '20px',
    zIndex: -1,
  },
  pdfHeader: { textAlign: 'center', marginBottom: '16px' },
  pdfTitle: { fontSize: '20px', fontWeight: '800', color: '#14532d', margin: 0 },
  pdfSubtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0' },
  pdfFormNo: { fontSize: '16px', fontWeight: '700', color: '#16a34a' },
  pdfBody: { display: 'flex', flexDirection: 'column', gap: '6px' },
  pdfRow: { fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' },
  content: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
    flexWrap: 'wrap',
    gap: '4px',
  },
  label: { fontWeight: '600', color: '#64748b', fontSize: '14px', flex: '0 0 40%' },
  value: { fontWeight: '500', color: '#0f172a', fontSize: '14px', textAlign: 'right', flex: '0 0 55%' },
  statusBadge: { padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  gallerySection: { marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' },
  galleryTitle: { fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' },
  galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' },
  galleryItem: {
    background: '#f8fafc', borderRadius: '10px', padding: '8px',
    textAlign: 'center', cursor: 'pointer', border: '1px solid #e2e8f0',
    position: 'relative', transition: 'transform 0.2s',
  },
  galleryThumb: { width: '100%', height: '90px', objectFit: 'cover', borderRadius: '6px' },
  galleryLabel: { fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' },
  galleryDownloadBtn: {
    position: 'absolute', top: '6px', right: '6px',
    background: 'rgba(0,0,0,0.6)', border: 'none',
    color: 'white', padding: '4px 8px', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px',
  },
  actionRow: { display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  approveBtn: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: 'white', border: 'none', padding: '10px 24px',
    borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
  },
  rejectBtn: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: 'white', border: 'none', padding: '10px 24px',
    borderRadius: '10px', fontWeight: '600', cursor: 'pointer',
  },
  viewerOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  viewerModal: {
    position: 'relative', width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  viewerClose: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: '28px', cursor: 'pointer',
    width: '48px', height: '48px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  viewerToolbar: {
    position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: '12px', alignItems: 'center',
    background: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '30px',
    zIndex: 10,
  },
  viewerBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', padding: '6px 14px', borderRadius: '20px',
    cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },
  viewerCounter: { color: 'white', fontSize: '14px', fontWeight: '500', padding: '0 10px' },
  viewerImageWrapper: {
    width: '100%', height: '80%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  viewerImage: {
    maxWidth: '95%', maxHeight: '95%', objectFit: 'contain',
    borderRadius: '8px',
  },
  viewerNav: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: 'white', fontSize: '40px', padding: '10px 18px',
    borderRadius: '50%', cursor: 'pointer', zIndex: 10,
  },
  viewerLabel: {
    position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
    color: 'white', fontSize: '16px', fontWeight: '600',
    background: 'rgba(0,0,0,0.5)', padding: '8px 20px', borderRadius: '20px',
  },
};
