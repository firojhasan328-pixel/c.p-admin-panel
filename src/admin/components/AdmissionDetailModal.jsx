import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdmissionDetailModal({ admission, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>

        <h2 style={styles.title}>📋 আবেদন বিস্তারিত</h2>

        <div style={styles.content}>
          <div style={styles.row}>
            <span style={styles.label}>👤 ছাত্রের নাম</span>
            <span style={styles.value}>{admission.student_name}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>📚 ক্লাস</span>
            <span style={styles.value}>{admission.class_to_admit || '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>👨 বাবার নাম</span>
            <span style={styles.value}>{admission.father_name || '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>👩 মায়ের নাম</span>
            <span style={styles.value}>{admission.mother_name || '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>📱 ফোন</span>
            <span style={styles.value}>{admission.phone || '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>📧 ইমেইল</span>
            <span style={styles.value}>{admission.email || '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>📅 আবেদনের তারিখ</span>
            <span style={styles.value}>{new Date(admission.created_at).toLocaleString('bn-BD')}</span>
          </div>
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

        {admission.status === 'pending' && (
          <div style={styles.actionRow}>
            <button
              onClick={() => handleStatusUpdate('approved')}
              disabled={loading}
              style={styles.approveBtn}
            >
              ✅ অনুমোদন করুন
            </button>
            <button
              onClick={() => handleStatusUpdate('rejected')}
              disabled={loading}
              style={styles.rejectBtn}
            >
              ❌ বাতিল করুন
            </button>
          </div>
        )}
      </div>
    </div>
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
    background: 'white', borderRadius: '20px', padding: '28px',
    maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
    position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '12px',
    background: '#f1f5f9', border: 'none',
    width: '36px', height: '36px', borderRadius: '50%',
    fontSize: '18px', cursor: 'pointer',
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' },
  content: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  label: { fontWeight: '600', color: '#64748b' },
  value: { fontWeight: '500', color: '#0f172a' },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  actionRow: { display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center' },
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
};
