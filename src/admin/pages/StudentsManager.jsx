import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    class_name: '',
    roll_number: '',
    father_name: '',
    mother_name: '',
    phone: '',
    email: '',
    photo_url: '',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').order('class_name').order('roll_number');
    setStudents(data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      await supabase.from('students').update(formData).eq('id', editing);
    } else {
      await supabase.from('students').insert([formData]);
    }
    setShowForm(false);
    setEditing(null);
    setFormData({ name: '', class_name: '', roll_number: '', father_name: '', mother_name: '', phone: '', email: '', photo_url: '' });
    fetchStudents();
  };

  const handleDelete = async (id) => {
    if (confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) {
      await supabase.from('students').delete().eq('id', id);
      fetchStudents();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎓 ছাত্র ব্যবস্থাপনা</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', class_name: '', roll_number: '', father_name: '', mother_name: '', phone: '', email: '', photo_url: '' }); }} style={styles.addBtn}>➕ নতুন ছাত্র</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="নাম" style={styles.input} required />
          <select name="class_name" value={formData.class_name} onChange={handleChange} style={styles.input}>
            <option value="">ক্লাস নির্বাচন</option>
            <option value="প্লে">প্লে</option><option value="১ম">১ম</option><option value="২য়">২য়</option>
            <option value="৩য়">৩য়</option><option value="৪র্থ">৪র্থ</option><option value="৫ম">৫ম</option>
          </select>
          <input name="roll_number" value={formData.roll_number} onChange={handleChange} placeholder="রোল নম্বর" style={styles.input} />
          <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="বাবার নাম" style={styles.input} />
          <input name="mother_name" value={formData.mother_name} onChange={handleChange} placeholder="মায়ের নাম" style={styles.input} />
          <input name="phone" value={formData.phone} onChange={handleChange} placeholder="ফোন" style={styles.input} />
          <input name="email" value={formData.email} onChange={handleChange} placeholder="ইমেইল" style={styles.input} />
          <input name="photo_url" value={formData.photo_url} onChange={handleChange} placeholder="ছবি URL" style={styles.input} />
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
          {students.map((s) => (
            <div key={s.id} style={styles.item}>
              <div>
                <strong>{s.name}</strong>
                <span style={styles.badge}>{s.class_name}</span>
                <span style={styles.badge2}>রোল: {s.roll_number || '—'}</span>
              </div>
              <div style={styles.actions}>
                <button onClick={() => { setEditing(s.id); setFormData(s); setShowForm(true); }} style={styles.editBtn}>✏️</button>
                <button onClick={() => handleDelete(s.id)} style={styles.deleteBtn}>🗑️</button>
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
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' },
  badge: { background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginLeft: '8px' },
  badge2: { background: '#fef3c7', color: '#f59e0b', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', marginLeft: '4px' },
  actions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' },
};
