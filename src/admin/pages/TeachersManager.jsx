import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import TeacherPermissionsModal from '../components/TeacherPermissionsModal';

export default function TeachersManager() {
  const { adminUser } = useAdmin();
  const { hasPermission, canGrantPermission } = usePermissions();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    subject: '',
    phone: '',
    email: '',
    photo_url: '',
  });
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [teacherRoles, setTeacherRoles] = useState({});

  const canManageTeachers = hasPermission('manage_teachers');
  const canManagePermissions = hasPermission('manage_permissions');

  useEffect(() => {
    if (canManageTeachers) {
      fetchTeachers();
      fetchAllRoles();
    }
  }, [canManageTeachers]);

  // =============================================
  // ✅ সব শিক্ষকের রোল লোড করুন
  // =============================================
  const fetchAllRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('email, role');

      if (data) {
        const roleMap = {};
        data.forEach(item => {
          roleMap[item.email] = item.role;
        });
        setTeacherRoles(roleMap);
        console.log('✅ Roles loaded:', roleMap);
      }
    } catch (error) {
      console.error('❌ Fetch roles error:', error);
    }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').order('name');
    setTeachers(data || []);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক যোগ করার অনুমতি নেই');
      return;
    }
    if (editing) {
      await supabase.from('teachers').update(formData).eq('id', editing);
    } else {
      await supabase.from('teachers').insert([formData]);
    }
    setShowForm(false);
    setEditing(null);
    setFormData({ name: '', designation: '', subject: '', phone: '', email: '', photo_url: '' });
    fetchTeachers();
  };

  const handleEdit = (teacher) => {
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক এডিট করার অনুমতি নেই');
      return;
    }
    setEditing(teacher.id);
    setFormData(teacher);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!canManageTeachers) {
      alert('আপনার শিক্ষক ডিলিট করার অনুমতি নেই');
      return;
    }
    if (confirm('নিশ্চিতভাবে ডিলিট করতে চান?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchTeachers();
    }
  };

  const handlePermissionsClick = (teacher) => {
    if (!canManagePermissions) {
      alert('আপনার পারমিশন পরিবর্তনের অনুমতি নেই');
      return;
    }
    setSelectedTeacher(teacher);
    setShowPermissionsModal(true);
  };

  // =============================================
  // ✅ রোল অনুযায়ী ব্যাজ স্টাইল
  // =============================================
  const getRoleBadge = (email) => {
    const role = teacherRoles[email];
    if (!role) return null;
    
    const badges = {
      super_admin: { 
        label: '⭐ সুপার অ্যাডমিন', 
        bg: '#dcfce7', 
        color: '#16a34a',
        border: '2px solid #16a34a'
      },
      admin: { 
        label: '🔹 সাব অ্যাডমিন', 
        bg: '#dbeafe', 
        color: '#2563eb',
        border: '2px solid #2563eb'
      },
      teacher: { 
        label: '👨‍🏫 শিক্ষক', 
        bg: '#fef3c7', 
        color: '#f59e0b',
        border: '2px solid #f59e0b'
      },
      viewer: { 
        label: '👁️ দর্শক', 
        bg: '#f1f5f9', 
        color: '#64748b',
        border: '2px solid #64748b'
      }
    };
    
    return badges[role] || null;
  };

  if (!canManageTeachers) {
    return (
      <div style={styles.noAccess}>
        <span style={styles.noAccessIcon}>🔒</span>
        <h3 style={styles.noAccessTitle}>অ্যাক্সেস নেই</h3>
        <p style={styles.noAccessText}>আপনার শিক্ষক ব্যবস্থাপনা দেখার অনুমতি নেই</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>👨‍🏫 শিক্ষক ব্যবস্থাপনা</h2>
        <button 
          onClick={() => { setShowForm(true); setEditing(null); setFormData({ name: '', designation: '', subject: '', phone: '', email: '', photo_url: '' }); }} 
          style={styles.addBtn}
        >
          ➕ নতুন শিক্ষক
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="নাম" style={styles.input} required />
          <input name="designation" value={formData.designation} onChange={handleChange} placeholder="পদবী" style={styles.input} />
          <input name="subject" value={formData.subject} onChange={handleChange} placeholder="বিষয়" style={styles.input} />
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
          {teachers.map((t) => {
            const roleBadge = getRoleBadge(t.email);
            return (
              <div key={t.id} style={styles.item}>
                <div style={styles.itemLeft}>
                  <strong style={styles.teacherName}>{t.name}</strong>
                  {roleBadge && (
                    <span style={{
                      ...styles.roleBadge,
                      background: roleBadge.bg,
                      color: roleBadge.color,
                      border: roleBadge.border,
                    }}>
                      {roleBadge.label}
                    </span>
                  )}
                  <span style={styles.badge}>{t.designation || 'শিক্ষক'}</span>
                  <span style={styles.badge2}>{t.subject}</span>
                </div>
                <div style={styles.actions}>
                  <button onClick={() => handleEdit(t)} style={styles.editBtn} title="এডিট">✏️</button>
                  {canManagePermissions && (
                    <button 
                      onClick={() => handlePermissionsClick(t)} 
                      style={styles.permissionBtn} 
                      title="পারমিশন সেটিংস"
                    >
                      ⚙️
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.id)} style={styles.deleteBtn} title="ডিলিট">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TeacherPermissionsModal
        teacher={selectedTeacher}
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedTeacher(null);
        }}
        onSuccess={() => {
          fetchTeachers();
          fetchAllRoles();
        }}
      />
    </div>
  );
}

const styles = {
  container: { maxWidth: '900px', margin: '0 auto' },
  noAccess: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
  },
  noAccessIcon: { fontSize: '48px', display: 'block', marginBottom: '12px' },
  noAccessTitle: { fontSize: '20px', color: '#0f172a', margin: '0 0 8px 0' },
  noAccessText: { fontSize: '14px', color: '#64748b', margin: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 },
  addBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  form: { background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  saveBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { background: '#64748b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  item: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '12px 16px', 
    background: 'white', 
    borderRadius: '10px', 
    border: '1px solid #e2e8f0', 
    flexWrap: 'wrap', 
    gap: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }
  },
  itemLeft: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    flexWrap: 'wrap',
    flex: 1,
  },
  teacherName: { 
    fontSize: '15px', 
    fontWeight: '600', 
    color: '#0f172a',
  },
  roleBadge: {
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  badge: { background: '#dbeafe', color: '#2563eb', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  badge2: { background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' },
  actions: { display: 'flex', gap: '6px' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  permissionBtn: { background: '#fef3c7', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  deleteBtn: { background: '#fee2e2', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
};
