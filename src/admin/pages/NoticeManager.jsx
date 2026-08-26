import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';

export default function NoticeManager() {
  const { adminUser } = useAdmin();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'both',
    target_class: '',
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from('portal_notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, created_by: adminUser?.user_id };
    if (editing) {
      await supabase.from('portal_notices').update(data).eq('id', editing);
    } else {
      await supabase.from('portal_notices').insert([data]);
    }
    setShowForm(false);
    setEditing(null);
    setFormData({ title: '', message: '', target_role: 'both', target_class: '' });
    fetchNotices();
  };

  const handleDelete = async (id) => {
    if (confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) {
      await supabase.from('portal_notices').delete().eq('id', id);
      fetchNotices();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📢 নোটিশ ব্যবস্থাপনা</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ title: '', message: '', target_role: 'both', target_class: '' }); }} style={styles.addBtn}>➕ নতুন নোটিশ</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="title" value={formData.title} onChange={handleChange} placeholder="শিরোনাম" style={styles.input} required />
          <textarea name="message" value={formData.message} onChange={handleChange} placeholder="বার্তা" rows="3" style={styles.textarea} required />
          <select name="target_role" value={formData.target_role} onChange={handleChange} style={styles.input}>
            <option value="both">সকলকে</option>
            <option value="student">শুধু ছাত্র</option>
            <option value="teacher">শুধু শিক্ষক</option>
          </select>
          <input name="target_class" value={formData.target_class} onChange={handleChange} placeholder="ক্লাস (ঐচ্ছিক)" style={styles.input} />
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn}>{editing ? 'আপডেট' : 'যোগ করুন'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>বাতিল</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>⏳ লোড হচ্ছে...</p>
      ) : (
        <div style={styles.list}>
          {notices.map((n) => (
            <div key={n.id} style={styles.item}>
              <div>
                <strong>{n.title}</strong>
                <span style={styles.badge}>{n.target_role === 'both' ? 'সকলকে' : n.target_role}</span>
                <span style={styles.badge2}>{new Date(n.created_at).toLocaleDateString('bn-BD')}</span>
              </div>
              <div style={styles.actions}>
                <button onClick={() => { setEditing(n.id); setFormData(n); setShowForm(true); }} style={styles.editBtn}>✏️</button>
                <button onClick={() => handleDelete(n.id)} style={styles.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
  textarea: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' },
  badge: { background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginLeft: '8px' },
  badge2: { background: '#f1f5f9', color: '#64748b', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginLeft: '4px' },
  actions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
};
