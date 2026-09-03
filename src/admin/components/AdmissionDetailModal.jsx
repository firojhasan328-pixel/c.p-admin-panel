import React from 'react';
import { supabase } from '../../supabaseClient';

export default function StudentDetailModal({ student, onClose, onUpdate }) {
  const [loading, setLoading] = React.useState(false);

  const updateStatus = async (newStatus) => {
    if (!confirm(newStatus ? '✅ অনুমোদন করতে চান?' : '❌ বাতিল করতে চান?')) return;
    setLoading(true);
    try {
      await supabase.from('students').update({ is_approved: newStatus }).eq('id', student.id);
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
        <h2 style={styles.title}>📋 ছাত্র বিস্তারিত</h2>

        <div style={styles.content}>
          <div style={styles.row}><span style={styles.label}>👤 নাম</span><span style={styles.value}>{student.name}</span></div>
          <div style={styles.row}><span style={styles.label}>📚 ক্লাস</span><span style={styles.value}>{student.class_name || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>👨 বাবা</span><span style={styles.value}>{student.father_name || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>👩 মা</span><span style={styles.value}>{student.mother_name || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>📱 ফোন</span><span style={styles.value}>{student.phone || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>📧 ইমেইল</span><span style={styles.value}>{student.email || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>📍 গ্রাম</span><span style={styles.value}>{student.village || student.address || '—'}</span></div>
          <div style={styles.row}><span style={styles.label}>🔢 রোল</span><span style={styles.value}>{student.roll_number || '—'}</span></div>
          <div style={styles.row}>
            <span style={styles.label}>📌 স্ট্যাটাস</span>
            <span style={{
              ...styles.statusBadge,
              background: student.is_approved === true ? '#dcfce7' : student.is_approved === false ? '#fee2e2' : '#fef3c7',
              color: student.is_approved === true ? '#16a34a' : student.is_approved === false ? '#dc2626' : '#f59e0b',
            }}>
              {student.is_approved === true ? '✅ অনুমোদিত' : student.is_approved === false ? '❌ বাতিল' : '⏳ pending'}
            </span>
          </div>
        </div>

        {(student.is_approved === undefined || student.is_approved === null) && (
          <div style={styles.actionRow}>
            <button onClick={() => updateStatus(true)} disabled={loading} style={styles.approveBtn}>✅ অনুমোদন</button>
            <button onClick={() => updateStatus(false)} disabled={loading} style={styles.rejectBtn}>❌ বাতিল</button>
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
    maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
    position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '12px',
    background: '#f1f5f9', border: 'none',
    width: '36px', height: '36px', borderRadius: '50%',
    fontSize: '18px', cursor: 'pointer',
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 20px 0' },
  content: { display: 'flex', flexDirection: 'column', gap: '10px' },
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
